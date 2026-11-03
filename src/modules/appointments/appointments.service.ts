import { Injectable } from '@nestjs/common';
import { AppointmentStatus, NotificationType, Prisma, Role } from '@prisma/client';
import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
  SlotAlreadyBookedException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  AppointmentResponseDto,
  AppointmentsQueryDto,
  CancelAppointmentDto,
  CreateAppointmentDto,
  RejectAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto.js';

const appointmentInclude = {
  patient: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  },
  doctor: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      specialization: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  clinic: {
    select: {
      id: true,
      name: true,
      address: true,
      managerId: true,
    },
  },
} as const;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getTashkentNow(): { todayStr: string; currentTimeStr: string } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return {
      todayStr: `${map.year}-${map.month}-${map.day}`,
      currentTimeStr: `${map.hour}:${map.minute}`,
    };
  }

  private validateNotPast(date: string, startTime: string) {
    const { todayStr, currentTimeStr } = this.getTashkentNow();
    if (date < todayStr || (date === todayStr && startTime <= currentTimeStr)) {
      throw new ConflictAppException('O‘tib ketgan vaqtga qabul yozib bo‘lmaydi');
    }
  }

  private async validateScheduleAndComputeEndTime(
    prismaClient: Prisma.TransactionClient | PrismaService,
    doctorId: string,
    clinicId: string,
    appointmentDate: string,
    startTime: string,
    serviceId?: string,
  ): Promise<string> {
    const parsedDate = new Date(`${appointmentDate}T00:00:00.000Z`);
    if (isNaN(parsedDate.getTime())) {
      throw new ConflictAppException('Noto‘g‘ri sana formati');
    }
    const utcDay = parsedDate.getUTCDay();
    const dayOfWeek = utcDay === 0 ? 7 : utcDay;

    const schedule = await prismaClient.doctorSchedule.findFirst({
      where: {
        doctorId,
        clinicId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!schedule) {
      throw new ConflictAppException(
        'Shifokor ushbu kunda ko‘rsatilgan klinikada qabul jadvaliga ega emas',
      );
    }

    const slotDuration = schedule.slotDurationMinutes || 30;
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const schedStartMin = startH * 60 + startM;
    const schedEndMin = endH * 60 + endM;

    const [appStartH, appStartM] = startTime.split(':').map(Number);
    const appStartMin = appStartH * 60 + appStartM;
    const appEndMin = appStartMin + slotDuration;

    if (
      appStartMin < schedStartMin ||
      appEndMin > schedEndMin ||
      (appStartMin - schedStartMin) % slotDuration !== 0
    ) {
      throw new ConflictAppException(
        'Tanlangan vaqt shifokor jadvali yoki slot davomiyligiga mos kelmaydi',
      );
    }

    if (serviceId) {
      const service = await prismaClient.service.findUnique({
        where: { id: serviceId },
      });
      if (!service) {
        throw new NotFoundAppException('Xizmat topilmadi');
      }
    }

    const endHStr = String(Math.floor(appEndMin / 60)).padStart(2, '0');
    const endMStr = String(appEndMin % 60).padStart(2, '0');
    return `${endHStr}:${endMStr}`;
  }

  async create(
    currentUser: { id: string; role: Role },
    dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    // 1. Current user must have a Patient record
    let patient = await this.prisma.patient.findUnique({
      where: { userId: currentUser.id },
      include: { user: true },
    });

    if (!patient) {
      // If patient record is missing, auto-create one for PATIENT role
      patient = await this.prisma.patient.create({
        data: { userId: currentUser.id },
        include: { user: true },
      });
    }

    // 2. Doctor check
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
      include: { user: true, specialization: true },
    });
    if (!doctor || !doctor.isActive) {
      throw new NotFoundAppException('Shifokor topilmadi yoki faol emas');
    }

    // 3. Clinic check
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
    });
    if (!clinic || !clinic.isActive) {
      throw new NotFoundAppException('Klinika topilmadi yoki faol emas');
    }

    // 4. Past time check
    this.validateNotPast(dto.appointmentDate, dto.startTime);

    // 5. Schedule check & compute endTime
    const endTime = await this.validateScheduleAndComputeEndTime(
      this.prisma,
      dto.doctorId,
      dto.clinicId,
      dto.appointmentDate,
      dto.startTime,
      dto.serviceId,
    );

    // 6. Prisma Transaction with concurrency handling
    let createdAppointment: any;
    try {
      createdAppointment = await this.prisma.$transaction(async (tx) => {
        // Double check active appointment in transaction
        const existing = await tx.appointment.findFirst({
          where: {
            doctorId: dto.doctorId,
            appointmentDate: dto.appointmentDate,
            startTime: dto.startTime,
            status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
          },
        });

        if (existing) {
          throw new SlotAlreadyBookedException();
        }

        return tx.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: dto.doctorId,
            clinicId: dto.clinicId,
            serviceId: dto.serviceId ?? null,
            appointmentDate: dto.appointmentDate,
            startTime: dto.startTime,
            endTime,
            reason: dto.reason ?? null,
            status: AppointmentStatus.PENDING,
          },
          include: appointmentInclude,
        });
      });
    } catch (error: any) {
      if (
        error instanceof SlotAlreadyBookedException ||
        error?.code === 'P2002' ||
        (error?.message && error.message.includes('uniq_active_appointment_slot'))
      ) {
        throw new SlotAlreadyBookedException();
      }
      throw error;
    }

    // 7. Fire notifications
    // To Doctor
    await this.notificationsService.createNotification(
      doctor.userId,
      NotificationType.NEW_PATIENT_BOOKED,
      'Yangi bemor qabuli',
      `Bemor: ${patient.user.firstName} ${patient.user.lastName}, Sana: ${dto.appointmentDate} ${dto.startTime}`,
      { appointmentId: createdAppointment.id },
    );

    // To Patient
    await this.notificationsService.createNotification(
      patient.userId,
      NotificationType.APPOINTMENT_CREATED,
      'Qabul muvaffaqiyatli yaratildi',
      `Shifokor: ${doctor.user.firstName} ${doctor.user.lastName}, Sana: ${dto.appointmentDate} ${dto.startTime}`,
      { appointmentId: createdAppointment.id },
    );

    return this.mapToResponse(createdAppointment);
  }

  async findAll(
    currentUser: { id: string; role: Role },
    query: AppointmentsQueryDto,
  ): Promise<{
    items: AppointmentResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      status,
      doctorId,
      patientId,
      clinicId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;
    const where: Prisma.AppointmentWhereInput = {};

    // 1. Role-based automatic filtering
    if (currentUser.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.id },
      });
      if (!patient) {
        return { items: [], total: 0, page, limit, totalPages: 1 };
      }
      where.patientId = patient.id;
    } else if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.id },
      });
      if (!doctor) {
        return { items: [], total: 0, page, limit, totalPages: 1 };
      }
      where.doctorId = doctor.id;
    } else if (currentUser.role === Role.CLINIC_MANAGER) {
      const clinics = await this.prisma.clinic.findMany({
        where: { managerId: currentUser.id },
        select: { id: true },
      });
      const clinicIds = clinics.map((c) => c.id);
      where.clinicId = { in: clinicIds };
    }

    // 2. Query filters
    if (status) {
      where.status = status;
    }
    if (doctorId && currentUser.role !== Role.DOCTOR) {
      where.doctorId = doctorId;
    }
    if (patientId && currentUser.role !== Role.PATIENT) {
      where.patientId = patientId;
    }
    if (clinicId && currentUser.role !== Role.CLINIC_MANAGER) {
      where.clinicId = clinicId;
    }
    if (dateFrom || dateTo) {
      where.appointmentDate = {};
      if (dateFrom) where.appointmentDate.gte = dateFrom;
      if (dateTo) where.appointmentDate.lte = dateTo;
    }

    // 3. Sorting
    const allowedSortFields = ['appointmentDate', 'startTime', 'createdAt', 'status'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderByDirection = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: orderByDirection },
        include: appointmentInclude,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      items: items.map((item) => this.mapToResponse(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(
    id: string,
    currentUser: { id: string; role: Role },
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });

    if (!appointment) {
      throw new NotFoundAppException('Qabul topilmadi');
    }

    this.checkAccess(appointment, currentUser);

    return this.mapToResponse(appointment);
  }

  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    currentUser: { id: string; role: Role },
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment) {
      throw new NotFoundAppException('Qabul topilmadi');
    }

    // Check ownership / admin
    if (
      currentUser.role !== Role.ADMIN &&
      currentUser.role !== Role.SUPER_ADMIN &&
      appointment.patient.user.id !== currentUser.id
    ) {
      throw new ForbiddenAppException(
        'Faqat o‘zingizning qabulingizni boshqa vaqtga ko‘chira olasiz',
      );
    }

    // Check status: only PENDING or CONFIRMED can be rescheduled
    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new ConflictAppException(
        'Faqat PENDING yoki CONFIRMED holatidagi qabullarni ko‘chirish mumkin',
      );
    }

    // Check not past
    this.validateNotPast(dto.appointmentDate, dto.startTime);

    // Compute new end time & validate doctor schedule
    const endTime = await this.validateScheduleAndComputeEndTime(
      this.prisma,
      appointment.doctorId,
      appointment.clinicId,
      dto.appointmentDate,
      dto.startTime,
      appointment.serviceId ?? undefined,
    );

    let updatedAppointment: any;
    try {
      updatedAppointment = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.appointment.findFirst({
          where: {
            doctorId: appointment.doctorId,
            appointmentDate: dto.appointmentDate,
            startTime: dto.startTime,
            status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
            NOT: { id },
          },
        });
        if (existing) {
          throw new SlotAlreadyBookedException();
        }

        return tx.appointment.update({
          where: { id },
          data: {
            appointmentDate: dto.appointmentDate,
            startTime: dto.startTime,
            endTime,
          },
          include: appointmentInclude,
        });
      });
    } catch (error: any) {
      if (
        error instanceof SlotAlreadyBookedException ||
        error?.code === 'P2002' ||
        (error?.message && error.message.includes('uniq_active_appointment_slot'))
      ) {
        throw new SlotAlreadyBookedException();
      }
      throw error;
    }

    // Notify doctor
    await this.notificationsService.createNotification(
      appointment.doctor.user.id,
      NotificationType.APPOINTMENT_RESCHEDULED,
      'Qabul vaqti o‘zgartirildi',
      `Bemor ${appointment.patient.user.firstName} ${appointment.patient.user.lastName} qabul vaqtini ${dto.appointmentDate} ${dto.startTime} ga ko‘chirdi.`,
      { appointmentId: appointment.id },
    );

    // Notify patient
    await this.notificationsService.createNotification(
      appointment.patient.user.id,
      NotificationType.APPOINTMENT_RESCHEDULED,
      'Qabul vaqti o‘zgartirildi',
      `Sizning qabulingiz ${dto.appointmentDate} ${dto.startTime} ga muvaffaqiyatli ko‘chirildi.`,
      { appointmentId: appointment.id },
    );

    return this.mapToResponse(updatedAppointment);
  }

  async cancel(
    id: string,
    dto: CancelAppointmentDto,
    currentUser: { id: string; role: Role },
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment) {
      throw new NotFoundAppException('Qabul topilmadi');
    }

    // Check ownership / admin
    if (
      currentUser.role !== Role.ADMIN &&
      currentUser.role !== Role.SUPER_ADMIN &&
      appointment.patient.user.id !== currentUser.id
    ) {
      throw new ForbiddenAppException('Ushbu qabulni bekor qilish uchun ruxsat yo‘q');
    }

    // Status check
    if (
      appointment.status !== AppointmentStatus.PENDING &&
      appointment.status !== AppointmentStatus.CONFIRMED
    ) {
      throw new ConflictAppException(
        'Faqat PENDING yoki CONFIRMED holatidagi qabulni bekor qilish mumkin',
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelReason: dto.cancelReason ?? null,
      },
      include: appointmentInclude,
    });

    // Notify doctor
    await this.notificationsService.createNotification(
      appointment.doctor.user.id,
      NotificationType.APPOINTMENT_CANCELLED,
      'Qabul bekor qilindi',
      `Bemor ${appointment.patient.user.firstName} ${appointment.patient.user.lastName} ${appointment.appointmentDate} ${appointment.startTime} dagi qabulni bekor qildi. Sabab: ${dto.cancelReason ?? 'Ko‘rsatilmadi'}`,
      { appointmentId: appointment.id },
    );

    // If cancelled by admin, notify patient as well
    if (
      currentUser.role === Role.ADMIN ||
      currentUser.role === Role.SUPER_ADMIN
    ) {
      await this.notificationsService.createNotification(
        appointment.patient.user.id,
        NotificationType.APPOINTMENT_CANCELLED,
        'Qabul bekor qilindi',
        `${appointment.appointmentDate} ${appointment.startTime} dagi qabulingiz bekor qilindi. Sabab: ${dto.cancelReason ?? 'Administrator tomonidan'}`,
        { appointmentId: appointment.id },
      );
    }

    return this.mapToResponse(updated);
  }

  async confirm(
    id: string,
    currentUser: { id: string; role: Role },
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment) {
      throw new NotFoundAppException('Qabul topilmadi');
    }

    // Doctor or Admin
    if (
      currentUser.role !== Role.ADMIN &&
      currentUser.role !== Role.SUPER_ADMIN &&
      appointment.doctor.user.id !== currentUser.id
    ) {
      throw new ForbiddenAppException('Faqat biriktirilgan shifokor qabulni tasdiqlay oladi');
    }

    // Only PENDING can be confirmed
    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new ConflictAppException(
        'Faqat PENDING holatidagi qabulni tasdiqlash mumkin',
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CONFIRMED },
      include: appointmentInclude,
    });

    // Notify patient
    await this.notificationsService.createNotification(
      appointment.patient.user.id,
      NotificationType.APPOINTMENT_CONFIRMED,
      'Qabul tasdiqlandi',
      `Sizning ${appointment.appointmentDate} ${appointment.startTime} dagi qabulingiz shifokor tomonidan tasdiqlandi.`,
      { appointmentId: appointment.id },
    );

    return this.mapToResponse(updated);
  }

  async reject(
    id: string,
    dto: RejectAppointmentDto,
    currentUser: { id: string; role: Role },
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment) {
      throw new NotFoundAppException('Qabul topilmadi');
    }

    // Doctor or Admin
    if (
      currentUser.role !== Role.ADMIN &&
      currentUser.role !== Role.SUPER_ADMIN &&
      appointment.doctor.user.id !== currentUser.id
    ) {
      throw new ForbiddenAppException('Faqat biriktirilgan shifokor qabulni rad eta oladi');
    }

    // Only PENDING can be rejected
    if (appointment.status !== AppointmentStatus.PENDING) {
      throw new ConflictAppException(
        'Faqat PENDING holatidagi qabulni rad etish mumkin',
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.REJECTED,
        cancelReason: dto.cancelReason ?? null,
      },
      include: appointmentInclude,
    });

    // Notify patient
    await this.notificationsService.createNotification(
      appointment.patient.user.id,
      NotificationType.APPOINTMENT_REJECTED,
      'Qabul rad etildi',
      `Sizning ${appointment.appointmentDate} ${appointment.startTime} dagi qabulingiz rad etildi. Sabab: ${dto.cancelReason ?? 'Ko‘rsatilmadi'}`,
      { appointmentId: appointment.id },
    );

    return this.mapToResponse(updated);
  }

  async complete(
    id: string,
    currentUser: { id: string; role: Role },
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment) {
      throw new NotFoundAppException('Qabul topilmadi');
    }

    // Doctor or Admin
    if (
      currentUser.role !== Role.ADMIN &&
      currentUser.role !== Role.SUPER_ADMIN &&
      appointment.doctor.user.id !== currentUser.id
    ) {
      throw new ForbiddenAppException('Faqat biriktirilgan shifokor qabulni yakunlay oladi');
    }

    // Only CONFIRMED can be completed
    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new ConflictAppException(
        'Faqat CONFIRMED holatidagi qabulni yakunlash mumkin',
      );
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.COMPLETED },
      include: appointmentInclude,
    });

    return this.mapToResponse(updated);
  }

  async updateStatus(
    id: string,
    dto: UpdateAppointmentStatusDto,
    adminId?: string,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment) {
      throw new NotFoundAppException('Qabul topilmadi');
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data: { status: dto.status },
      include: appointmentInclude,
    });

    if (adminId) {
      try {
        await this.prisma.adminLog.create({
          data: {
            adminId,
            action: 'UPDATE_APPOINTMENT_STATUS',
            entity: 'Appointment',
            entityId: id,
            metadata: {
              previousStatus: appointment.status,
              newStatus: dto.status,
            },
          },
        });
      } catch {}
    }

    return this.mapToResponse(updated);
  }

  private checkAccess(appointment: any, currentUser: { id: string; role: Role }) {
    if (
      currentUser.role === Role.ADMIN ||
      currentUser.role === Role.SUPER_ADMIN
    ) {
      return;
    }

    if (
      currentUser.role === Role.DOCTOR &&
      appointment.doctor.user.id === currentUser.id
    ) {
      return;
    }

    if (
      currentUser.role === Role.PATIENT &&
      appointment.patient.user.id === currentUser.id
    ) {
      return;
    }

    if (
      currentUser.role === Role.CLINIC_MANAGER &&
      appointment.clinic.managerId === currentUser.id
    ) {
      return;
    }

    throw new ForbiddenAppException('Ushbu qabulni ko‘rish uchun ruxsat yo‘q');
  }

  private mapToResponse(appointment: any): AppointmentResponseDto {
    return {
      id: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      clinicId: appointment.clinicId,
      serviceId: appointment.serviceId ?? null,
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      reason: appointment.reason ?? null,
      status: appointment.status,
      cancelReason: appointment.cancelReason ?? null,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      patient: {
        id: appointment.patient.id,
        firstName: appointment.patient.user.firstName,
        lastName: appointment.patient.user.lastName,
        phone: appointment.patient.user.phone ?? null,
      },
      doctor: {
        id: appointment.doctor.id,
        firstName: appointment.doctor.user.firstName,
        lastName: appointment.doctor.user.lastName,
        avatarUrl: appointment.doctor.user.avatarUrl ?? null,
        specialization: {
          id: appointment.doctor.specialization.id,
          name: appointment.doctor.specialization.name,
        },
      },
      clinic: {
        id: appointment.clinic.id,
        name: appointment.clinic.name,
        address: appointment.clinic.address,
      },
    };
  }
}

