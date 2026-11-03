import { HttpStatus, Injectable } from '@nestjs/common';
import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { ErrorCodes } from '../../common/constants/error-codes.js';
import {
  AppException,
  ConflictAppException,
  ForbiddenAppException,
  NotFoundAppException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateMedicalDocumentDto,
  MedicalDocumentResponseDto,
  MedicalDocumentsQueryDto,
} from './dto/medical-document.dto.js';

interface UploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class MedicalDocumentsService {
  private readonly storageDir: string;

  constructor(private readonly prisma: PrismaService) {
    this.storageDir = path.resolve(process.cwd(), 'storage', 'medical-documents');
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private validateFile(file: UploadedMulterFile) {
    if (!file || !file.buffer) {
      throw new AppException(
        ErrorCodes.FILE_INVALID,
        'Fayl yuklanmadi',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 10MB limit
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new AppException(
        ErrorCodes.FILE_INVALID,
        'Fayl hajmi 10MB dan oshmasligi kerak',
        HttpStatus.BAD_REQUEST,
      );
    }

    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new AppException(
        ErrorCodes.FILE_INVALID,
        'Faqat PDF, JPG va PNG formatidagi fayllar qabul qilinadi',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Magic bytes verification
    const buffer = file.buffer;
    let isValid = false;

    // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      isValid = file.mimetype === 'application/pdf';
    }
    // JPEG magic bytes: 0xFF 0xD8 0xFF
    else if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      isValid = file.mimetype === 'image/jpeg';
    }
    // PNG magic bytes: 0x89 0x50 0x4E 0x47
    else if (
      buffer.length >= 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      isValid = file.mimetype === 'image/png';
    }

    if (!isValid) {
      throw new AppException(
        ErrorCodes.FILE_INVALID,
        'Fayl mazmuni uning ko‘rsatilgan MIME turiga mos kelmadi',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async create(
    currentUser: { id: string; role: Role },
    dto: CreateMedicalDocumentDto,
    file: UploadedMulterFile,
  ): Promise<MedicalDocumentResponseDto> {
    this.validateFile(file);

    // 1. Patient check
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      include: { user: true },
    });
    if (!patient) {
      throw new NotFoundAppException('Bemor topilmadi');
    }

    // 2. Authorization check
    if (currentUser.role === Role.PATIENT) {
      if (patient.userId !== currentUser.id) {
        throw new ForbiddenAppException(
          'Bemor faqat o‘zining profili uchun hujjat yuklay oladi',
        );
      }
    } else if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.id },
      });
      if (!doctor) {
        throw new ForbiddenAppException('Shifokor profili topilmadi');
      }

