import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { MedicalDocumentResponseDto } from '../../medical-documents/dto/medical-document.dto.js';

export class MedicalRecordDoctorBriefDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Jasur' })
  firstName: string;

  @ApiProperty({ example: 'Karimov' })
  lastName: string;
}

export class MedicalRecordResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  patientId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  doctorId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174003',
    nullable: true,
  })
  appointmentId: string | null;

  @ApiProperty({ example: 'Gipertoniya 1-bosqich' })
  diagnosis: string;

  @ApiProperty({
    example: 'Arterial bosimning o‘rtacha ko‘tarilishi kuzatildi',
  })
  conclusion: string;

  @ApiProperty({
    example: 'Sog‘lom turmush tarzi, tuz miqdorini kamaytirish',
    nullable: true,
  })
  recommendations: string | null;

  @ApiProperty({ example: '2026-11-03T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: () => MedicalRecordDoctorBriefDto })
  doctor: MedicalRecordDoctorBriefDto;

  @ApiProperty({ type: () => [MedicalDocumentResponseDto] })
  documents: MedicalDocumentResponseDto[];
}

export class CreateMedicalRecordDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsUUID('4', { message: 'patientId yaroqli UUID bo‘lishi shart' })
  @IsNotEmpty({ message: 'patientId kiritilishi shart' })
  patientId: string;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174003',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4', { message: 'appointmentId yaroqli UUID bo‘lishi shart' })
  appointmentId?: string;

  @ApiProperty({ example: 'Gipertoniya 1-bosqich' })
  @IsString()
  @IsNotEmpty({ message: 'diagnosis kiritilishi shart' })
  diagnosis: string;

  @ApiProperty({
    example: 'Arterial bosimning o‘rtacha ko‘tarilishi kuzatildi',
  })
  @IsString()
  @IsNotEmpty({ message: 'conclusion kiritilishi shart' })
  conclusion: string;

  @ApiPropertyOptional({
    example: 'Sog‘lom turmush tarzi, tuz miqdorini kamaytirish',
  })
  @IsOptional()
  @IsString()
  recommendations?: string;
}

export class UpdateMedicalRecordDto {
  @ApiPropertyOptional({ example: 'Gipertoniya 1-bosqich, barqaror' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'Bosim ko‘rsatkichlari me’yorga qaytdi' })
  @IsOptional()
  @IsString()
  conclusion?: string;

  @ApiPropertyOptional({ example: 'Davolash rejasini davom ettirish' })
  @IsOptional()
  @IsString()
  recommendations?: string;
}

export class MedicalRecordsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID('4')
  patientId?: string;
}

