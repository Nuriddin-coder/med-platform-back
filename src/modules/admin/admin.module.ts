import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminLogService } from './admin-log.service.js';
import { AdminService } from './admin.service.js';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminLogService],
  exports: [AdminService, AdminLogService],
})
export class AdminModule {}
