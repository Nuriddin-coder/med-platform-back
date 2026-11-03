import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class NotificationResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  userId: string;

  @ApiProperty({
    enum: NotificationType,
    example: NotificationType.APPOINTMENT_CREATED,
  })
  type: NotificationType;

  @ApiProperty({ example: 'Qabul yaratildi' })
  title: string;

  @ApiProperty({ example: 'Shifokor: Dr. Jasur Karimov, Sana: 2026-11-10 10:00' })
  message: string;

  @ApiProperty({
    example: { appointmentId: '123e4567-e89b-12d3-a456-426614174002' },
    nullable: true,
  })
  data: Record<string, any> | null;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2026-11-03T10:00:00.000Z' })
  createdAt: Date;
}

export class UnreadCountResponseDto {
  @ApiProperty({ example: 3 })
  count: number;
}

export class MarkAllReadResponseDto {
  @ApiProperty({ example: 3 })
  count: number;
}

export class NotificationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by read/unread status',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isRead?: boolean;
}

