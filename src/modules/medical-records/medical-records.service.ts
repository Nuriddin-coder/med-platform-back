import { Injectable } from '@nestjs/common';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateMedicalRecordDto,
  MedicalRecordResponseDto,
  MedicalRecordsQueryDto,
  UpdateMedicalRecordDto,
} from './dto/medical-record.dto.js';

const medicalRecordInclude = {
  patient: {
    include: {
      user: true,
    },
  },
  doctor: {
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
  documents: {
    select: {
      id: true,
      patientId: true,
      recordId: true,
      uploadedById: true,
      type: true,
      title: true,
      fileName: true,
      mimeType: true,
      size: true,
      createdAt: true,
      // storagePath is intentionally excluded!
    },
  },
} as const;

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    currentUser: { id: string; role: Role },
    dto: CreateMedicalRecordDto,
  ): Promise<MedicalRecordResponseDto> {
    // 1. Doctor check
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: currentUser.id },
    });
    if (!doctor) {
      throw new ForbiddenAppException('Shifokor profili topilmadi');
    }

    // 2. Patient check
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundAppException('Bemor topilmadi');
    }

    // 3. Appointment verification: doctor must have CONFIRMED or COMPLETED appointment with this patient
    const hasValidAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId: doctor.id,
        patientId: dto.patientId,
        status: {
          in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
        },
      },
    });

    if (!hasValidAppointment) {
      throw new ForbiddenAppException(
        'Ushbu bemor bilan tasdiqlangan yoki yakunlangan qabulingiz bo‘lishi shart',
      );
    }

    // 4. If appointmentId passed, verify it matches
    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: dto.appointmentId },
      });
      if (
        !appointment ||
        appointment.doctorId !== doctor.id ||
        appointment.patientId !== dto.patientId
      ) {
        throw new ConflictAppException(
          'Ko‘rsatilgan qabul shifokor va bemorga mos kelmadi',
        );
      }

      if (
        appointment.status !== AppointmentStatus.CONFIRMED &&
        appointment.status !== AppointmentStatus.COMPLETED
      ) {
        throw new ConflictAppException(
          'Faqat tasdiqlangan yoki yakunlangan qabullar uchun tibbiy yozuv yaratilishi mumkin',
        );
      }

      const existingRecord = await this.prisma.medicalRecord.findUnique({
        where: { appointmentId: dto.appointmentId },
      });
      if (existingRecord) {
        throw new ConflictAppException(
          'Ushbu qabul uchun allaqachon tibbiy yozuv yaratilgan',
        );
      }
    }

    // 5. Create record
    const record = await this.prisma.medicalRecord.create({
      data: {
        patientId: dto.patientId,
        doctorId: doctor.id,
        appointmentId: dto.appointmentId ?? null,
        diagnosis: dto.diagnosis,
        conclusion: dto.conclusion,
        recommendations: dto.recommendations ?? null,
      },
      include: medicalRecordInclude,
    });

    return this.mapToResponse(record);
  }

  async update(
    id: string,
    dto: UpdateMedicalRecordDto,
    currentUser: { id: string; role: Role },
  ): Promise<MedicalRecordResponseDto> {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: medicalRecordInclude,
    });

    if (!record) {
      throw new NotFoundAppException('Tibbiy yozuv topilmadi');
    }

    // Author check: only the author doctor can edit
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: currentUser.id },
    });
    if (!doctor || record.doctorId !== doctor.id) {
      throw new ForbiddenAppException(
        'Faqat ushbu yozuvni yaratgan shifokor tahrirlashi mumkin',
      );
    }

    const updated = await this.prisma.medicalRecord.update({
      where: { id },
      data: {
        diagnosis: dto.diagnosis ?? undefined,
        conclusion: dto.conclusion ?? undefined,
        recommendations: dto.recommendations !== undefined ? dto.recommendations : undefined,
      },
      include: medicalRecordInclude,
    });

    return this.mapToResponse(updated);
  }

  async findAll(
    currentUser: { id: string; role: Role },
    query: MedicalRecordsQueryDto,
  ): Promise<{
    items: MedicalRecordResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, patientId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MedicalRecordWhereInput = {};

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

      if (patientId) {
        const hasAppointment = await this.prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            patientId,
            status: {
              in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
            },
          },
        });
        if (!hasAppointment) {
          throw new ForbiddenAppException(
            'Ushbu bemor bilan tasdiqlangan yoki yakunlangan qabulingiz mavjud emas',
          );
        }
        where.patientId = patientId;
      } else {
        const treated = await this.prisma.appointment.findMany({
          where: {
            doctorId: doctor.id,
            status: {
              in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
            },
          },
          select: { patientId: true },
        });
        const treatedPatientIds = Array.from(new Set(treated.map((t) => t.patientId)));
        where.patientId = { in: treatedPatientIds };
      }
    } else if (patientId) {
      where.patientId = patientId;
    }

    const [items, total] = await Promise.all([
      this.prisma.medicalRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: medicalRecordInclude,
      }),
      this.prisma.medicalRecord.count({ where }),
    ]);

    return {
      items: items.map((r) => this.mapToResponse(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(
    id: string,
    currentUser: { id: string; role: Role },
  ): Promise<MedicalRecordResponseDto> {
    const record = await this.prisma.medicalRecord.findUnique({
      where: { id },
      include: medicalRecordInclude,
    });

    if (!record) {
      throw new NotFoundAppException('Tibbiy yozuv topilmadi');
    }

    // Access check
    let allowed = false;

    if (
      currentUser.role === Role.ADMIN ||
      currentUser.role === Role.SUPER_ADMIN
    ) {
      allowed = true;
    } else if (
      currentUser.role === Role.PATIENT &&
      record.patient.user.id === currentUser.id
    ) {
      allowed = true;
    } else if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.id },
      });
      if (doctor) {
        if (record.doctorId === doctor.id) {
          allowed = true;
        } else {
          const hasAppointment = await this.prisma.appointment.findFirst({
            where: {
              doctorId: doctor.id,
              patientId: record.patientId,
              status: {
                in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
              },
            },
          });
          if (hasAppointment) {
            allowed = true;
          }
        }
      }
    }

    if (!allowed) {
      throw new ForbiddenAppException(
        'Ushbu tibbiy yozuvni ko‘rish uchun ruxsat berilmagan',
      );
    }

    return this.mapToResponse(record);
  }

  mapToResponse(record: any): MedicalRecordResponseDto {
    return {
      id: record.id,
      patientId: record.patientId,
      doctorId: record.doctorId,
      appointmentId: record.appointmentId ?? null,
      diagnosis: record.diagnosis,
      conclusion: record.conclusion,
      recommendations: record.recommendations ?? null,
      createdAt: record.createdAt,
      doctor: {
        id: record.doctor.id,
        firstName: record.doctor.user.firstName,
        lastName: record.doctor.user.lastName,
      },
      documents: (record.documents || []).map((doc: any) => ({
        id: doc.id,
        patientId: doc.patientId,
        recordId: doc.recordId ?? null,
        uploadedById: doc.uploadedById,
        type: doc.type,
        title: doc.title,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        size: doc.size,
        createdAt: doc.createdAt,
      })),
    };
  }
}

