import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppointmentStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class AppointmentsReminderService {
  private readonly logger = new Logger(AppointmentsReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getTomorrowTashkentDate(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const now = new Date();
    // Add 24 hours to current time
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const parts = formatter.formatToParts(tomorrow);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: 'send-appointment-reminders',
    timeZone: 'Asia/Tashkent',
  })
  async handleDailyReminders() {
    this.logger.log('Running daily appointment reminders cron job...');
    const count = await this.sendRemindersForDate();
    this.logger.log(`Sent ${count} appointment reminder notifications.`);
  }

  async sendRemindersForDate(targetDate?: string): Promise<number> {
    const date = targetDate || this.getTomorrowTashkentDate();

    // 1. Find all CONFIRMED appointments for target date
    const appointments = await this.prisma.appointment.findMany({
      where: {
        appointmentDate: date,
        status: AppointmentStatus.CONFIRMED,
      },
      include: {
        patient: {
          include: {
            user: true,
          },
        },
        doctor: {
          include: {
            user: true,
          },
        },
      },
    });

    let sentCount = 0;

    for (const app of appointments) {
      const patientUserId = app.patient.user.id;

      // 2. De-duplication check: has an APPOINTMENT_REMINDER notification already been sent for this appointment?
      const existingNotifications = await this.prisma.notification.findMany({
        where: {
          userId: patientUserId,
          type: NotificationType.APPOINTMENT_REMINDER,
        },
      });

      const alreadySent = existingNotifications.some(
        (n) => (n.data as any)?.appointmentId === app.id,
      );

      if (!alreadySent) {
        await this.notificationsService.createNotification(
          patientUserId,
          NotificationType.APPOINTMENT_REMINDER,
          'Ertangi qabul eslatmasi',
          `Eslatma: Ertaga ${app.appointmentDate} soat ${app.startTime} da shifokor ${app.doctor.user.firstName} ${app.doctor.user.lastName} qabuliga yozilgansiz.`,
          { appointmentId: app.id },
        );
        sentCount++;
      }
    }

    return sentCount;
  }
}

