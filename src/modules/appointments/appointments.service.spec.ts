import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus, NotificationType, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ConflictAppException,
  ForbiddenAppException,
  SlotAlreadyBookedException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AppointmentsReminderService } from './appointments-reminder.service.js';
import { AppointmentsService } from './appointments.service.js';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let reminderService: AppointmentsReminderService;
  let prisma: any;
  let notificationsService: any;

  const mockDoctor = {
    id: 'doc-uuid-1',
    userId: 'doc-user-1',
    isActive: true,
    user: {
      id: 'doc-user-1',
      firstName: 'Jasur',
      lastName: 'Karimov',
      avatarUrl: null,
    },
    specialization: {
      id: 'spec-uuid-1',
      name: 'Kardiologiya',
    },
  };

  const mockClinic = {
    id: 'clinic-uuid-1',
    name: 'Shox Med',
    address: 'Oybek ko‘chasi, 12',
    managerId: 'manager-user-1',
    isActive: true,
  };

  const mockPatient = {
    id: 'pat-uuid-1',
    userId: 'pat-user-1',
    user: {
      id: 'pat-user-1',
      firstName: 'Ali',
      lastName: 'Valiyev',
      phone: '+998901234567',
    },
  };

  const mockSchedule = {
    id: 'sched-uuid-1',
    doctorId: 'doc-uuid-1',
    clinicId: 'clinic-uuid-1',
    dayOfWeek: 1, // Monday
    startTime: '09:00',
    endTime: '18:00',
    slotDurationMinutes: 30,
    isActive: true,
  };

  beforeEach(async () => {
    prisma = {
      patient: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      doctor: {
        findUnique: vi.fn(),
      },
      clinic: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      doctorSchedule: {
        findFirst: vi.fn(),
      },
      appointment: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      notification: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    };

    notificationsService = {
      createNotification: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        AppointmentsReminderService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    reminderService = module.get<AppointmentsReminderService>(
      AppointmentsReminderService,
    );
  });

  describe('Parallel Concurrency Booking (Promise.all)', () => {
    it('should only allow 1 booking to succeed and fail 4 with SlotAlreadyBookedException (409)', async () => {
      // Setup mock data for future Monday
      const futureDate = '2026-11-09'; // Monday

      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.clinic.findUnique.mockResolvedValue(mockClinic);
      prisma.doctorSchedule.findFirst.mockResolvedValue(mockSchedule);

      let bookingAttempts = 0;
      prisma.$transaction.mockImplementation(async (cb: any) => {
        bookingAttempts++;
        if (bookingAttempts === 1) {
          // First attempt succeeds
          return {
            id: 'app-uuid-1',
            patientId: mockPatient.id,
            doctorId: mockDoctor.id,
            clinicId: mockClinic.id,
            serviceId: null,
            appointmentDate: futureDate,
            startTime: '10:00',
            endTime: '10:30',
            reason: 'Checkup',
            status: AppointmentStatus.PENDING,
            cancelReason: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            patient: mockPatient,
            doctor: mockDoctor,
            clinic: mockClinic,
          };
        } else {
          // Parallel attempts hit unique constraint (P2002) or slot already booked
          const error: any = new Error('Unique constraint failed on uniq_active_appointment_slot');
          error.code = 'P2002';
          throw error;
        }
      });

      const dto = {
        doctorId: mockDoctor.id,
        clinicId: mockClinic.id,
        appointmentDate: futureDate,
        startTime: '10:00',
      };

      const user = { id: mockPatient.userId, role: Role.PATIENT };

      // Fire 5 concurrent booking requests
      const promises = Array.from({ length: 5 }, () =>
        service.create(user, dto),
      );

      const results = await Promise.allSettled(promises);

      const fulfilled = results.filter((r) => r.status === 'fulfilled');
      const rejected = results.filter((r) => r.status === 'rejected');

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(4);

      for (const rej of rejected) {
        if (rej.status === 'rejected') {
          expect(rej.reason).toBeInstanceOf(SlotAlreadyBookedException);
          expect(rej.reason.getStatus()).toBe(409);
        }
      }
    });
  });

  describe('Permission checks', () => {
    it('patient cannot view another patient’s appointment (403 FORBIDDEN)', async () => {
      const mockApp = {
        id: 'app-uuid-1',
        patient: { id: 'p1', user: { id: 'other-user' } },
        doctor: { id: 'd1', user: { id: 'doc-user' } },
        clinic: { id: 'c1', managerId: 'manager-user' },
      };

      prisma.appointment.findUnique.mockResolvedValue(mockApp);

      const currentUser = { id: 'unauthorized-user', role: Role.PATIENT };

      await expect(
        service.findOne('app-uuid-1', currentUser),
      ).rejects.toThrow(ForbiddenAppException);
    });

    it('patient cannot reschedule another patient’s appointment', async () => {
      const mockApp = {
        id: 'app-uuid-1',
        patient: { id: 'p1', user: { id: 'other-user' } },
        doctor: { id: 'd1', user: { id: 'doc-user' } },
        status: AppointmentStatus.PENDING,
      };

      prisma.appointment.findUnique.mockResolvedValue(mockApp);

      const currentUser = { id: 'attacker-user', role: Role.PATIENT };

      await expect(
        service.reschedule(
          'app-uuid-1',
          { appointmentDate: '2026-11-09', startTime: '11:00' },
          currentUser,
        ),
      ).rejects.toThrow(ForbiddenAppException);
    });

    it('unauthorized user cannot confirm appointment', async () => {
      const mockApp = {
        id: 'app-uuid-1',
        patient: { id: 'p1', user: { id: 'pat-user' } },
        doctor: { id: 'd1', user: { id: 'doc-user' } },
        status: AppointmentStatus.PENDING,
      };

      prisma.appointment.findUnique.mockResolvedValue(mockApp);

      const currentUser = { id: 'other-doctor-user', role: Role.DOCTOR };

      await expect(
        service.confirm('app-uuid-1', currentUser),
      ).rejects.toThrow(ForbiddenAppException);
    });
  });

  describe('Status transition rules', () => {
    it('confirm fails with 409 CONFLICT if status is not PENDING', async () => {
      const mockApp = {
        id: 'app-uuid-1',
        doctor: { user: { id: 'doc-user' } },
        patient: { user: { id: 'pat-user' } },
        status: AppointmentStatus.CONFIRMED,
      };

      prisma.appointment.findUnique.mockResolvedValue(mockApp);

      const currentUser = { id: 'doc-user', role: Role.DOCTOR };

      await expect(
        service.confirm('app-uuid-1', currentUser),
      ).rejects.toThrow(ConflictAppException);
    });

    it('reject fails with 409 CONFLICT if status is already CONFIRMED', async () => {
      const mockApp = {
        id: 'app-uuid-1',
        doctor: { user: { id: 'doc-user' } },
        patient: { user: { id: 'pat-user' } },
        status: AppointmentStatus.CONFIRMED,
      };

      prisma.appointment.findUnique.mockResolvedValue(mockApp);

      const currentUser = { id: 'doc-user', role: Role.DOCTOR };

      await expect(
        service.reject('app-uuid-1', {}, currentUser),
      ).rejects.toThrow(ConflictAppException);
    });

    it('complete fails with 409 CONFLICT if status is PENDING (must be CONFIRMED)', async () => {
      const mockApp = {
        id: 'app-uuid-1',
        doctor: { user: { id: 'doc-user' } },
        patient: { user: { id: 'pat-user' } },
        status: AppointmentStatus.PENDING,
      };

      prisma.appointment.findUnique.mockResolvedValue(mockApp);

      const currentUser = { id: 'doc-user', role: Role.DOCTOR };

      await expect(
        service.complete('app-uuid-1', currentUser),
      ).rejects.toThrow(ConflictAppException);
    });

    it('cancel fails with 409 CONFLICT if status is already COMPLETED', async () => {
      const mockApp = {
        id: 'app-uuid-1',
        patient: { user: { id: 'pat-user' } },
        doctor: { user: { id: 'doc-user' } },
        status: AppointmentStatus.COMPLETED,
      };

      prisma.appointment.findUnique.mockResolvedValue(mockApp);

      const currentUser = { id: 'pat-user', role: Role.PATIENT };

      await expect(
        service.cancel('app-uuid-1', {}, currentUser),
      ).rejects.toThrow(ConflictAppException);
    });
  });

  describe('AppointmentsReminderService (Cron & De-duplication)', () => {
    it('sends reminder for tomorrow CONFIRMED appointments and does not duplicate', async () => {
      const targetDate = '2026-11-10';
      const mockConfirmedApp = {
        id: 'app-remind-1',
        appointmentDate: targetDate,
        startTime: '14:00',
        status: AppointmentStatus.CONFIRMED,
        patient: { user: { id: 'patient-user-1' } },
        doctor: { user: { firstName: 'Jasur', lastName: 'Karimov' } },
      };

      prisma.appointment.findMany.mockResolvedValue([mockConfirmedApp]);
      // First run: no existing notification
      prisma.notification.findMany.mockResolvedValue([]);

      const sentCount = await reminderService.sendRemindersForDate(targetDate);
      expect(sentCount).toBe(1);
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        'patient-user-1',
        NotificationType.APPOINTMENT_REMINDER,
        'Ertangi qabul eslatmasi',
        expect.stringContaining('Jasur Karimov'),
        { appointmentId: 'app-remind-1' },
      );

      // Second run: existing notification already present
      prisma.notification.findMany.mockResolvedValue([
        {
          userId: 'patient-user-1',
          type: NotificationType.APPOINTMENT_REMINDER,
          data: { appointmentId: 'app-remind-1' },
        },
      ]);

      notificationsService.createNotification.mockClear();
      const secondSentCount = await reminderService.sendRemindersForDate(targetDate);
      expect(secondSentCount).toBe(0);
      expect(notificationsService.createNotification).not.toHaveBeenCalled();
    });
  });
});

