import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Sardor', description: 'Ism' })
  @IsNotEmpty({ message: 'Ism kiritilishi shart' })
  @IsString({ message: 'Ism satr bo‘lishi kerak' })
  firstName: string;

  @ApiProperty({ example: 'Azimov', description: 'Familiya' })
  @IsNotEmpty({ message: 'Familiya kiritilishi shart' })
  @IsString({ message: 'Familiya satr bo‘lishi kerak' })
  lastName: string;

  @ApiPropertyOptional({ example: 'sardor@med.uz', description: 'Elektron pochta' })
  @IsEmail({}, { message: 'Email formati noto‘g‘ri' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+998901112244', description: 'Telefon raqami' })
  @IsString({ message: 'Telefon raqami satr bo‘lishi kerak' })
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'Password123!', minLength: 6, description: 'Parol' })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString({ message: 'Parol satr bo‘lishi kerak' })
  @MinLength(6, { message: 'Parol kamida 6 ta belgidan iborat bo‘lishi kerak' })
  password: string;

  @ApiProperty({ enum: Role, example: Role.DOCTOR, description: 'Foydalanuvchi roli' })
  @IsEnum(Role, { message: 'Rol noto‘g‘ri kiritildi' })
  role: Role;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE, description: 'Foydalanuvchi holati' })
  @IsEnum(UserStatus, { message: 'Status noto‘g‘ri kiritildi' })
  @IsOptional()
  status?: UserStatus;
}

