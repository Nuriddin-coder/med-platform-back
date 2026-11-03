import { Injectable } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { NotFoundAppException } from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminLogService } from './admin-log.service.js';
import {
  AdminLogResponseDto,
  AdminLogsQueryDto,
  AdminStatsResponseDto,
  AppointmentsChartPointDto,
  PermissionsResponseDto,
  PlatformSettingsResponseDto,
  UpdatePlatformSettingsDto,
  UpdateUserPermissionsDto,
  UpdateUserPermissionsResponseDto,
} from './dto/admin.dto.js';

const SYSTEM_PERMISSIONS = [
  'users:read',
  'users:write',
  'users:block',
  'doctors:manage',
  'clinics:manage',
  'appointments:manage',
  'settings:manage',
  'logs:read',
];

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
  ) {}

  private getTashkentTodayDate(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  async getStats(): Promise<AdminStatsResponseDto> {
    const today = this.getTashkentTodayDate();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalDoctors,
      totalPatients,
      totalClinics,
      todayAppointments,
      confirmedAppointments,
      cancelledAppointments,
      newUsersThisWeek,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.doctor.count({ where: { isActive: true } }),
      this.prisma.patient.count(),
      this.prisma.clinic.count({ where: { isActive: true } }),
      this.prisma.appointment.count({ where: { appointmentDate: today } }),
      this.prisma.appointment.count({
        where: { status: AppointmentStatus.CONFIRMED },
      }),
      this.prisma.appointment.count({
        where: { status: AppointmentStatus.CANCELLED },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    ]);

    return {
      totalUsers,
      totalDoctors,
      totalPatients,
      totalClinics,
      todayAppointments,
      confirmedAppointments,
      cancelledAppointments,
      newUsersThisWeek,
    };
  }

  async getAppointmentsChart(days = 30): Promise<AppointmentsChartPointDto[]> {
    const normalizedDays = Math.min(Math.max(Number(days) || 30, 1), 365);
    const dateList: string[] = [];
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const now = Date.now();
    for (let i = normalizedDays - 1; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const parts = formatter.formatToParts(d);
      const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
      dateList.push(`${map.year}-${map.month}-${map.day}`);
    }

    const startDate = dateList[0];
    const endDate = dateList[dateList.length - 1];

    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        appointmentDate: true,
        status: true,
      },
    });

    // Group in memory
    const mapByDate = new Map<
      string,
      { total: number; confirmed: number; cancelled: number }
    >();
    for (const date of dateList) {
      mapByDate.set(date, { total: 0, confirmed: 0, cancelled: 0 });
    }

    for (const app of appointments) {
      const entry = mapByDate.get(app.appointmentDate);
      if (entry) {
        entry.total++;
        if (app.status === AppointmentStatus.CONFIRMED) {
          entry.confirmed++;
        } else if (app.status === AppointmentStatus.CANCELLED) {
          entry.cancelled++;
        }
      }
    }

    return dateList.map((date) => {
      const stats = mapByDate.get(date)!;
      return {
        date,
        total: stats.total,
        confirmed: stats.confirmed,
        cancelled: stats.cancelled,
      };
    });
  }

  async getLogs(query: AdminLogsQueryDto): Promise<{
    items: AdminLogResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, action, entity, adminId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AdminLogWhereInput = {};
    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (adminId) where.adminId = adminId;

    const [items, total] = await Promise.all([
      this.prisma.adminLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.adminLog.count({ where }),
    ]);

    return {
      items: items.map((log) => ({
        id: log.id,
        adminId: log.adminId,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        metadata: log.metadata as Record<string, any> | null,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt,
        admin: {
          id: log.admin.id,
          firstName: log.admin.firstName,
          lastName: log.admin.lastName,
        },
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getSettings(): Promise<PlatformSettingsResponseDto> {
    const settings = await this.prisma.platformSetting.findMany();
    const map = new Map(settings.map((s) => [s.key, s.value]));

    return {
      platformName: map.get('platformName') || 'MED Medical Platform',
      supportPhone: map.get('supportPhone') || '+998712000000',
      supportEmail: map.get('supportEmail') || 'support@med.uz',
    };
  }

  async updateSettings(
    adminId: string,
    dto: UpdatePlatformSettingsDto,
    ipAddress?: string,
  ): Promise<PlatformSettingsResponseDto> {
    const entries = Object.entries(dto).filter(([_, v]) => v !== undefined);

    for (const [key, value] of entries) {
      if (value !== undefined) {
        await this.prisma.platformSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    await this.adminLogService.log(
      adminId,
      'UPDATE_SETTINGS',
      'PlatformSetting',
      null,
      dto,
      ipAddress,
    );

    return this.getSettings();
  }

  async getPermissions(): Promise<PermissionsResponseDto> {
    const userPermissions = await this.prisma.userPermission.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    const userMap = new Map<
      string,
      {
        userId: string;
        email: string | null;
        role: any;
        permissions: string[];
      }
    >();

    for (const up of userPermissions) {
      if (!userMap.has(up.userId)) {
        userMap.set(up.userId, {
          userId: up.userId,
          email: up.user.email,
          role: up.user.role,
          permissions: [],
        });
      }
      userMap.get(up.userId)!.permissions.push(up.permission);
    }

    return {
      permissions: SYSTEM_PERMISSIONS,
      users: Array.from(userMap.values()),
    };
  }

  async updateUserPermissions(
    adminId: string,
    targetUserId: string,
    dto: UpdateUserPermissionsDto,
    ipAddress?: string,
  ): Promise<UpdateUserPermissionsResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundAppException('Foydalanuvchi topilmadi');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({
        where: { userId: targetUserId },
      });

      if (dto.permissions && dto.permissions.length > 0) {
        await tx.userPermission.createMany({
          data: dto.permissions.map((p) => ({
            userId: targetUserId,
            permission: p,
          })),
        });
      }
    });

    await this.adminLogService.log(
      adminId,
      'UPDATE_PERMISSIONS',
      'UserPermission',
      targetUserId,
      { permissions: dto.permissions },
      ipAddress,
    );

    return {
      userId: targetUserId,
      permissions: dto.permissions,
    };
  }
}

