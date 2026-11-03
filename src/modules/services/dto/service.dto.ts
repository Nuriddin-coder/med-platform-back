import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'Birlamchi konsultatsiya', description: 'Xizmat nomi' })
  @IsNotEmpty({ message: 'Xizmat nomi kiritilishi shart' })
  @IsString({ message: 'Xizmat nomi satr bo‘lishi kerak' })
  name: string;

  @ApiPropertyOptional({ example: 'Shifokor ko‘rigi va birlamchi tashxis', description: 'Tavsif' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 150000, description: 'Xizmat narxi (so‘mda, butun son)' })
  @Type(() => Number)
  @IsInt({ message: 'Narx butun son bo‘lishi kerak' })
  @Min(0, { message: 'Narx 0 dan kichik bo‘lishi mumkin emas' })
  price: number;

  @ApiPropertyOptional({ example: 30, default: 30, description: 'Davomiyligi (daqiqa)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @ApiProperty({ example: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890', description: 'Klinika identifikatori' })
  @IsNotEmpty({ message: 'Klinika ID kiritilishi shart' })
  @IsString()
  clinicId: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Faollik holati' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateServiceDto {
  @ApiPropertyOptional({ example: 'Birlamchi konsultatsiya', description: 'Xizmat nomi' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Shifokor ko‘rigi va birlamchi tashxis', description: 'Tavsif' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 150000, description: 'Xizmat narxi (so‘mda)' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ example: 30, description: 'Davomiyligi (daqiqa)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @ApiPropertyOptional({ example: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890' })
  @IsString()
  @IsOptional()
  clinicId?: string;

  @ApiPropertyOptional({ example: true, description: 'Faollik holati' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ServicesQueryDto {
  @ApiPropertyOptional({ description: 'Klinika ID bo‘yicha filtrlash' })
  @IsString()
  @IsOptional()
  clinicId?: string;
}

export class ServiceResponseDto {
  @ApiProperty({ example: 's1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Birlamchi konsultatsiya' })
  name: string;

  @ApiPropertyOptional({ example: 'Shifokor ko‘rigi va tashxis', nullable: true })
  description: string | null;

  @ApiProperty({ example: 150000 })
  price: number;

  @ApiProperty({ example: 30 })
  durationMinutes: number;

  @ApiProperty({ example: 'c1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  clinicId: string;

  @ApiProperty({ example: true })
  isActive: boolean;
}

