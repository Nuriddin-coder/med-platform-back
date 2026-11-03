import { Injectable } from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  ConflictAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { toUserResponse, UserResponseDto } from './dto/user-response.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersQueryDto } from './dto/users-query.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async logAdminAction(params: {
    adminId: string;
    action: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
  }) {
    try {
      await this.prisma.adminLog.create({
        data: {
          adminId: params.adminId,
          action: params.action,
          entity: 'User',
          entityId: params.entityId ?? null,
          metadata: params.metadata ?? Prisma.JsonNull,
          ipAddress: params.ipAddress ?? null,
        },
      });
    } catch {
      // Don't fail the primary transaction if logging encounters an issue
    }
  }

  async findAll(query: UsersQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    const validSortFields = ['createdAt', 'firstName', 'lastName', 'role', 'status'];
    const sortField = query.sortBy && validSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    orderBy[sortField as keyof Prisma.UserOrderByWithRelationInput] = query.sortOrder || 'desc';

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: users.map(toUserResponse),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundAppException('Foydalanuvchi topilmadi');
    }

    return toUserResponse(user);
  }

  async create(
    adminId: string,
    dto: CreateUserDto,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictAppException('Ushbu email allaqachon mavjud');
      }
    }

    if (dto.phone) {
      const existing = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existing) {
        throw new ConflictAppException('Ushbu telefon raqami allaqachon mavjud');
      }
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          passwordHash,
          role: dto.role,
          status: dto.status ?? UserStatus.ACTIVE,
          isEmailVerified: true,
        },
      });

      if (dto.role === Role.PATIENT) {
        await tx.patient.create({
          data: { userId: created.id },
        });
      }

      return created;
    });

    await this.logAdminAction({
      adminId,
      action: 'CREATE_USER',
      entityId: user.id,
      metadata: { role: user.role, email: user.email, phone: user.phone },
      ipAddress,
    });

    return toUserResponse(user);
  }

  async update(
    adminId: string,
    id: string,
    dto: UpdateUserDto,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundAppException('Foydalanuvchi topilmadi');
    }

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (conflict) {
        throw new ConflictAppException('Ushbu email allaqachon mavjud');
      }
    }

    if (dto.phone && dto.phone !== user.phone) {
      const conflict = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (conflict) {
        throw new ConflictAppException('Ushbu telefon raqami allaqachon mavjud');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });

    await this.logAdminAction({
      adminId,
      action: 'UPDATE_USER',
      entityId: id,
      metadata: dto,
      ipAddress,
    });

    return toUserResponse(updated);
  }

  async remove(
    adminId: string,
    id: string,
    ipAddress?: string,
  ): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundAppException('Foydalanuvchi topilmadi');
    }

    await this.prisma.user.delete({ where: { id } });

    await this.logAdminAction({
      adminId,
      action: 'DELETE_USER',
      entityId: id,
      metadata: { email: user.email, role: user.role },
      ipAddress,
    });

    return { message: 'Foydalanuvchi muvaffaqiyatli o‘chirildi' };
  }

  async block(
    adminId: string,
    id: string,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundAppException('Foydalanuvchi topilmadi');
    }

    const [updated] = await Promise.all([
      this.prisma.user.update({
        where: { id },
        data: { status: UserStatus.BLOCKED },
      }),
      // Revoke active refresh tokens
      this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.logAdminAction({
      adminId,
      action: 'BLOCK_USER',
      entityId: id,
      ipAddress,
    });

    return toUserResponse(updated);
  }

  async unblock(
    adminId: string,
    id: string,
    ipAddress?: string,
  ): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundAppException('Foydalanuvchi topilmadi');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
    });

    await this.logAdminAction({
      adminId,
      action: 'UNBLOCK_USER',
      entityId: id,
      ipAddress,
    });

    return toUserResponse(updated);
  }
}

