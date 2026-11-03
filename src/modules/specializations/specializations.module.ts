import { Module } from '@nestjs/common';
import { SpecializationsController } from './specializations.controller.js';
import { SpecializationsService } from './specializations.service.js';

@Module({
  controllers: [SpecializationsController],
  providers: [SpecializationsService],
  exports: [SpecializationsService],
})
export class SpecializationsModule {}
