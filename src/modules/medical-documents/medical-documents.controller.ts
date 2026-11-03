import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MedicalDocumentType, Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  CreateMedicalDocumentDto,
  MedicalDocumentResponseDto,
  MedicalDocumentsQueryDto,
} from './dto/medical-document.dto.js';
import { MedicalDocumentsService } from './medical-documents.service.js';

@ApiTags('Medical')
@ApiBearerAuth()
@Controller('medical-documents')
export class MedicalDocumentsController {
  constructor(
    private readonly medicalDocumentsService: MedicalDocumentsService,
  ) {}

  @Post()
  @Roles(Role.DOCTOR, Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiOperation({
    summary: 'Tibbiy hujjat yuklash (D, P: PDF, JPG, PNG, max 10MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'patientId', 'type', 'title'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Hujjat fayli (PDF, JPG, PNG, max 10MB)',
        },
        patientId: {
          type: 'string',
          format: 'uuid',
          example: '123e4567-e89b-12d3-a456-426614174001',
        },
        recordId: {
          type: 'string',
          format: 'uuid',
          example: '123e4567-e89b-12d3-a456-426614174002',
        },
        type: {
          type: 'string',
          enum: Object.values(MedicalDocumentType),
          example: MedicalDocumentType.LAB_RESULT,
        },
        title: {
          type: 'string',
          example: 'Umumiy qon tahlili natijasi',
        },
      },
    },
  })
  @ApiCreatedResponse({ type: MedicalDocumentResponseDto })
  async create(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: CreateMedicalDocumentDto,
    @UploadedFile() file: any,
  ) {
    return this.medicalDocumentsService.create(user, dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Tibbiy hujjatlar ro‘yxati' })
  @ApiOkResponse({ type: [MedicalDocumentResponseDto] })
  async findAll(
    @CurrentUser() user: { id: string; role: Role },
    @Query() query: MedicalDocumentsQueryDto,
  ) {
    const result = await this.medicalDocumentsService.findAll(user, query);
    return {
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Tibbiy hujjatni yuklab olish (ruxsat tekshiriladi, stream)',
  })
  @ApiOkResponse({ description: 'Fayl oqimi (stream)' })
  @ApiNotFoundResponse({ description: 'Hujjat topilmadi' })
  @ApiForbiddenResponse({ description: 'Ruxsat berilmagan' })
  async download(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const fileData = await this.medicalDocumentsService.getDownloadStream(id, user);
    res.set({
      'Content-Type': fileData.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData.fileName)}"`,
      'Content-Length': fileData.size,
    });
    fileData.stream.pipe(res);
  }

  @Delete(':id')
  @Roles(Role.DOCTOR, Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Tibbiy hujjatni o‘chirish (muallif yoki admin)' })
  @ApiOkResponse({ description: 'Hujjat muvaffaqiyatli o‘chirildi' })
  async delete(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.medicalDocumentsService.delete(id, user);
  }
}
