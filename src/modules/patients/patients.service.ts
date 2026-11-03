import { Injectable } from '@nestjs/common';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import {
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  PatientResponseDto,
  PatientsQueryDto,
  UpdatePatientDto,
} from './dto/patient.dto.js';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    currentUser: { id: string; role: Role },
    query: PatientsQueryDto,
  ): Promise<{
    items: PatientResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {};

    if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.id },
      });
      if (!doctor) {
        return { items: [], total: 0, page, limit, totalPages: 1 };
      }

      const appointments = await this.prisma.appointment.findMany({
        where: {
          doctorId: doctor.id,
          status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
        },
        select: { patientId: true },
      });
      const patientIds = Array.from(new Set(appointments.map((a) => a.patientId)));
      where.id = { in: patientIds };
    }

    if (search) {
      where.user = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      items: items.map((p) => this.mapToResponse(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(
    id: string,
    currentUser: { id: string; role: Role },
  ): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!patient) {
      throw new NotFoundAppException('Bemor topilmadi');
    }

    if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.id },
      });
      if (!doctor) {
        throw new ForbiddenAppException('Shifokor profili topilmadi');
      }

      const hasAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          patientId: patient.id,
          status: { in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED] },
        },
      });

      if (!hasAppointment) {
        throw new ForbiddenAppException(
          'Ushbu bemor bilan qabulingiz bo‘lmaganligi sababli maʼlumotni ko‘ra olmaysiz',
        );
      }
    }

    return this.mapToResponse(patient);
  }

  async update(id: string, dto: UpdatePatientDto): Promise<PatientResponseDto> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!patient) {
      throw new NotFoundAppException('Bemor topilmadi');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update User fields if provided
      if (
        dto.firstName ||
        dto.lastName ||
        dto.phone ||
        dto.email ||
        dto.avatarUrl !== undefined
      ) {
        await tx.user.update({
          where: { id: patient.userId },
          data: {
            ...(dto.firstName && { firstName: dto.firstName }),
            ...(dto.lastName && { lastName: dto.lastName }),
            ...(dto.phone && { phone: dto.phone }),
            ...(dto.email && { email: dto.email }),
            ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
          },
        });
      }

      // Update Patient fields
      return tx.patient.update({
        where: { id },
        data: {
          ...(dto.birthDate && { birthDate: new Date(dto.birthDate) }),
          ...(dto.gender && { gender: dto.gender }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.bloodType !== undefined && { bloodType: dto.bloodType }),
          ...(dto.allergies !== undefined && { allergies: dto.allergies }),
        },
        include: { user: true },
      });
    });

    return this.mapToResponse(updated);
  }

  async getMe(userId: string): Promise<PatientResponseDto> {
    let patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!patient) {
      patient = await this.prisma.patient.create({
        data: { userId },
        include: { user: true },
      });
    }

    return this.mapToResponse(patient);
  }

  async updateMe(
    userId: string,
    dto: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    let patient = await this.prisma.patient.findUnique({
      where: { userId },
    });

    if (!patient) {
      patient = await this.prisma.patient.create({
        data: { userId },
      });
    }

    return this.update(patient.id, dto);
  }

  mapToResponse(patient: any): PatientResponseDto {
    return {
      id: patient.id,
      userId: patient.userId,
      firstName: patient.user.firstName,
      lastName: patient.user.lastName,
      birthDate: patient.birthDate ?? null,
      gender: patient.gender ?? null,
      phone: patient.user.phone ?? null,
      email: patient.user.email ?? null,
      address: patient.address ?? null,
      avatarUrl: patient.user.avatarUrl ?? null,
      bloodType: patient.bloodType ?? null,
      allergies: patient.allergies ?? null,
    };
  }
}

