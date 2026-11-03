import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsReminderService } from './appointments-reminder.service.js';
import { AppointmentsService } from './appointments.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentsReminderService],
  exports: [AppointmentsService, AppointmentsReminderService],
})
export class AppointmentsModule {}
