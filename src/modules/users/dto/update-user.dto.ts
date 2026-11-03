import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Sardor', description: 'Ism' })
  @IsString({ message: 'Ism satr bo‘lishi kerak' })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Azimov', description: 'Familiya' })
  @IsString({ message: 'Familiya satr bo‘lishi kerak' })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'sardor@med.uz', description: 'Elektron pochta' })
  @IsEmail({}, { message: 'Email formati noto‘g‘ri' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+998901112244', description: 'Telefon raqami' })
  @IsString({ message: 'Telefon raqami satr bo‘lishi kerak' })
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: Role, example: Role.DOCTOR, description: 'Foydalanuvchi roli' })
  @IsEnum(Role, { message: 'Rol noto‘g‘ri kiritildi' })
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE, description: 'Foydalanuvchi holati' })
  @IsEnum(UserStatus, { message: 'Status noto‘g‘ri kiritildi' })
  @IsOptional()
  status?: UserStatus;
}

