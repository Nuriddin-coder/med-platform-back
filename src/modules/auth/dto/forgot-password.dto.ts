import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ali@med.uz', description: 'Parolni tiklash uchun email yoki telefon' })
  @IsNotEmpty({ message: 'Login (email yoki telefon) kiritilishi shart' })
  @IsString({ message: 'Login satr bo‘lishi kerak' })
  login: string;
}

