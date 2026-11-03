import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Gender } from '@prisma/client';
import { PatientResponseDto } from '../../patients/dto/patient.dto.js';
export { PatientResponseDto };

export class DoctorSpecializationBriefDto {
  @ApiProperty({ example: 's1-uuid' })
  id: string;

  @ApiProperty({ example: 'Kardiologiya' })
  name: string;

  @ApiProperty({ example: 'kardiolog' })
  slug: string;
}

export class DoctorClinicBriefDto {
  @ApiProperty({ example: 'c1-uuid' })
  id: string;

  @ApiProperty({ example: 'Shox Med Center' })
  name: string;

  @ApiProperty({ example: 'Toshkent' })
  city: string;

  @ApiProperty({ example: 'Mirobod t., Oybek ko‘chasi, 12' })
  address: string;
}

export class CertificateResponseDto {
  @ApiProperty({ example: 'cert-1-uuid' })
  id: string;

  @ApiProperty({ example: 'Toshkent Tibbiyot Akademiyasi diplomi' })
  title: string;

  @ApiProperty({ example: '/uploads/diploma/cert1.pdf' })
  fileUrl: string;
}

export class DoctorResponseDto {
  @ApiProperty({ example: 'd1-uuid' })
  id: string;

  @ApiProperty({ example: 'u1-uuid' })
  userId: string;

  @ApiProperty({ example: 'Anvar' })
  firstName: string;

  @ApiProperty({ example: 'Karimov' })
  lastName: string;

  @ApiPropertyOptional({ example: '/uploads/avatars/anvar.jpg', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ type: DoctorSpecializationBriefDto })
  specialization: DoctorSpecializationBriefDto;

  @ApiProperty({ example: 's1-uuid' })
  specializationId: string;

  @ApiProperty({ example: 12 })
  experienceYears: number;

  @ApiPropertyOptional({ example: 'Oliy toifali kardiolog', nullable: true })
  bio: string | null;

  @ApiPropertyOptional({ example: 'Toshkent Tibbiyot Akademiyasi (2012)', nullable: true })
  education: string | null;

  @ApiProperty({ type: [CertificateResponseDto] })
  certificates: CertificateResponseDto[];

  @ApiProperty({ example: 200000 })
  consultationPrice: number;

  @ApiProperty({ example: 4.9 })
  rating: number;

  @ApiProperty({ example: 35 })
  reviewsCount: number;

