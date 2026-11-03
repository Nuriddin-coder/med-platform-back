import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { redactSensitiveData } from '../../common/utils/redaction.util.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AdminLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    adminId: string,
    action: string,
    entity: string,
    entityId?: string | null,
    metadata?: Record<string, any> | null,
    ipAddress?: string | null,
  ) {
    try {
      const sanitizedMeta = metadata ? redactSensitiveData(metadata) : null;
      await this.prisma.adminLog.create({
        data: {
          adminId,
          action,
          entity,
          entityId: entityId ?? null,
          metadata: sanitizedMeta ? (sanitizedMeta as Prisma.InputJsonValue) : Prisma.JsonNull,
          ipAddress: ipAddress ?? null,
        },
      });
    } catch (error) {
      // Admin log should not crash main operation
      console.error('Failed to create admin log:', error);
    }
  }
}

