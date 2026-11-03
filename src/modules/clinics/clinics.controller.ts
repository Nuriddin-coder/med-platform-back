import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  AddDoctorToClinicDto,
  ClinicDetailResponseDto,
  ClinicResponseDto,
  ClinicsQueryDto,
  CreateClinicDto,
  UpdateClinicDto,
} from './dto/clinic.dto.js';
import { ClinicsService } from './clinics.service.js';

@ApiTags('Clinics')
@Controller('clinics')
export class ClinicsController {
  constructor(private readonly service: ClinicsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Klinikalar ro‘yxati (qidiruv va filtrlar bilan)' })
  @ApiOkResponse({ type: [ClinicResponseDto] })
  async findAll(@Query() query: ClinicsQueryDto) {
    return this.service.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'ID bo‘yicha klinika va uning xizmatlarini olish' })
  @ApiOkResponse({ type: ClinicDetailResponseDto })
  async findOne(@Param('id') id: string): Promise<ClinicDetailResponseDto> {
    return this.service.findOne(id);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Yangi klinika yaratish (Admin)' })
  @ApiOkResponse({ type: ClinicResponseDto })
  async create(@Body() dto: CreateClinicDto): Promise<ClinicResponseDto> {
    return this.service.create(dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CLINIC_MANAGER)
  @Patch(':id')
  @ApiOperation({ summary: 'Klinikani tahrirlash (Admin, Clinic Manager o‘ziniki)' })
  @ApiOkResponse({ type: ClinicResponseDto })
  async update(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id') id: string,
    @Body() dto: UpdateClinicDto,
  ): Promise<ClinicResponseDto> {
    return this.service.update(user, id, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Klinikani o‘chirish (Admin)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Klinika muvaffaqiyatli o‘chirildi' },
      },
    },
  })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CLINIC_MANAGER)
  @Post(':id/doctors')
  @ApiOperation({ summary: 'Shifokorni klinikaga biriktirish (Admin, Clinic Manager)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Doktor klinikaga muvaffaqiyatli biriktirildi' },
      },
    },
  })
  async addDoctor(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id') id: string,
    @Body() dto: AddDoctorToClinicDto,
  ) {
    return this.service.addDoctor(user, id, dto.doctorId);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CLINIC_MANAGER)
  @Delete(':id/doctors/:doctorId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Shifokorni klinikadan ajratish (Admin, Clinic Manager)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Doktor klinikadan muvaffaqiyatli ajratildi' },
      },
    },
  })
  async removeDoctor(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id') id: string,
    @Param('doctorId') doctorId: string,
  ) {
    return this.service.removeDoctor(user, id, doctorId);
  }
}

