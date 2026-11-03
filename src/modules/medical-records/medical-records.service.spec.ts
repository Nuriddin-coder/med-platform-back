import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus, Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MedicalRecordsService } from './medical-records.service.js';

describe('MedicalRecordsService', () => {
  let service: MedicalRecordsService;
  let prisma: any;

  const mockDoctor = {
    id: 'doc-uuid-1',
    userId: 'doc-user-1',
    user: {
      id: 'doc-user-1',
      firstName: 'Jasur',
      lastName: 'Karimov',
    },
  };

  const mockPatient = {
    id: 'pat-uuid-1',
    userId: 'pat-user-1',
    user: {
      id: 'pat-user-1',
      firstName: 'Ali',
      lastName: 'Valiyev',
    },
  };

  beforeEach(async () => {
    prisma = {
      doctor: {
        findUnique: vi.fn(),
      },
      patient: {
        findUnique: vi.fn(),
      },
      appointment: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      medicalRecord: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalRecordsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MedicalRecordsService>(MedicalRecordsService);
  });

  describe('create (Doctor permission check)', () => {
    it('doktor ruxsatsiz (qabuli yo‘q) bemorga yozuv yarata olmaydi (403 FORBIDDEN)', async () => {
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      // No confirmed or completed appointment exists
      prisma.appointment.findFirst.mockResolvedValue(null);

      const user = { id: mockDoctor.userId, role: Role.DOCTOR };
      const dto = {
        patientId: mockPatient.id,
        diagnosis: 'Gripp',
        conclusion: 'Dam olish',
      };

      await expect(service.create(user, dto)).rejects.toThrow(
        ForbiddenAppException,
      );
    });

    it('doktor tasdiqlangan/yakunlangan qabuli bor bemorga yozuv yarata oladi', async () => {
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.patient.findUnique.mockResolvedValue(mockPatient);
      prisma.appointment.findFirst.mockResolvedValue({
        id: 'app-1',
        doctorId: mockDoctor.id,
        patientId: mockPatient.id,
        status: AppointmentStatus.COMPLETED,
      });

      const createdRecord = {
        id: 'rec-1',
        patientId: mockPatient.id,
        doctorId: mockDoctor.id,
        appointmentId: null,
        diagnosis: 'Gripp',
        conclusion: 'Dam olish tavsiya etildi',
        recommendations: 'Ko‘p suyuqlik ichish',
        createdAt: new Date(),
        doctor: mockDoctor,
        documents: [],
      };

      prisma.medicalRecord.create.mockResolvedValue(createdRecord);

      const user = { id: mockDoctor.userId, role: Role.DOCTOR };
      const dto = {
        patientId: mockPatient.id,
        diagnosis: 'Gripp',
        conclusion: 'Dam olish tavsiya etildi',
        recommendations: 'Ko‘p suyuqlik ichish',
      };

      const result = await service.create(user, dto);
      expect(result.id).toBe('rec-1');
      expect(result.diagnosis).toBe('Gripp');
      expect(result.doctor.firstName).toBe('Jasur');
    });
  });

  describe('update (Author doctor only)', () => {
    it('boshqa shifokor begona shifokor yozuvini tahrirlay olmaydi (403 FORBIDDEN)', async () => {
      const existingRecord = {
        id: 'rec-1',
        doctorId: 'doc-uuid-1',
        doctor: { userId: 'doc-user-1' },
      };

      prisma.medicalRecord.findUnique.mockResolvedValue(existingRecord);
      prisma.doctor.findUnique.mockResolvedValue({
        id: 'doc-uuid-2',
        userId: 'other-doc-user',
      });

      const user = { id: 'other-doc-user', role: Role.DOCTOR };
      await expect(
        service.update('rec-1', { diagnosis: 'Yangi tashxis' }, user),
      ).rejects.toThrow(ForbiddenAppException);
    });
  });
});

