import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class PatientResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  userId: string;

  @ApiProperty({ example: 'Bekzod' })
  firstName: string;

  @ApiProperty({ example: 'Toshmatov' })
  lastName: string;

  @ApiProperty({ example: '1992-05-14T00:00:00.000Z', nullable: true })
  birthDate: Date | null;

  @ApiProperty({ enum: Gender, example: Gender.MALE, nullable: true })
  gender: Gender | null;

  @ApiProperty({ example: '+998902002001', nullable: true })
  phone: string | null;

  @ApiProperty({ example: 'bekzod.patient@gmail.com', nullable: true })
  email: string | null;

  @ApiProperty({ example: 'Toshkent sh., Chilonzor t., 19-mavze', nullable: true })
  address: string | null;

  @ApiProperty({ example: '/uploads/avatar/bekzod.jpg', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: 'A(II) Rh+', nullable: true })
  bloodType: string | null;

  @ApiProperty({ example: 'Penitsillin', nullable: true })
  allergies: string | null;
}

export class UpdatePatientDto {
  @ApiPropertyOptional({ example: 'Bekzod' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Toshmatov' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '1992-05-14' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '+998902002001' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'bekzod.patient@gmail.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Toshkent sh., Chilonzor t., 19-mavze' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '/uploads/avatar/bekzod.jpg' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'A(II) Rh+' })
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiPropertyOptional({ example: 'Penitsillin' })
  @IsOptional()
  @IsString()
  allergies?: string;
}

export class PatientsQueryDto extends PaginationQueryDto {}

