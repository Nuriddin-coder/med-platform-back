import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus, MedicalDocumentType, Role } from '@prisma/client';
import * as fs from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AppException,
  ForbiddenAppException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MedicalDocumentsService } from './medical-documents.service.js';

vi.mock('fs', async () => {
  const actual: any = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    createReadStream: vi.fn().mockReturnValue({ pipe: vi.fn() }),
    promises: {
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
  };
});

describe('MedicalDocumentsService', () => {
  let service: MedicalDocumentsService;
  let prisma: any;

  const mockPatientUser = {
    id: 'user-pat-1',
  };

  const mockPatient = {
    id: 'pat-1',
    userId: 'user-pat-1',
    user: mockPatientUser,
  };

  const mockDocUser = {
    id: 'user-doc-1',
  };

  const mockDoctor = {
    id: 'doc-1',
    userId: 'user-doc-1',
  };

  const mockDocument = {
    id: 'doc-item-1',
    patientId: 'pat-1',
    recordId: null,
    uploadedById: 'user-pat-1',
    type: MedicalDocumentType.LAB_RESULT,
    title: 'Qon tahlili',
    fileName: 'qon.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    storagePath: '/mock/path/qon.pdf',
    patient: mockPatient,
  };

  beforeEach(async () => {
    prisma = {
      patient: {
        findUnique: vi.fn(),
      },
      doctor: {
        findUnique: vi.fn(),
      },
      appointment: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      medicalRecord: {
        findUnique: vi.fn(),
      },
      medicalDocument: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalDocumentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<MedicalDocumentsService>(MedicalDocumentsService);
  });

  describe('getDownloadStream (Ruxsatlar tekshiruvi)', () => {
    it('begona bemor boshqa bemorning hujjatini yuklab ola olmaydi (403 FORBIDDEN)', async () => {
      prisma.medicalDocument.findUnique.mockResolvedValue(mockDocument);

      const strangerUser = { id: 'stranger-patient-user', role: Role.PATIENT };

      await expect(
        service.getDownloadStream('doc-item-1', strangerUser),
      ).rejects.toThrow(ForbiddenAppException);
    });

    it('begona shifokor (bemor bilan qabuli yo‘q) hujjatni yuklab ola olmaydi (403 FORBIDDEN)', async () => {
      prisma.medicalDocument.findUnique.mockResolvedValue(mockDocument);
      prisma.doctor.findUnique.mockResolvedValue({ id: 'doc-stranger', userId: 'user-doc-stranger' });
      // No confirmed/completed appointment
      prisma.appointment.findFirst.mockResolvedValue(null);

      const strangerDoctor = { id: 'user-doc-stranger', role: Role.DOCTOR };

      await expect(
        service.getDownloadStream('doc-item-1', strangerDoctor),
      ).rejects.toThrow(ForbiddenAppException);
    });

    it('hujjat egasi bo‘lgan bemor o‘z hujjatini yuklab ola oladi', async () => {
      prisma.medicalDocument.findUnique.mockResolvedValue(mockDocument);

      const ownerUser = { id: 'user-pat-1', role: Role.PATIENT };
      const result = await service.getDownloadStream('doc-item-1', ownerUser);

      expect(result).toBeDefined();
      expect(result.fileName).toBe('qon.pdf');
    });

    it('bemor bilan tasdiqlangan qabuli bo‘lgan shifokor hujjatni yuklab ola oladi', async () => {
      prisma.medicalDocument.findUnique.mockResolvedValue(mockDocument);
      prisma.doctor.findUnique.mockResolvedValue(mockDoctor);
      prisma.appointment.findFirst.mockResolvedValue({
        id: 'app-1',
        status: AppointmentStatus.CONFIRMED,
      });

      const treatedDoctor = { id: 'user-doc-1', role: Role.DOCTOR };
      const result = await service.getDownloadStream('doc-item-1', treatedDoctor);

      expect(result).toBeDefined();
      expect(result.fileName).toBe('qon.pdf');
    });
  });

  describe('Fayl validatsiyasi', () => {
    it('yaroqsiz magic-bytes bo‘lgan fayl rad etiladi (FILE_INVALID)', async () => {
      const fakeFile: any = {
        buffer: Buffer.from('NOT A REAL PDF FILE'),
        mimetype: 'application/pdf',
        size: 50,
        originalname: 'fake.pdf',
      };

      const user = { id: 'user-pat-1', role: Role.PATIENT };
      const dto = {
        patientId: 'pat-1',
        type: MedicalDocumentType.LAB_RESULT,
        title: 'Tahlil',
      };

      await expect(service.create(user, dto, fakeFile)).rejects.toThrow(
        AppException,
      );
    });
  });
});

