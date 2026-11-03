import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldSecret123!', description: 'Joriy parol' })
  @IsNotEmpty({ message: 'Eski parol kiritilishi shart' })
  @IsString({ message: 'Eski parol satr bo‘lishi kerak' })
  oldPassword: string;

  @ApiProperty({ example: 'NewSecret123!', minLength: 6, description: 'Yangi parol' })
  @IsNotEmpty({ message: 'Yangi parol kiritilishi shart' })
  @IsString({ message: 'Yangi parol satr bo‘lishi kerak' })
  @MinLength(6, { message: 'Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak' })
  newPassword: string;
}

