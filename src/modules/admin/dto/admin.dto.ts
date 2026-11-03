import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { Role } from '@prisma/client';

export class AdminStatsResponseDto {
  @ApiProperty({ example: 150 })
  totalUsers: number;

  @ApiProperty({ example: 25 })
  totalDoctors: number;

  @ApiProperty({ example: 120 })
  totalPatients: number;

  @ApiProperty({ example: 8 })
  totalClinics: number;

  @ApiProperty({ example: 14 })
  todayAppointments: number;

  @ApiProperty({ example: 85 })
  confirmedAppointments: number;

  @ApiProperty({ example: 12 })
  cancelledAppointments: number;

  @ApiProperty({ example: 19 })
  newUsersThisWeek: number;
}

export class AppointmentsChartPointDto {
  @ApiProperty({ example: '2026-11-03' })
  date: string;

  @ApiProperty({ example: 10 })
  total: number;

  @ApiProperty({ example: 7 })
  confirmed: number;

  @ApiProperty({ example: 2 })
  cancelled: number;
}

export class AppointmentsChartQueryDto {
  @ApiPropertyOptional({
    description: 'Necha kunlik statistika (standart: 30)',
    example: 30,
    default: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;
}

export class AdminLogAdminBriefDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Super' })
  firstName: string;

  @ApiProperty({ example: 'Admin' })
  lastName: string;
}

export class AdminLogResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  adminId: string;

  @ApiProperty({ example: 'BLOCK_USER' })
  action: string;

  @ApiProperty({ example: 'User' })
  entity: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002', nullable: true })
  entityId: string | null;

  @ApiProperty({ example: { reason: 'Spam' }, nullable: true })
  metadata: Record<string, any> | null;

  @ApiProperty({ example: '127.0.0.1', nullable: true })
  ipAddress: string | null;

  @ApiProperty({ example: '2026-11-03T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ type: () => AdminLogAdminBriefDto })
  admin: AdminLogAdminBriefDto;
}

export class AdminLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'BLOCK_USER' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ example: 'User' })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID('4')
  adminId?: string;
}

export class PlatformSettingsResponseDto {
  @ApiProperty({ example: 'MED Medical Platform' })
  platformName: string;

  @ApiProperty({ example: '+998712000000' })
  supportPhone: string;

  @ApiProperty({ example: 'support@med.uz' })
  supportEmail: string;
}

export class UpdatePlatformSettingsDto {
  @ApiPropertyOptional({ example: 'MED Medical Platform' })
  @IsOptional()
  @IsString()
  platformName?: string;

  @ApiPropertyOptional({ example: '+998712000000' })
  @IsOptional()
  @IsString()
  supportPhone?: string;

  @ApiPropertyOptional({ example: 'support@med.uz' })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;
}

export class UserPermissionItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  userId: string;

  @ApiProperty({ example: 'ali@med.uz', nullable: true })
  email: string | null;

  @ApiProperty({ enum: Role, example: Role.ADMIN })
  role: Role;

  @ApiProperty({ example: ['users:read', 'users:write'] })
  permissions: string[];
}

export class PermissionsResponseDto {
  @ApiProperty({
    example: [
      'users:read',
      'users:write',
      'users:block',
      'doctors:manage',
      'clinics:manage',
      'settings:manage',
    ],
  })
  permissions: string[];

  @ApiProperty({ type: () => [UserPermissionItemDto] })
  users: UserPermissionItemDto[];
}

export class UpdateUserPermissionsDto {
  @ApiProperty({
    example: ['users:read', 'users:write'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

export class UpdateUserPermissionsResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  userId: string;

  @ApiProperty({ example: ['users:read', 'users:write'] })
  permissions: string[];
}

