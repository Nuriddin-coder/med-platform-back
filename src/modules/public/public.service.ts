import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { PublicOverviewResponseDto } from './dto/overview.dto.js';

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<PublicOverviewResponseDto> {
    const [doctorsCount, clinicsCount, specializationsCount, patientsCount] =
      await Promise.all([
        this.prisma.doctor.count({ where: { isActive: true } }),
        this.prisma.clinic.count({ where: { isActive: true } }),
        this.prisma.specialization.count({ where: { isActive: true } }),
        this.prisma.patient.count(),
      ]);

    return {
      doctorsCount,
      clinicsCount,
      specializationsCount,
      patientsCount,
    };
  }
}

