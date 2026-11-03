import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Parolni tiklash tokeni' })
  @IsNotEmpty({ message: 'Token kiritilishi shart' })
  @IsString({ message: 'Token satr bo‘lishi kerak' })
  token: string;

  @ApiProperty({ example: 'NewSecret123!', minLength: 6, description: 'Yangi parol' })
  @IsNotEmpty({ message: 'Yangi parol kiritilishi shart' })
  @IsString({ message: 'Yangi parol satr bo‘lishi kerak' })
  @MinLength(6, { message: 'Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak' })
  newPassword: string;
}

