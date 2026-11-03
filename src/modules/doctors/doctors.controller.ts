import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { DoctorsService } from './doctors.service.js';
import {
  AddCertificateDto,
  CertificateResponseDto,
  CreateDoctorDto,
  DoctorResponseDto,
  DoctorsQueryDto,
  DoctorScheduleResponseDto,
  PatientResponseDto,
  ReviewResponseDto,
  TimeSlotDto,
  UpdateDoctorDto,
  UpdateDoctorSchedulesDto,
} from './dto/doctor.dto.js';

@ApiTags('Doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly service: DoctorsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Shifokorlar ro‘yxati (qidiruv, filtrlar va saralash bilan)' })
  @ApiOkResponse({ type: [DoctorResponseDto] })
  async findAll(@Query() query: DoctorsQueryDto) {
    return this.service.findAll(query);
  }

  // --- Doctor (ME) Endpoints (must be above :id) ---

  @ApiBearerAuth('bearer')
  @Roles(Role.DOCTOR)
  @Get('me')
  @ApiOperation({ summary: 'Joriy shifokor profilini olish (Doctor)' })
  @ApiOkResponse({ type: DoctorResponseDto })
  async getMe(@CurrentUser('id') userId: string): Promise<DoctorResponseDto> {
    return this.service.getMe(userId);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.DOCTOR)
  @Patch('me')
  @ApiOperation({ summary: 'Joriy shifokor profilini tahrirlash (Doctor)' })
  @ApiOkResponse({ type: DoctorResponseDto })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDoctorDto,
  ): Promise<DoctorResponseDto> {
    return this.service.updateMe(userId, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.DOCTOR)
  @Get('me/schedules')
  @ApiOperation({ summary: 'Joriy shifokor ish jadvallarini olish (Doctor)' })
  @ApiOkResponse({ type: [DoctorScheduleResponseDto] })
  async getMySchedules(
    @CurrentUser('id') userId: string,
  ): Promise<DoctorScheduleResponseDto[]> {
    return this.service.getMySchedules(userId);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.DOCTOR)
  @Put('me/schedules')
  @ApiOperation({ summary: 'Joriy shifokor ish jadvallarini to‘liq yangilash (Doctor)' })
  @ApiOkResponse({ type: [DoctorScheduleResponseDto] })
  async updateMySchedules(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateDoctorSchedulesDto,
  ): Promise<DoctorScheduleResponseDto[]> {
    return this.service.updateMySchedules(userId, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.DOCTOR)
  @Get('me/patients')
  @ApiOperation({ summary: 'Joriy shifokor qabulida bo‘lgan bemorlar ro‘yxati (Doctor)' })
  @ApiOkResponse({ type: [PatientResponseDto] })
  async getMyPatients(
    @CurrentUser('id') userId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.getMyPatients(userId, query);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.DOCTOR)
  @Post('me/certificates')
  @ApiOperation({ summary: 'Sertifikat qo‘shish (Doctor)' })
  @ApiOkResponse({ type: CertificateResponseDto })
  async addCertificate(
    @CurrentUser('id') userId: string,
    @Body() dto: AddCertificateDto,
  ): Promise<CertificateResponseDto> {
    return this.service.addCertificate(userId, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.DOCTOR)
  @Delete('me/certificates/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sertifikatni o‘chirish (Doctor)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Sertifikat muvaffaqiyatli o‘chirildi' },
      },
    },
  })
  async deleteCertificate(
    @CurrentUser('id') userId: string,
    @Param('id') certId: string,
  ) {
    return this.service.deleteCertificate(userId, certId);
  }

  // --- Doctor (:id) Endpoints ---

  @Public()
  @Get(':id/slots')
  @ApiOperation({ summary: 'Shifokorning tanlangan sana va klinika bo‘yicha bo‘sh vaqt slotlari' })
  @ApiQuery({ name: 'date', required: true, example: '2026-11-03', description: 'Qabul sanasi (YYYY-MM-DD)' })
  @ApiQuery({ name: 'clinicId', required: true, example: 'c1-uuid', description: 'Klinika ID' })
  @ApiOkResponse({ type: [TimeSlotDto] })
  async getSlots(
    @Param('id') doctorId: string,
    @Query('date') date: string,
    @Query('clinicId') clinicId: string,
  ): Promise<TimeSlotDto[]> {
    if (!date) {
      throw new BadRequestException('date query parametri (YYYY-MM-DD) majburiy');
    }
    if (!clinicId) {
      throw new BadRequestException('clinicId query parametri majburiy');
    }
    return this.service.getSlots(doctorId, date, clinicId);
  }

  @Public()
  @Get(':id/reviews')
  @ApiOperation({ summary: 'Shifokorga qoldirilgan fikr-mulohazalar (Reviews)' })
  @ApiOkResponse({ type: [ReviewResponseDto] })
  async getReviews(
    @Param('id') doctorId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.service.getReviews(doctorId, query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'ID bo‘yicha shifokorni olish' })
  @ApiOkResponse({ type: DoctorResponseDto })
  async findOne(@Param('id') id: string): Promise<DoctorResponseDto> {
    return this.service.findOne(id);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Yangi shifokor yaratish (Admin)' })
  @ApiOkResponse({ type: DoctorResponseDto })
  async create(@Body() dto: CreateDoctorDto): Promise<DoctorResponseDto> {
    return this.service.create(dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Shifokorni tahrirlash (Admin)' })
  @ApiOkResponse({ type: DoctorResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDoctorDto,
  ): Promise<DoctorResponseDto> {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Shifokorni o‘chirish (Admin)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Shifokor muvaffaqiyatli o‘chirildi' },
      },
    },
  })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

