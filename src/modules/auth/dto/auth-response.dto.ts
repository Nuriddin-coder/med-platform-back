import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT Access Token (15 daqiqa)' })
  accessToken: string;

  @ApiProperty({ description: 'JWT Refresh Token (7 kun)' })
  refreshToken: string;

  @ApiProperty({ type: UserResponseDto, description: 'Foydalanuvchi maʼlumotlari' })
  user: UserResponseDto;

  @ApiPropertyOptional({ description: 'Faqat development rejimida tekshirish/tasdiqlash tokeni' })
  devToken?: string;
}

