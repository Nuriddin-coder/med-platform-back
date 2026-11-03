import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Yangi access token olish uchun Refresh Token' })
  @IsNotEmpty({ message: 'Refresh token kiritilishi shart' })
  @IsString({ message: 'Refresh token satr bo‘lishi kerak' })
  refreshToken: string;
}

