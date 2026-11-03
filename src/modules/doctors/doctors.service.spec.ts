import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus, UserStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DoctorsService } from './doctors.service.js';

describe('DoctorsService', () => {
  let service: DoctorsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      doctor: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      doctorSchedule: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      appointment: {
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      specialization: {
        findUnique: vi.fn(),
      },
      clinicDoctor: {
        create: vi.fn(),
      },
      review: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      patient: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      doctorCertificate: {
        create: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
  });

  describe('findAll (filtering & search)', () => {
    it('should query doctors with search and specialization filter', async () => {
      const mockDoctors = [
        {
          id: 'doc-1',
          userId: 'u-1',
          user: { firstName: 'Anvar', lastName: 'Karimov', avatarUrl: null, status: UserStatus.ACTIVE },
          specialization: { id: 'spec-1', name: 'Kardiologiya', slug: 'kardiolog' },
          specializationId: 'spec-1',
          experienceYears: 10,
          bio: 'Bio',
          education: 'Edu',
          certificates: [],
          consultationPrice: 200000,
          rating: 4.9,
          reviewsCount: 15,
          clinics: [{ clinic: { id: 'c-1', name: 'Shox Med', city: 'Toshkent', address: 'Oybek' } }],
          isActive: true,
        },
      ];

      prisma.doctor.findMany.mockResolvedValue(mockDoctors);
      prisma.doctor.count.mockResolvedValue(1);

      const result = await service.findAll({
        search: 'Anvar',
        specializationId: 'spec-1',
        minPrice: 100000,
        maxPrice: 300000,
        minRating: 4.5,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].firstName).toBe('Anvar');
      expect(result.meta.total).toBe(1);

      expect(prisma.doctor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            specializationId: 'spec-1',
            consultationPrice: { gte: 100000, lte: 300000 },
            rating: { gte: 4.5 },
          }),
        }),
      );
    });
  });

  describe('getSlots (slot calculation)', () => {
    it('should return empty array if doctor has no schedule for the day', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 'doc-1' });
      prisma.doctorSchedule.findFirst.mockResolvedValue(null);

      const slots = await service.getSlots('doc-1', '2026-11-03', 'clinic-1');
      expect(slots).toEqual([]);
    });

    it('should generate slots and mark booked ones as unavailable', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 'doc-1' });

      // Tuesday (2026-11-03 is Tuesday, dayOfWeek=2)
      prisma.doctorSchedule.findFirst.mockResolvedValue({
        doctorId: 'doc-1',
        clinicId: 'clinic-1',
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '11:00',
        slotDurationMinutes: 30,
        isActive: true,
      });

      // 09:30 slot is booked
      prisma.appointment.findMany.mockResolvedValue([
        { startTime: '09:30', status: AppointmentStatus.CONFIRMED },
      ]);

      // Future date e.g. 2099-01-06 (a Tuesday) to avoid past-time marking
      const slots = await service.getSlots('doc-1', '2099-01-06', 'clinic-1');

      // 09:00 to 11:00 with 30 min duration -> 4 slots:
      // 09:00 - 09:30 (available: true)
      // 09:30 - 10:00 (available: false, booked)
      // 10:00 - 10:30 (available: true)
      // 10:30 - 11:00 (available: true)
      expect(slots).toHaveLength(4);

      expect(slots[0]).toEqual({
        startTime: '09:00',
        endTime: '09:30',
        isAvailable: true,
      });

      expect(slots[1]).toEqual({
        startTime: '09:30',
        endTime: '10:00',
        isAvailable: false,
      });

      expect(slots[2]).toEqual({
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true,
      });

      expect(slots[3]).toEqual({
        startTime: '10:30',
        endTime: '11:00',
        isAvailable: true,
      });
    });

    it('should mark past date slots as isAvailable: false', async () => {
      prisma.doctor.findUnique.mockResolvedValue({ id: 'doc-1' });

      prisma.doctorSchedule.findFirst.mockResolvedValue({
        doctorId: 'doc-1',
        clinicId: 'clinic-1',
        dayOfWeek: 2,
        startTime: '09:00',
        endTime: '10:00',
        slotDurationMinutes: 30,
        isActive: true,
      });

      prisma.appointment.findMany.mockResolvedValue([]);

      // 2020-01-07 was a Tuesday in the past
      const slots = await service.getSlots('doc-1', '2020-01-07', 'clinic-1');

      expect(slots).toHaveLength(2);
      expect(slots[0].isAvailable).toBe(false);
      expect(slots[1].isAvailable).toBe(false);
    });
  });
});

