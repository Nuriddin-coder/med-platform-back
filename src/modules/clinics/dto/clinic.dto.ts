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
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { ServiceResponseDto } from '../../services/dto/service.dto.js';

export class ClinicWorkingHourItemDto {
  @ApiProperty({ example: 1, description: '1=Dushanba ... 7=Yakshanba' })
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @ApiProperty({ example: '08:00', description: 'Ochilish vaqti (HH:mm)' })
  @IsString()
  openTime: string;

  @ApiProperty({ example: '18:00', description: 'Yopilish vaqti (HH:mm)' })
  @IsString()
  closeTime: string;

  @ApiProperty({ example: false, description: 'Dam olish kunimi' })
  @IsBoolean()
  isClosed: boolean;
}

export class CreateClinicDto {
  @ApiProperty({ example: 'Shox Med Center', description: 'Klinika nomi' })
  @IsNotEmpty({ message: 'Klinika nomi kiritilishi shart' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Mirobod t., Oybek ko‘chasi, 12', description: 'Manzili' })
  @IsNotEmpty({ message: 'Manzil kiritilishi shart' })
  @IsString()
  address: string;

  @ApiProperty({ example: 'Toshkent', description: 'Shahar' })
  @IsNotEmpty({ message: 'Shahar kiritilishi shart' })
  @IsString()
  city: string;

  @ApiProperty({ example: '+998712001122', description: 'Telefon raqami' })
  @IsNotEmpty({ message: 'Telefon raqami kiritilishi shart' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ example: 'shox@med.uz', description: 'Elektron pochta' })
  @IsEmail({}, { message: 'Email formati noto‘g‘ri' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Zamonaviy ko‘p tarmoqli tibbiyot markazi', description: 'Tavsif' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '/uploads/clinics/logo.png', description: 'Logotip' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: ['/uploads/clinics/img1.jpg'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({ type: [ClinicWorkingHourItemDto], description: 'Ish vaqtlari jadvali' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicWorkingHourItemDto)
  @IsOptional()
  workingHours?: ClinicWorkingHourItemDto[];

  @ApiPropertyOptional({ example: 'u-manager-id', description: 'Boshqaruvchi ID (CLINIC_MANAGER)' })
  @IsString()
  @IsOptional()
  managerId?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateClinicDto {
  @ApiPropertyOptional({ example: 'Shox Med Center' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Mirobod t., Oybek ko‘chasi, 12' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Toshkent' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: '+998712001122' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'shox@med.uz' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Zamonaviy ko‘p tarmoqli tibbiyot markazi' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '/uploads/clinics/logo.png' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: ['/uploads/clinics/img1.jpg'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];

  @ApiPropertyOptional({ type: [ClinicWorkingHourItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicWorkingHourItemDto)
  @IsOptional()
  workingHours?: ClinicWorkingHourItemDto[];

  @ApiPropertyOptional({ example: 'u-manager-id' })
  @IsString()
  @IsOptional()
  managerId?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AddDoctorToClinicDto {
  @ApiProperty({ example: 'doc-uuid-1234', description: 'Doktor identifikatori' })
  @IsNotEmpty({ message: 'Doktor ID kiritilishi shart' })
  @IsString()
  doctorId: string;
}

export class ClinicsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Shahar bo‘yicha filtr' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'Xizmat ID bo‘yicha filtr' })
  @IsString()
  @IsOptional()
  serviceId?: string;

  @ApiPropertyOptional({ example: 4.5, description: 'Minimal reyting' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  minRating?: number;
}

export class ClinicResponseDto {
  @ApiProperty({ example: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Shox Med Center' })
  name: string;

  @ApiProperty({ example: 'Mirobod t., Oybek ko‘chasi, 12' })
  address: string;

  @ApiProperty({ example: 'Toshkent' })
  city: string;

  @ApiProperty({ example: '+998712001122' })
  phone: string;

  @ApiPropertyOptional({ example: 'shox@med.uz', nullable: true })
  email: string | null;

  @ApiPropertyOptional({ example: 'Tibbiyot markazi', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ example: '/logos/shox.png', nullable: true })
  logoUrl: string | null;

  @ApiProperty({ example: ['/images/clinic1.jpg'], type: [String] })
  imageUrls: string[];

  @ApiProperty({ type: [ClinicWorkingHourItemDto] })
  workingHours: ClinicWorkingHourItemDto[];

  @ApiProperty({ example: 4.8 })
  rating: number;

  @ApiProperty({ example: 42 })
  reviewsCount: number;

  @ApiProperty({ example: true })
  isActive: boolean;
}

export class ClinicDetailResponseDto extends ClinicResponseDto {
  @ApiProperty({ type: [ServiceResponseDto] })
  services: ServiceResponseDto[];
}