  @ApiProperty({ type: [DoctorClinicBriefDto] })
  clinics: DoctorClinicBriefDto[];

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class CreateDoctorDto {
  @ApiProperty({ example: 'anvar.karimov@med.uz' })
  @IsNotEmpty({ message: 'Email kiritilishi shart' })
  @IsEmail({}, { message: 'Email formati noto‘g‘ri' })
  email: string;

  @ApiPropertyOptional({ example: '+998901001001' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'DocPass123!', minLength: 6 })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Anvar' })
  @IsNotEmpty({ message: 'Ism kiritilishi shart' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Karimov' })
  @IsNotEmpty({ message: 'Familiya kiritilishi shart' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'spec-uuid-1' })
  @IsNotEmpty({ message: 'Mutaxassislik ID kiritilishi shart' })
  @IsString()
  specializationId: string;

  @ApiProperty({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  experienceYears: number;

  @ApiPropertyOptional({ example: 'Oliy toifali kardiolog' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'Toshkent Tibbiyot Akademiyasi' })
  @IsString()
  @IsOptional()
  education?: string;

  @ApiProperty({ example: 200000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  consultationPrice: number;

  @ApiPropertyOptional({ example: ['clinic-uuid-1'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  clinicIds?: string[];
}

export class UpdateDoctorDto {
  @ApiPropertyOptional({ example: 'Anvar' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Karimov' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '/uploads/avatars/anvar.jpg' })
  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'spec-uuid-1' })
  @IsString()
  @IsOptional()
  specializationId?: string;

  @ApiPropertyOptional({ example: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  experienceYears?: number;

  @ApiPropertyOptional({ example: 'Oliy toifali kardiolog' })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiPropertyOptional({ example: 'Toshkent Tibbiyot Akademiyasi' })
  @IsString()
  @IsOptional()
  education?: string;

  @ApiPropertyOptional({ example: 200000 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  consultationPrice?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class DoctorsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Mutaxassislik ID bo‘yicha filtr' })
  @IsString()
  @IsOptional()
  specializationId?: string;

  @ApiPropertyOptional({ description: 'Klinika ID bo‘yicha filtr' })
  @IsString()
  @IsOptional()
  clinicId?: string;

  @ApiPropertyOptional({ description: 'Shahar bo‘yicha filtr' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Xizmat ID bo‘yicha filtr' })
  @IsString()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({ example: 50000, description: 'Minimal konsultatsiya narxi' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  minPrice?: number;

  @ApiPropertyOptional({ example: 300000, description: 'Maksimal konsultatsiya narxi' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  maxPrice?: number;

  @ApiPropertyOptional({ example: 4.5, description: 'Minimal reyting' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  minRating?: number;

  @ApiPropertyOptional({ example: '2026-11-03', description: 'Qabul sanasi bo‘yicha filtr (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  date?: string;
}

export class TimeSlotDto {
  @ApiProperty({ example: '09:00', description: 'Boshlanish vaqti (HH:mm)' })
  startTime: string;

  @ApiProperty({ example: '09:30', description: 'Tugash vaqti (HH:mm)' })
  endTime: string;

  @ApiProperty({ example: true, description: 'Bo‘shmi yoki band' })
  isAvailable: boolean;
}

export class DoctorScheduleItemDto {
  @ApiProperty({ example: 'c1-uuid', description: 'Klinika ID' })
  @IsNotEmpty()
  @IsString()
  clinicId: string;

  @ApiProperty({ example: 1, description: '1=Dushanba ... 7=Yakshanba' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @ApiProperty({ example: '09:00', description: 'Boshlanish vaqti (HH:mm)' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ example: '17:00', description: 'Tugash vaqti (HH:mm)' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ example: 30, default: 30, description: 'Slot davomiyligi (daqiqa)' })
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @IsOptional()
  slotDurationMinutes?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class DoctorScheduleResponseDto {
  @ApiProperty({ example: 'ds-1-uuid' })
  id: string;

  @ApiProperty({ example: 'd-1-uuid' })
  doctorId: string;

  @ApiProperty({ example: 'c-1-uuid' })
  clinicId: string;

  @ApiProperty({ example: 1 })
  dayOfWeek: number;

  @ApiProperty({ example: '09:00' })
  startTime: string;

  @ApiProperty({ example: '17:00' })
  endTime: string;

  @ApiProperty({ example: 30 })
  slotDurationMinutes: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class UpdateDoctorSchedulesDto {
  @ApiProperty({ type: [DoctorScheduleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DoctorScheduleItemDto)
  schedules: DoctorScheduleItemDto[];
}

export class AddCertificateDto {
  @ApiProperty({ example: 'Kardiologiya bo‘yicha xalqaro sertifikat' })
  @IsNotEmpty({ message: 'Sertifikat nomi kiritilishi shart' })
  @IsString()
  title: string;

  @ApiProperty({ example: '/uploads/diploma/cert-intl.pdf' })
  @IsNotEmpty({ message: 'Fayl URL manzili kiritilishi shart' })
  @IsString()
  fileUrl: string;
}

export class ReviewPatientBriefDto {
  @ApiProperty({ example: 'Bekzod' })
  firstName: string;

  @ApiProperty({ example: 'Toshmatov' })
  lastName: string;
}

export class ReviewResponseDto {
  @ApiProperty({ example: 'r-uuid-1' })
  id: string;

  @ApiProperty({ example: 'd-uuid-1' })
  doctorId: string;

  @ApiProperty({ example: 'p-uuid-1' })
  patientId: string;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiPropertyOptional({ example: 'Ajoyib shifokor!', nullable: true })
  comment: string | null;

  @ApiProperty({ example: '2026-11-03T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: ReviewPatientBriefDto })
  patient: ReviewPatientBriefDto;
}
