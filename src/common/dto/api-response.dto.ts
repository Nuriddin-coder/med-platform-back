import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Joriy sahifa raqami' })
  page: number;

  @ApiProperty({ example: 10, description: 'Har bir sahifadagi elementlar soni' })
  limit: number;

  @ApiProperty({ example: 57, description: 'Jami elementlar soni' })
  total: number;

  @ApiProperty({ example: 6, description: 'Jami sahifalar soni' })
  totalPages: number;
}

export class ErrorDetailsDto {
  @ApiProperty({ example: 'email', description: 'Xatolik yuz bergan maydon nomi' })
  field: string;

  @ApiProperty({ example: 'Email formati noto‘g‘ri', description: 'Xatolik matni' })
  message: string;
}

export class ErrorPayloadDto {
  @ApiProperty({ example: 'VALIDATION_ERROR', description: 'Contract xatolik kodi' })
  code: string;

  @ApiProperty({ example: 'Kiritilgan maʼlumotlar yaroqsiz', description: 'Xatolik haqida xabar' })
  message: string;

  @ApiPropertyOptional({ type: [ErrorDetailsDto], description: 'Validatsiya yoki batafsil xatoliklar' })
  details?: ErrorDetailsDto[];
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ type: ErrorPayloadDto })
  error: ErrorPayloadDto;
}

export class SuccessResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  data: T;

  @ApiPropertyOptional({ type: PaginationMetaDto })
  meta?: PaginationMetaDto;
}

