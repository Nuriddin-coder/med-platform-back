import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
  PatientResponseDto,
  PatientsQueryDto,
  UpdatePatientDto,
} from './dto/patient.dto.js';
import { PatientsService } from './patients.service.js';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('me')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Joriy bemor profili (faqat bemor)' })
  @ApiOkResponse({ type: PatientResponseDto })
  async getMe(@CurrentUser('id') userId: string) {
    return this.patientsService.getMe(userId);
  }

  @Patch('me')
  @Roles(Role.PATIENT)
  @ApiOperation({ summary: 'Joriy bemor profilini yangilash (faqat bemor)' })
  @ApiOkResponse({ type: PatientResponseDto })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.updateMe(userId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)
  @ApiOperation({
    summary:
      'Bemorlar ro‘yxati (Admin: barchasi, Doktor: faqat o‘zining bemorlari)',
  })
  @ApiOkResponse({ type: [PatientResponseDto] })
  async findAll(
    @CurrentUser() user: { id: string; role: Role },
    @Query() query: PatientsQueryDto,
  ) {
    const result = await this.patientsService.findAll(user, query);
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Bemor tafsilotlari (A, D-ruxsatli)' })
  @ApiOkResponse({ type: PatientResponseDto })
  @ApiNotFoundResponse({ description: 'Bemor topilmadi' })
  @ApiForbiddenResponse({ description: 'Ruxsat berilmagan' })
  async findOne(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Bemor profilini tahrirlash (faqat admin)' })
  @ApiOkResponse({ type: PatientResponseDto })
  @ApiNotFoundResponse({ description: 'Bemor topilmadi' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, dto);
  }
}

