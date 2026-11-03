import { Module } from '@nestjs/common';
import { MedicalDocumentsController } from './medical-documents.controller.js';
import { MedicalDocumentsService } from './medical-documents.service.js';

@Module({
  controllers: [MedicalDocumentsController],
  providers: [MedicalDocumentsService],
  exports: [MedicalDocumentsService],
})
export class MedicalDocumentsModule {}
