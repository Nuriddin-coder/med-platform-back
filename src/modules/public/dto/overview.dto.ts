import { ApiProperty } from '@nestjs/swagger';

export class PublicOverviewResponseDto {
  @ApiProperty({ example: 6, description: 'Faol shifokorlar soni' })
  doctorsCount: number;

  @ApiProperty({ example: 3, description: 'Faol klinikalar soni' })
  clinicsCount: number;

  @ApiProperty({ example: 10, description: 'Faol mutaxassisliklar soni' })
  specializationsCount: number;

  @ApiProperty({ example: 3, description: 'Ro‘yxatdan o‘tgan bemorlar soni' })
  patientsCount: number;
}

