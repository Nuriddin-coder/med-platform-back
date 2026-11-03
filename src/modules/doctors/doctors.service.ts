import { Injectable } from '@nestjs/common';
import { AppointmentStatus, Gender, Prisma, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AddCertificateDto,
  CertificateResponseDto,
  CreateDoctorDto,
  DoctorResponseDto,
  DoctorsQueryDto,
  DoctorScheduleResponseDto,
  PatientResponseDto,
  ReviewResponseDto,
  TimeSlotDto,
  UpdateDoctorDto,
  UpdateDoctorSchedulesDto,
} from './dto/doctor.dto.js';

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatDoctor(d: any): DoctorResponseDto {
    return {
      id: d.id,
      userId: d.userId,
      firstName: d.user?.firstName ?? '',
      lastName: d.user?.lastName ?? '',
      avatarUrl: d.user?.avatarUrl ?? null,
      specialization: {
        id: d.specialization.id,
        name: d.specialization.name,
        slug: d.specialization.slug,
      },
      specializationId: d.specializationId,
      experienceYears: d.experienceYears,
      bio: d.bio,
      education: d.education,
      certificates: (d.certificates ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        fileUrl: c.fileUrl,
      })),
      consultationPrice: d.consultationPrice,
      rating: d.rating,
      reviewsCount: d.reviewsCount,
      clinics: (d.clinics ?? []).map((cd: any) => ({
        id: cd.clinic?.id ?? cd.clinicId,
        name: cd.clinic?.name ?? '',
        city: cd.clinic?.city ?? '',
        address: cd.clinic?.address ?? '',
      })),
      isActive: d.isActive,
    };
  }

  async findAll(query: DoctorsQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const userWhere: Prisma.UserWhereInput = {
      status: UserStatus.ACTIVE,
    };

    if (query.search) {
      userWhere.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const where: Prisma.DoctorWhereInput = {
      isActive: true,
      user: userWhere,
    };

    if (query.specializationId) {
      where.specializationId = query.specializationId;
    }

    if (query.clinicId) {
      where.clinics = {
        some: { clinicId: query.clinicId },
      };
    }

    if (query.city) {
      where.clinics = {
        some: { clinic: { city: { equals: query.city, mode: 'insensitive' } } },
      };
    }

    if (query.serviceId) {
      where.clinics = {
        some: { clinic: { services: { some: { id: query.serviceId } } } },
      };
    }

    if (query.minPrice !== undefined && query.minPrice !== null) {
      where.consultationPrice = { ...(where.consultationPrice as any), gte: Number(query.minPrice) };
    }

    if (query.maxPrice !== undefined && query.maxPrice !== null) {
      where.consultationPrice = { ...(where.consultationPrice as any), lte: Number(query.maxPrice) };
    }

    if (query.minRating !== undefined && query.minRating !== null) {
      where.rating = { gte: Number(query.minRating) };
    }

    if (query.date) {
      const parsedDate = new Date(`${query.date}T00:00:00.000Z`);
      if (!isNaN(parsedDate.getTime())) {
        const utcDay = parsedDate.getUTCDay();
        const dayOfWeek = utcDay === 0 ? 7 : utcDay;
        where.schedules = {
          some: {
            dayOfWeek,
            isActive: true,
          },
        };
      }
    }

    const orderBy: Prisma.DoctorOrderByWithRelationInput = {};
    const validSortFields = ['rating', 'consultationPrice', 'experienceYears', 'createdAt'];
    const sortField = query.sortBy && validSortFields.includes(query.sortBy) ? query.sortBy : 'rating';
    orderBy[sortField as keyof Prisma.DoctorOrderByWithRelationInput] = query.sortOrder || 'desc';

    const [doctors, total] = await Promise.all([
      this.prisma.doctor.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: true,
          specialization: true,
          certificates: true,
          clinics: {
            include: { clinic: true },
          },
        },
      }),
      this.prisma.doctor.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: doctors.map((d) => this.formatDoctor(d)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id },
      include: {
        user: true,
        specialization: true,
        certificates: true,
        clinics: {
          include: { clinic: true },
        },
      },
    });

    if (!doctor) {
      throw new NotFoundAppException('Shifokor topilmadi');
    }

    return this.formatDoctor(doctor);
  }

  async create(dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictAppException('Ushbu email allaqachon mavjud');
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictAppException('Ushbu telefon allaqachon mavjud');
      }
    }

    const specialization = await this.prisma.specialization.findUnique({
      where: { id: dto.specializationId },
    });
    if (!specialization) {
      throw new NotFoundAppException('Mutaxassislik topilmadi');
    }

    const passwordHash = await argon2.hash(dto.password);

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          phone: dto.phone ?? null,
          passwordHash,
          role: Role.DOCTOR,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
        },
      });

      const doctor = await tx.doctor.create({
        data: {
          userId: user.id,
          specializationId: dto.specializationId,
          experienceYears: dto.experienceYears,
          bio: dto.bio ?? null,
          education: dto.education ?? null,
          consultationPrice: dto.consultationPrice,
          isActive: true,
        },
      });

      if (dto.clinicIds && dto.clinicIds.length > 0) {
        for (const clinicId of dto.clinicIds) {
          await tx.clinicDoctor.create({
            data: {
              clinicId,
              doctorId: doctor.id,
            },
          });
        }
      }

      return tx.doctor.findUnique({
        where: { id: doctor.id },
        include: {
          user: true,
          specialization: true,
          certificates: true,
          clinics: { include: { clinic: true } },
        },
      });
    });

    return this.formatDoctor(created);
  }

  async update(id: string, dto: UpdateDoctorDto): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    if (!doctor) {
      throw new NotFoundAppException('Shifokor topilmadi');
    }

    if (dto.specializationId) {
      const spec = await this.prisma.specialization.findUnique({
        where: { id: dto.specializationId },
      });
      if (!spec) {
        throw new NotFoundAppException('Mutaxassislik topilmadi');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.firstName || dto.lastName || dto.avatarUrl) {
        await tx.user.update({
          where: { id: doctor.userId },
          data: {
            ...(dto.firstName !== undefined && { firstName: dto.firstName }),
            ...(dto.lastName !== undefined && { lastName: dto.lastName }),
            ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
          },
        });
      }

      return tx.doctor.update({
        where: { id },
        data: {
          ...(dto.specializationId !== undefined && { specializationId: dto.specializationId }),
          ...(dto.experienceYears !== undefined && { experienceYears: dto.experienceYears }),
          ...(dto.bio !== undefined && { bio: dto.bio }),
          ...(dto.education !== undefined && { education: dto.education }),
          ...(dto.consultationPrice !== undefined && { consultationPrice: dto.consultationPrice }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
        include: {
          user: true,
          specialization: true,
          certificates: true,
          clinics: { include: { clinic: true } },
        },
      });
    });

    return this.formatDoctor(updated);
  }

  async remove(id: string): Promise<{ message: string }> {
    const doctor = await this.prisma.doctor.findUnique({ where: { id } });
    if (!doctor) {
      throw new NotFoundAppException('Shifokor topilmadi');
    }

    // Soft-delete to preserve previous appointments & medical records
    await this.prisma.doctor.update({
      where: { id },
      data: { isActive: false },
    });
    await this.prisma.user.update({
      where: { id: doctor.userId },
      data: { status: UserStatus.BLOCKED },
    });
    return { message: 'Shifokor muvaffaqiyatli o‘chirildi' };
  }

  async getMe(userId: string): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: true,
        specialization: true,
        certificates: true,
        clinics: { include: { clinic: true } },
      },
    });

    if (!doctor) {
      throw new NotFoundAppException('Shifokor profili topilmadi');
    }

    return this.formatDoctor(doctor);
  }

  async updateMe(userId: string, dto: UpdateDoctorDto): Promise<DoctorResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) {
      throw new NotFoundAppException('Shifokor profili topilmadi');
    }

    return this.update(doctor.id, dto);
  }

  async getSlots(doctorId: string, date: string, clinicId: string): Promise<TimeSlotDto[]> {
    // 1. Verify doctor and clinic
    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundAppException('Shifokor topilmadi');
    }

    // 2. Parse dayOfWeek (1=Mon ... 7=Sun)
    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (isNaN(parsedDate.getTime())) {
      return [];
    }
    const utcDay = parsedDate.getUTCDay();
    const dayOfWeek = utcDay === 0 ? 7 : utcDay;

    // 3. Find active doctor schedule
    const schedule = await this.prisma.doctorSchedule.findFirst({
      where: {
        doctorId,
        clinicId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!schedule) {
      return [];
    }

    // 4. Generate all slots for this schedule
    const slotDuration = schedule.slotDurationMinutes || 30;
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    const rawSlots: { startTime: string; endTime: string }[] = [];
    while (currentMinutes + slotDuration <= endMinutes) {
      const slotStartH = String(Math.floor(currentMinutes / 60)).padStart(2, '0');
      const slotStartM = String(currentMinutes % 60).padStart(2, '0');

      const nextMinutes = currentMinutes + slotDuration;
      const slotEndH = String(Math.floor(nextMinutes / 60)).padStart(2, '0');
      const slotEndM = String(nextMinutes % 60).padStart(2, '0');

      rawSlots.push({
        startTime: `${slotStartH}:${slotStartM}`,
        endTime: `${slotEndH}:${slotEndM}`,
      });

      currentMinutes = nextMinutes;
    }

    // 5. Fetch booked appointments for this doctor on this date (PENDING or CONFIRMED)
    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        doctorId,
        clinicId,
        appointmentDate: date,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
      select: { startTime: true },
    });
    const bookedStarts = new Set(bookedAppointments.map((a) => a.startTime));

    // 6. Timezone check (Asia/Tashkent): past slots must have isAvailable = false
    const nowTashkent = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const tParts = Object.fromEntries(nowTashkent.map((p) => [p.type, p.value]));
    const todayStr = `${tParts.year}-${tParts.month}-${tParts.day}`;
    const currentTimeStr = `${tParts.hour}:${tParts.minute}`;

    const isPastDate = date < todayStr;
    const isToday = date === todayStr;

    return rawSlots.map((slot) => {
      let isAvailable = true;

      // If already booked
      if (bookedStarts.has(slot.startTime)) {
        isAvailable = false;
      }

      // If in the past
      if (isPastDate) {
        isAvailable = false;
      } else if (isToday && slot.startTime <= currentTimeStr) {
        isAvailable = false;
      }

      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable,
      };
    });
  }

  async getReviews(doctorId: string, query: PaginationQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { doctorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            include: { user: true },
          },
        },
      }),
      this.prisma.review.count({ where: { doctorId } }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: reviews.map((r): ReviewResponseDto => ({
        id: r.id,
        doctorId: r.doctorId,
        patientId: r.patientId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        patient: {
          firstName: r.patient?.user?.firstName ?? '',
          lastName: r.patient?.user?.lastName ?? '',
        },
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getMySchedules(userId: string): Promise<DoctorScheduleResponseDto[]> {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) {
      throw new NotFoundAppException('Shifokor topilmadi');
    }

    const schedules = await this.prisma.doctorSchedule.findMany({
      where: { doctorId: doctor.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return schedules.map((s) => ({
      id: s.id,
      doctorId: s.doctorId,
      clinicId: s.clinicId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      slotDurationMinutes: s.slotDurationMinutes,
      isActive: s.isActive,
    }));
  }

  async updateMySchedules(
    userId: string,
    dto: UpdateDoctorSchedulesDto,
  ): Promise<DoctorScheduleResponseDto[]> {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) {
      throw new NotFoundAppException('Shifokor topilmadi');
    }

    await this.prisma.$transaction(async (tx) => {
      // Remove previous schedules and insert new
      await tx.doctorSchedule.deleteMany({ where: { doctorId: doctor.id } });

      for (const item of dto.schedules) {
        await tx.doctorSchedule.create({
          data: {
            doctorId: doctor.id,
            clinicId: item.clinicId,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            slotDurationMinutes: item.slotDurationMinutes ?? 30,
            isActive: item.isActive ?? true,
          },
        });
      }
    });

    return this.getMySchedules(userId);
  }

  async getMyPatients(userId: string, query: PaginationQueryDto) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) {
      throw new NotFoundAppException('Shifokor topilmadi');
    }

    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {
      appointments: {
        some: { doctorId: doctor.id },
      },
    };

    if (query.search) {
      where.user = {
        OR: [
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
          { phone: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        include: { user: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: patients.map((p): PatientResponseDto => ({
        id: p.id,
        userId: p.userId,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        birthDate: p.birthDate,
        gender: p.gender,
        phone: p.user.phone,
        email: p.user.email,
        address: p.address,
        avatarUrl: p.user.avatarUrl,
        bloodType: p.bloodType,
        allergies: p.allergies,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async addCertificate(userId: string, dto: AddCertificateDto): Promise<CertificateResponseDto> {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) {
      throw new NotFoundAppException('Shifokor topilmadi');
    }

    const cert = await this.prisma.doctorCertificate.create({
      data: {
        doctorId: doctor.id,
        title: dto.title,
        fileUrl: dto.fileUrl,
      },
    });

    return {
      id: cert.id,
      title: cert.title,
      fileUrl: cert.fileUrl,
    };
  }

  async deleteCertificate(userId: string, certId: string): Promise<{ message: string }> {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) {
      throw new NotFoundAppException('Shifokor topilmadi');
    }

    const cert = await this.prisma.doctorCertificate.findUnique({
      where: { id: certId },
    });
    if (!cert || cert.doctorId !== doctor.id) {
      throw new NotFoundAppException('Sertifikat topilmadi');
    }

    await this.prisma.doctorCertificate.delete({ where: { id: certId } });
    return { message: 'Sertifikat muvaffaqiyatli o‘chirildi' };
  }
}
