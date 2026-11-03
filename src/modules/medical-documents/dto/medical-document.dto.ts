import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MedicalDocumentType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class MedicalDocumentResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  patientId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  recordId: string | null;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174003' })
  uploadedById: string;

  @ApiProperty({
    enum: MedicalDocumentType,
    example: MedicalDocumentType.LAB_RESULT,
  })
  type: MedicalDocumentType;

  @ApiProperty({ example: 'Umumiy qon tahlili natijasi' })
  title: string;

  @ApiProperty({ example: 'qon_tahlili.pdf' })
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 1048576 })
  size: number;

  @ApiProperty({ example: '2026-11-03T10:00:00.000Z' })
  createdAt: Date;
}

export class CreateMedicalDocumentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID('4', { message: 'patientId yaroqli UUID bo‘lishi shart' })
  @IsNotEmpty({ message: 'patientId kiritilishi shart' })
  patientId: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174002',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'recordId yaroqli UUID bo‘lishi shart' })
  recordId?: string;

  @ApiProperty({
    enum: MedicalDocumentType,
    example: MedicalDocumentType.LAB_RESULT,
  })
  @IsEnum(MedicalDocumentType, {
    message: 'type yaroqli MedicalDocumentType bo‘lishi shart',
  })
  @IsNotEmpty({ message: 'type kiritilishi shart' })
  type: MedicalDocumentType;

  @ApiProperty({ example: 'Umumiy qon tahlili natijasi' })
  @IsString()
  @IsNotEmpty({ message: 'title kiritilishi shart' })
  title: string;
}

export class MedicalDocumentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID('4')
  patientId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsOptional()
  @IsUUID('4')
  recordId?: string;

  @ApiPropertyOptional({ enum: MedicalDocumentType })
  @IsOptional()
  @IsEnum(MedicalDocumentType)
  type?: MedicalDocumentType;
}

