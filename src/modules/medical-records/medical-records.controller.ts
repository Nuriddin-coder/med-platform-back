import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  CreateMedicalRecordDto,
  MedicalRecordResponseDto,
  MedicalRecordsQueryDto,
  UpdateMedicalRecordDto,
} from './dto/medical-record.dto.js';
import { MedicalRecordsService } from './medical-records.service.js';

@ApiTags('Medical')
@ApiBearerAuth()
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Post()
  @Roles(Role.DOCTOR)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Tibbiy yozuv yaratish (faqat shifokor, tasdiqlangan/yakunlangan qabuli bo‘lgan bemorga)',
  })
  @ApiCreatedResponse({ type: MedicalRecordResponseDto })
  @ApiForbiddenResponse({
    description: 'Ushbu bemor bilan tasdiqlangan yoki yakunlangan qabul mavjud emas',
  })
  @ApiConflictResponse({
    description: 'Ko‘rsatilgan qabul mos kelmadi yoki allaqachon yozuv yaratilgan',
  })
  async create(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: CreateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.create(user, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Tibbiy yozuvlar ro‘yxati (P: faqat o‘ziniki; D: qabuli bor bemorlar; A: barchasi)',
  })
  @ApiOkResponse({ type: [MedicalRecordResponseDto] })
  async findAll(
    @CurrentUser() user: { id: string; role: Role },
    @Query() query: MedicalRecordsQueryDto,
  ) {
    const result = await this.medicalRecordsService.findAll(user, query);
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

  @Get(':id')
  @ApiOperation({ summary: 'Tibbiy yozuv tafsilotlari' })
  @ApiOkResponse({ type: MedicalRecordResponseDto })
  @ApiNotFoundResponse({ description: 'Tibbiy yozuv topilmadi' })
  @ApiForbiddenResponse({ description: 'Ruxsat berilmagan' })
  async findOne(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.medicalRecordsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.DOCTOR)
  @ApiOperation({ summary: 'Tibbiy yozuvni tahrirlash (faqat muallif shifokor)' })
  @ApiOkResponse({ type: MedicalRecordResponseDto })
  @ApiNotFoundResponse({ description: 'Tibbiy yozuv topilmadi' })
  @ApiForbiddenResponse({ description: 'Faqat muallif tahrirlay oladi' })
  async update(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.update(id, dto, user);
  }
}

