import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ali', description: 'Foydalanuvchi ismi' })
  @IsNotEmpty({ message: 'Ism kiritilishi shart' })
  @IsString({ message: 'Ism satr bo‘lishi kerak' })
  firstName: string;

  @ApiProperty({ example: 'Valiyev', description: 'Foydalanuvchi familiyasi' })
  @IsNotEmpty({ message: 'Familiya kiritilishi shart' })
  @IsString({ message: 'Familiya satr bo‘lishi kerak' })
  lastName: string;

  @ApiPropertyOptional({ example: 'ali@med.uz', description: 'Elektron pochta (email yoki phone majburiy)' })
  @ValidateIf((o) => !o.phone || o.email)
  @IsEmail({}, { message: 'Email formati noto‘g‘ri' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+998901234567', description: 'Telefon raqami (email yoki phone majburiy)' })
  @ValidateIf((o) => !o.email || o.phone)
  @IsString({ message: 'Telefon raqami satr bo‘lishi kerak' })
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Secret123!', minLength: 6, description: 'Maxfiy parol (kamida 6 ta belgi)' })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString({ message: 'Parol satr bo‘lishi kerak' })
  @MinLength(6, { message: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak' })
  password: string;
}

