import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSpecializationDto {
  @ApiProperty({ example: 'Kardiologiya', description: 'Mutaxassislik nomi' })
  @IsNotEmpty({ message: 'Mutaxassislik nomi kiritilishi shart' })
  @IsString({ message: 'Mutaxassislik nomi satr bo‘lishi kerak' })
  name: string;

  @ApiPropertyOptional({ example: 'kardiolog', description: 'URL slug (ixtiyoriy, berilmasa avtomatik yaratiladi)' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'Yurak-qon tomir tizimi kasalliklari', description: 'Tavsif' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '/icons/cardiology.svg', description: 'Ikonka URL manzili' })
  @IsString()
  @IsOptional()
  iconUrl?: string;

  @ApiPropertyOptional({ example: true, default: true, description: 'Faollik holati' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSpecializationDto {
  @ApiPropertyOptional({ example: 'Kardiologiya', description: 'Mutaxassislik nomi' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'kardiolog', description: 'URL slug' })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: 'Yurak-qon tomir tizimi kasalliklari', description: 'Tavsif' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: '/icons/cardiology.svg', description: 'Ikonka URL manzili' })
  @IsString()
  @IsOptional()
  iconUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Faollik holati' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SpecializationResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Kardiologiya' })
  name: string;

  @ApiProperty({ example: 'kardiolog' })
  slug: string;

  @ApiPropertyOptional({ example: 'Yurak kasalliklari', nullable: true })
  description: string | null;

  @ApiPropertyOptional({ example: '/icons/cardiology.svg', nullable: true })
  iconUrl: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;
}

