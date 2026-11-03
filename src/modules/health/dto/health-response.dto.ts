import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ example: 'ok', type: String, description: 'Tizim holati' })
  status: string;

  @ApiProperty({ example: '2026-11-02T10:00:00.000Z', type: String, description: 'Tekshirilgan vaqt' })
  timestamp: string;

  @ApiProperty({ example: 42, type: Number, description: 'Uptime soniyalarda' })
  uptimeSeconds: number;

  @ApiProperty({ example: 'development', type: String, description: 'Muhit nomi' })
  environment: string;
}
