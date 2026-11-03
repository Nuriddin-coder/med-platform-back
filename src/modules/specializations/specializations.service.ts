import { Injectable } from '@nestjs/common';
import {
  ConflictAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateSpecializationDto,
  SpecializationResponseDto,
  UpdateSpecializationDto,
} from './dto/specialization.dto.js';

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

@Injectable()
export class SpecializationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SpecializationResponseDto[]> {
    const items = await this.prisma.specialization.findMany({
      orderBy: { name: 'asc' },
    });

    return items.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      iconUrl: item.iconUrl,
      isActive: item.isActive,
    }));
  }

  async findOne(id: string): Promise<SpecializationResponseDto> {
    const item = await this.prisma.specialization.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundAppException('Mutaxassislik topilmadi');
    }

    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      iconUrl: item.iconUrl,
      isActive: item.isActive,
    };
  }

  async create(dto: CreateSpecializationDto): Promise<SpecializationResponseDto> {
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);

    const existingName = await this.prisma.specialization.findUnique({
      where: { name: dto.name },
    });
    if (existingName) {
      throw new ConflictAppException('Bunday nomli mutaxassislik allaqachon mavjud');
    }

    const existingSlug = await this.prisma.specialization.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      throw new ConflictAppException('Bunday slug allaqachon mavjud');
    }

    const created = await this.prisma.specialization.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        iconUrl: dto.iconUrl ?? null,
        isActive: dto.isActive ?? true,
      },
    });

    return {
      id: created.id,
      name: created.name,
      slug: created.slug,
      description: created.description,
      iconUrl: created.iconUrl,
      isActive: created.isActive,
    };
  }

  async update(
    id: string,
    dto: UpdateSpecializationDto,
  ): Promise<SpecializationResponseDto> {
    const item = await this.prisma.specialization.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundAppException('Mutaxassislik topilmadi');
    }

    if (dto.name && dto.name !== item.name) {
      const conflict = await this.prisma.specialization.findUnique({
        where: { name: dto.name },
      });
      if (conflict) {
        throw new ConflictAppException('Bunday nomli mutaxassislik allaqachon mavjud');
      }
    }

    let slug = item.slug;
    if (dto.slug && dto.slug !== item.slug) {
      slug = slugify(dto.slug);
      const conflictSlug = await this.prisma.specialization.findUnique({
        where: { slug },
      });
      if (conflictSlug) {
        throw new ConflictAppException('Bunday slug allaqachon mavjud');
      }
    }

    const updated = await this.prisma.specialization.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        slug,
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      description: updated.description,
      iconUrl: updated.iconUrl,
      isActive: updated.isActive,
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    const item = await this.prisma.specialization.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundAppException('Mutaxassislik topilmadi');
    }

    await this.prisma.specialization.delete({ where: { id } });
    return { message: 'Mutaxassislik muvaffaqiyatli o‘chirildi' };
  }
}

