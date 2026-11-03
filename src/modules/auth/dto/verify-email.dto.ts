import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Emailni tasdiqlash tokeni' })
  @IsNotEmpty({ message: 'Token kiritilishi shart' })
  @IsString({ message: 'Token satr bo‘lishi kerak' })
  token: string;
}

