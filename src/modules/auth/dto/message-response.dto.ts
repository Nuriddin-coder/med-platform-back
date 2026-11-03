import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageResponseDto {
  @ApiProperty({ example: 'Amal muvaffaqiyatli bajarildi' })
  message: string;

  @ApiPropertyOptional({ description: 'Faqat development rejimida tasdiqlash yoki tiklash tokeni' })
  devToken?: string;
}

