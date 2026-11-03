import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    if (process.env.SKIP_DB_CONNECT === 'true') {
      return;
    }

    // Connect in background to avoid blocking server boot when DB is starting up
    this.$connect()
      .then(() => {
        this.logger.log('Database connected successfully');
      })
      .catch((err) => {
        this.logger.warn(`Database connection warning: ${err.message}. Ensure PostgreSQL is running.`);
      });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
