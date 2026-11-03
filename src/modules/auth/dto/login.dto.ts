import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ali@med.uz', description: 'Login: elektron pochta manzili yoki telefon raqami' })
  @IsNotEmpty({ message: 'Login (email yoki telefon) kiritilishi shart' })
  @IsString({ message: 'Login satr bo‘lishi kerak' })
  login: string;

  @ApiProperty({ example: 'Secret123!', description: 'Foydalanuvchi paroli' })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString({ message: 'Parol satr bo‘lishi kerak' })
  password: string;
}

