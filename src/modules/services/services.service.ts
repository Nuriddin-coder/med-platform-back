import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import {
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateServiceDto,
  ServiceResponseDto,
  ServicesQueryDto,
  UpdateServiceDto,
} from './dto/service.dto.js';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: ServicesQueryDto): Promise<ServiceResponseDto[]> {
    const where: any = {};
    if (query?.clinicId) {
      where.clinicId = query.clinicId;
    }

    const services = await this.prisma.service.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      durationMinutes: s.durationMinutes,
      clinicId: s.clinicId,
      isActive: s.isActive,
    }));
  }

  async findOne(id: string): Promise<ServiceResponseDto> {
    const s = await this.prisma.service.findUnique({
      where: { id },
    });

    if (!s) {
      throw new NotFoundAppException('Xizmat topilmadi');
    }

    return {
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      durationMinutes: s.durationMinutes,
      clinicId: s.clinicId,
      isActive: s.isActive,
    };
  }

  private async verifyClinicPermission(user: { id: string; role: Role }, clinicId: string) {
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
      throw new ForbiddenAppException('Siz faqat o‘z klinikangiz xizmatlarini boshqara olasiz');
    }
  }

  async create(user: { id: string; role: Role }, dto: CreateServiceDto): Promise<ServiceResponseDto> {
    await this.verifyClinicPermission(user, dto.clinicId);

    const created = await this.prisma.service.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price,
        durationMinutes: dto.durationMinutes ?? 30,
        clinicId: dto.clinicId,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      price: created.price,
      durationMinutes: created.durationMinutes,
      clinicId: created.clinicId,
      isActive: created.isActive,
    };
  }

  async update(
    user: { id: string; role: Role },
    id: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundAppException('Xizmat topilmadi');
    }

    await this.verifyClinicPermission(user, existing.clinicId);

    if (dto.clinicId && dto.clinicId !== existing.clinicId) {
      await this.verifyClinicPermission(user, dto.clinicId);
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
        ...(dto.clinicId !== undefined && { clinicId: dto.clinicId }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      price: updated.price,
      durationMinutes: updated.durationMinutes,
      clinicId: updated.clinicId,
      isActive: updated.isActive,
    };
  }

  async remove(user: { id: string; role: Role }, id: string): Promise<{ message: string }> {
    const existing = await this.prisma.service.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundAppException('Xizmat topilmadi');
    }

    await this.verifyClinicPermission(user, existing.clinicId);

    await this.prisma.service.delete({ where: { id } });
    return { message: 'Xizmat muvaffaqiyatli o‘chirildi' };
  }
}

