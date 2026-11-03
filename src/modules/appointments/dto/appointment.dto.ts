import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentStatus } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class AppointmentPatientBriefDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Ali' })
  firstName: string;

  @ApiProperty({ example: 'Valiyev' })
  lastName: string;

  @ApiProperty({ example: '+998901234567', nullable: true })
  phone: string | null;
}

export class AppointmentDoctorSpecializationBriefDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Kardiologiya' })
  name: string;
}

export class AppointmentDoctorBriefDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Dr. Jasur' })
  firstName: string;

  @ApiProperty({ example: 'Karimov' })
  lastName: string;

  @ApiProperty({ example: '/uploads/avatar/jasur.jpg', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ type: () => AppointmentDoctorSpecializationBriefDto })
  specialization: AppointmentDoctorSpecializationBriefDto;
}

export class AppointmentClinicBriefDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Shox Med Center' })
  name: string;

  @ApiProperty({ example: 'Mirobod t., Oybek ko‘chasi, 12' })
  address: string;
}

export class AppointmentResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  patientId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  doctorId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174003' })
  clinicId: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174004',
    nullable: true,
  })
  serviceId: string | null;

  @ApiProperty({ example: '2026-11-10' })
  appointmentDate: string;

  @ApiProperty({ example: '09:00' })
  startTime: string;

  @ApiProperty({ example: '09:30' })
  endTime: string;

  @ApiProperty({ example: 'Bosh og‘rig‘i bo‘yicha maslahat', nullable: true })
  reason: string | null;

  @ApiProperty({ enum: AppointmentStatus, example: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @ApiProperty({ example: null, nullable: true })
  cancelReason: string | null;

  @ApiProperty({ example: '2026-11-03T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-11-03T10:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ type: () => AppointmentPatientBriefDto })
  patient: AppointmentPatientBriefDto;

  @ApiProperty({ type: () => AppointmentDoctorBriefDto })
  doctor: AppointmentDoctorBriefDto;

  @ApiProperty({ type: () => AppointmentClinicBriefDto })
  clinic: AppointmentClinicBriefDto;
}

export class CreateAppointmentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsUUID('4', { message: 'doctorId yaroqli UUID bo‘lishi shart' })
  @IsNotEmpty({ message: 'doctorId kiritilishi shart' })
  doctorId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174003' })
  @IsUUID('4', { message: 'clinicId yaroqli UUID bo‘lishi shart' })
  @IsNotEmpty({ message: 'clinicId kiritilishi shart' })
  clinicId: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174004' })
  @IsOptional()
  @IsUUID('4', { message: 'serviceId yaroqli UUID bo‘lishi shart' })
  serviceId?: string;

  @ApiProperty({ example: '2026-11-10' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'appointmentDate formati YYYY-MM-DD bo‘lishi shart',
  })
  @IsNotEmpty({ message: 'appointmentDate kiritilishi shart' })
  appointmentDate: string;

  @ApiProperty({ example: '09:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime formati HH:mm bo‘lishi shart',
  })
  @IsNotEmpty({ message: 'startTime kiritilishi shart' })
  startTime: string;

  @ApiPropertyOptional({ example: 'Bosh og‘rig‘i bo‘yicha maslahat' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-11-11' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'appointmentDate formati YYYY-MM-DD bo‘lishi shart',
  })
  @IsNotEmpty({ message: 'appointmentDate kiritilishi shart' })
  appointmentDate: string;

  @ApiProperty({ example: '10:00' })
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime formati HH:mm bo‘lishi shart',
  })
  @IsNotEmpty({ message: 'startTime kiritilishi shart' })
  startTime: string;
}

export class CancelAppointmentDto {
  @ApiPropertyOptional({ example: 'Rejalarim o‘zgardi' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}

export class RejectAppointmentDto {
  @ApiPropertyOptional({ example: 'Shifokor shoshilinch operatsiyada' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus, example: AppointmentStatus.CONFIRMED })
  @IsEnum(AppointmentStatus, {
    message: 'status yaroqli AppointmentStatus bo‘lishi shart',
  })
  @IsNotEmpty()
  status: AppointmentStatus;
}

export class AppointmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174002' })
  @IsOptional()
  @IsUUID('4')
  doctorId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID('4')
  patientId?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174003' })
  @IsOptional()
  @IsUUID('4')
  clinicId?: string;

  @ApiPropertyOptional({ example: '2026-11-01' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-11-30' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;
}

