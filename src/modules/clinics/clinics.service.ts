import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import {
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ClinicDetailResponseDto,
  ClinicResponseDto,
  ClinicsQueryDto,
  CreateClinicDto,
  UpdateClinicDto,
} from './dto/clinic.dto.js';

@Injectable()
export class ClinicsService {
  constructor(private readonly prisma: PrismaService) {}

  private formatClinic(c: any): ClinicResponseDto {
    return {
      id: c.id,
      name: c.name,
      address: c.address,
      city: c.city,
      phone: c.phone,
      email: c.email,
      description: c.description,
      logoUrl: c.logoUrl,
      imageUrls: c.imageUrls ?? [],
      workingHours: (c.workingHours ?? []).map((w: any) => ({
        dayOfWeek: w.dayOfWeek,
        openTime: w.openTime,
        closeTime: w.closeTime,
        isClosed: w.isClosed,
      })),
      rating: c.rating,
      reviewsCount: c.reviewsCount,
      isActive: c.isActive,
    };
  }

  async findAll(query: ClinicsQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ClinicWhereInput = {};

    if (query.city) {
      where.city = { equals: query.city, mode: 'insensitive' };
    }

    if (query.minRating !== undefined && query.minRating !== null) {
      where.rating = { gte: Number(query.minRating) };
    }

    if (query.serviceId) {
      where.services = {
        some: { id: query.serviceId },
      };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ClinicOrderByWithRelationInput = {};
    const validSortFields = ['rating', 'reviewsCount', 'name', 'createdAt'];
    const sortField = query.sortBy && validSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    orderBy[sortField as keyof Prisma.ClinicOrderByWithRelationInput] = query.sortOrder || 'desc';

    const [clinics, total] = await Promise.all([
      this.prisma.clinic.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          workingHours: {
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      }),
      this.prisma.clinic.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: clinics.map((c) => this.formatClinic(c)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<ClinicDetailResponseDto> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      include: {
        workingHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        services: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!clinic) {
      throw new NotFoundAppException('Klinika topilmadi');
    }

    const base = this.formatClinic(clinic);
    return {
      ...base,
      services: clinic.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price,
        durationMinutes: s.durationMinutes,
        clinicId: s.clinicId,
        isActive: s.isActive,
      })),
    };
  }

  async create(dto: CreateClinicDto): Promise<ClinicResponseDto> {
    const created = await this.prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({
        data: {
          name: dto.name,
          address: dto.address,
          city: dto.city,
          phone: dto.phone,
          email: dto.email ?? null,
          description: dto.description ?? null,
          logoUrl: dto.logoUrl ?? null,
          imageUrls: dto.imageUrls ?? [],
          managerId: dto.managerId ?? null,
          isActive: dto.isActive ?? true,
        },
      });

      if (dto.workingHours && dto.workingHours.length > 0) {
        for (const wh of dto.workingHours) {
          await tx.clinicWorkingHour.create({
            data: {
              clinicId: clinic.id,
              dayOfWeek: wh.dayOfWeek,
              openTime: wh.openTime,
              closeTime: wh.closeTime,
              isClosed: wh.isClosed,
            },
          });
        }
      }

      return tx.clinic.findUnique({
        where: { id: clinic.id },
        include: { workingHours: true },
      });
    });

    return this.formatClinic(created);
  }

  private async verifyClinicManagementPermission(
    user: { id: string; role: Role },
    clinicId: string,
  ) {
    if (user.role === Role.SUPER_ADMIN || user.role === Role.ADMIN) {
      return;
    }

    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
    });

    if (!clinic) {
      throw new NotFoundAppException('Klinika topilmadi');
    }

    if (clinic.managerId !== user.id) {
      throw new ForbiddenAppException('Siz faqat o‘z klinikangizni tahrirlashingiz mumkin');
    }
  }

  async update(
    user: { id: string; role: Role },
    id: string,
    dto: UpdateClinicDto,
  ): Promise<ClinicResponseDto> {
    await this.verifyClinicManagementPermission(user, id);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.clinic.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.address !== undefined && { address: dto.address }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.email !== undefined && { email: dto.email }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
          ...(dto.imageUrls !== undefined && { imageUrls: dto.imageUrls }),
          ...(dto.managerId !== undefined && { managerId: dto.managerId }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });

      if (dto.workingHours && dto.workingHours.length > 0) {
        for (const wh of dto.workingHours) {
          await tx.clinicWorkingHour.upsert({
            where: {
              clinicId_dayOfWeek: {
                clinicId: id,
                dayOfWeek: wh.dayOfWeek,
              },
            },
            update: {
              openTime: wh.openTime,
              closeTime: wh.closeTime,
              isClosed: wh.isClosed,
            },
            create: {
              clinicId: id,
              dayOfWeek: wh.dayOfWeek,
              openTime: wh.openTime,
              closeTime: wh.closeTime,
              isClosed: wh.isClosed,
            },
          });
        }
      }

      return tx.clinic.findUnique({
        where: { id },
        include: { workingHours: true },
      });
    });

    return this.formatClinic(updated);
  }

  async remove(id: string): Promise<{ message: string }> {
    const existing = await this.prisma.clinic.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundAppException('Klinika topilmadi');
    }

    await this.prisma.clinic.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Klinika muvaffaqiyatli o‘chirildi' };
  }

  async addDoctor(
    user: { id: string; role: Role },
    clinicId: string,
    doctorId: string,
  ): Promise<{ message: string }> {
    await this.verifyClinicManagementPermission(user, clinicId);

    const doctor = await this.prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundAppException('Doktor topilmadi');
    }

    const existing = await this.prisma.clinicDoctor.findUnique({
      where: {
        clinicId_doctorId: { clinicId, doctorId },
      },
    });

    if (existing) {
      throw new ConflictAppException('Doktor ushbu klinikaga allaqachon biriktirilgan');
    }

    await this.prisma.clinicDoctor.create({
      data: { clinicId, doctorId },
    });

    return { message: 'Doktor klinikaga muvaffaqiyatli biriktirildi' };
  }

  async removeDoctor(
    user: { id: string; role: Role },
    clinicId: string,
    doctorId: string,
  ): Promise<{ message: string }> {
    await this.verifyClinicManagementPermission(user, clinicId);

    const existing = await this.prisma.clinicDoctor.findUnique({
      where: {
        clinicId_doctorId: { clinicId, doctorId },
      },
    });

    if (!existing) {
      throw new NotFoundAppException('Doktor ushbu klinikada topilmadi');
    }

    await this.prisma.clinicDoctor.delete({
      where: { id: existing.id },
    });

    return { message: 'Doktor klinikadan muvaffaqiyatli ajratildi' };
  }
}

