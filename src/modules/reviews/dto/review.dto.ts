import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ example: 'd1-uuid', description: 'Doktor ID' })
  @IsNotEmpty({ message: 'Doktor ID kiritilishi shart' })
  @IsString()
  doctorId: string;

  @ApiProperty({ example: 'a1-uuid', description: 'Tugallangan qabul ID (faqat COMPLETED)' })
  @IsNotEmpty({ message: 'Qabul ID kiritilishi shart' })
  @IsString()
  appointmentId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Baho (1 dan 5 gacha)' })
  @Type(() => Number)
  @IsInt({ message: 'Baho 1 dan 5 gacha butun son bo‘lishi kerak' })
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Shifokor juda xushmuomala va professional!', description: 'Izoh' })
  @IsString()
  @IsOptional()
  comment?: string;
}