      const hasValidAppointment = await this.prisma.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          patientId: dto.patientId,
          status: {
            in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
          },
        },
      });

      if (!hasValidAppointment) {
        throw new ForbiddenAppException(
          'Ushbu bemor bilan tasdiqlangan yoki yakunlangan qabulingiz bo‘lishi shart',
        );
      }
    }

    // 3. Optional record check
    if (dto.recordId) {
      const record = await this.prisma.medicalRecord.findUnique({
        where: { id: dto.recordId },
      });
      if (!record) {
        throw new NotFoundAppException('Tibbiy yozuv topilmadi');
      }
      if (record.patientId !== dto.patientId) {
        throw new ConflictAppException(
          'Tibbiy yozuv ko‘rsatilgan bemorga tegishli emas',
        );
      }
    }

    // 4. Save file to disk
    const extension = path.extname(file.originalname) || (file.mimetype === 'application/pdf' ? '.pdf' : '.jpg');
    const safeDiskFileName = `${randomUUID()}${extension}`;
    const storagePath = path.join(this.storageDir, safeDiskFileName);

    await fs.promises.writeFile(storagePath, file.buffer);

    // 5. Create DB record
    const document = await this.prisma.medicalDocument.create({
      data: {
        patientId: dto.patientId,
        recordId: dto.recordId ?? null,
        uploadedById: currentUser.id,
        type: dto.type,
        title: dto.title,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath,
      },
    });

    return this.mapToResponse(document);
  }

  async findAll(
    currentUser: { id: string; role: Role },
    query: MedicalDocumentsQueryDto,
  ): Promise<{
    items: MedicalDocumentResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, patientId, recordId, type } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.MedicalDocumentWhereInput = {};

    if (currentUser.role === Role.PATIENT) {
      const patient = await this.prisma.patient.findUnique({
        where: { userId: currentUser.id },
      });
      if (!patient) {
        return { items: [], total: 0, page, limit, totalPages: 1 };
      }
      where.patientId = patient.id;
    } else if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.id },
      });
      if (!doctor) {
        return { items: [], total: 0, page, limit, totalPages: 1 };
      }

      if (patientId) {
        const hasAppointment = await this.prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            patientId,
            status: {
              in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
            },
          },
        });
        if (!hasAppointment) {
          throw new ForbiddenAppException(
            'Ushbu bemor bilan tasdiqlangan yoki yakunlangan qabulingiz mavjud emas',
          );
        }
        where.patientId = patientId;
      } else {
        const treated = await this.prisma.appointment.findMany({
          where: {
            doctorId: doctor.id,
            status: {
              in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
            },
          },
          select: { patientId: true },
        });
        const treatedPatientIds = Array.from(new Set(treated.map((t) => t.patientId)));
        where.OR = [
          { uploadedById: currentUser.id },
          { patientId: { in: treatedPatientIds } },
        ];
      }
    } else if (patientId) {
      where.patientId = patientId;
    }

    if (recordId) {
      where.recordId = recordId;
    }
    if (type) {
      where.type = type;
    }

    const [items, total] = await Promise.all([
      this.prisma.medicalDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.medicalDocument.count({ where }),
    ]);

    return {
      items: items.map((doc) => this.mapToResponse(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getDownloadStream(
    id: string,
    currentUser: { id: string; role: Role },
  ): Promise<{
    stream: fs.ReadStream;
    fileName: string;
    mimeType: string;
    size: number;
  }> {
    const doc = await this.prisma.medicalDocument.findUnique({
      where: { id },
      include: {
        patient: {
          include: { user: true },
        },
      },
    });

    if (!doc) {
      throw new NotFoundAppException('Hujjat topilmadi');
    }

    // Access check
    let allowed = false;

    if (
      currentUser.role === Role.ADMIN ||
      currentUser.role === Role.SUPER_ADMIN ||
      doc.uploadedById === currentUser.id
    ) {
      allowed = true;
    } else if (
      currentUser.role === Role.PATIENT &&
      doc.patient.user.id === currentUser.id
    ) {
      allowed = true;
    } else if (currentUser.role === Role.DOCTOR) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: currentUser.id },
      });
      if (doctor) {
        const hasAppointment = await this.prisma.appointment.findFirst({
          where: {
            doctorId: doctor.id,
            patientId: doc.patientId,
            status: {
              in: [AppointmentStatus.CONFIRMED, AppointmentStatus.COMPLETED],
            },
          },
        });
        if (hasAppointment) {
          allowed = true;
        }
      }
    }

    if (!allowed) {
      throw new ForbiddenAppException(
        'Ushbu hujjatni yuklab olish uchun ruxsat berilmagan',
      );
    }

    if (!fs.existsSync(doc.storagePath)) {
      throw new NotFoundAppException('Hujjat fayli diskda topilmadi');
    }

    return {
      stream: fs.createReadStream(doc.storagePath),
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.size,
    };
  }

  async delete(
    id: string,
    currentUser: { id: string; role: Role },
  ): Promise<{ message: string }> {
    const doc = await this.prisma.medicalDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new NotFoundAppException('Hujjat topilmadi');
    }

    const canDelete =
      currentUser.role === Role.ADMIN ||
      currentUser.role === Role.SUPER_ADMIN ||
      doc.uploadedById === currentUser.id;

    if (!canDelete) {
      throw new ForbiddenAppException(
        'Faqat hujjat muallifi yoki administrator o‘chira oladi',
      );
    }

    if (fs.existsSync(doc.storagePath)) {
      try {
        fs.unlinkSync(doc.storagePath);
      } catch {}
    }

    await this.prisma.medicalDocument.delete({ where: { id } });

    return { message: 'Hujjat muvaffaqiyatli o‘chirildi' };
  }

  mapToResponse(doc: any): MedicalDocumentResponseDto {
    return {
      id: doc.id,
      patientId: doc.patientId,
      recordId: doc.recordId ?? null,
      uploadedById: doc.uploadedById,
      type: doc.type,
      title: doc.title,
      fileName: doc.fileName,
      mimeType: doc.mimeType,
      size: doc.size,
      createdAt: doc.createdAt,
    };
  }
}

