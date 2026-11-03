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
import { AppointmentsService } from './appointments.service.js';
import {
  AppointmentResponseDto,
  AppointmentsQueryDto,
  CancelAppointmentDto,
  CreateAppointmentDto,
  RejectAppointmentDto,
  RescheduleAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto.js';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.PATIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Yangi qabul yozish (faqat bemorlar)' })
  @ApiCreatedResponse({ type: AppointmentResponseDto })
  @ApiConflictResponse({ description: 'Vaqt oralig‘i allaqachon band qilingan' })
  async create(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointmentsService.create(user, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Qabullar ro‘yxati (rolga qarab avtomatik filtrlanadi)',
  })
  @ApiOkResponse({ type: [AppointmentResponseDto] })
  async findAll(
    @CurrentUser() user: { id: string; role: Role },
    @Query() query: AppointmentsQueryDto,
  ) {
    const result = await this.appointmentsService.findAll(user, query);
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
  @ApiOperation({ summary: 'Qabul tafsilotlari' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  @ApiNotFoundResponse({ description: 'Qabul topilmadi' })
  @ApiForbiddenResponse({ description: 'Ruxsat berilmagan' })
  async findOne(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.findOne(id, user);
  }

  @Patch(':id/reschedule')
  @Roles(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Qabul vaqtini ko‘chirish' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  @ApiConflictResponse({ description: 'Slot band yoki status mos emas' })
  async reschedule(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(id, dto, user);
  }

  @Patch(':id/cancel')
  @Roles(Role.PATIENT, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Qabulni bekor qilish' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  async cancel(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    return this.appointmentsService.cancel(id, dto, user);
  }

  @Patch(':id/confirm')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Qabulni tasdiqlash' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  async confirm(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.confirm(id, user);
  }

  @Patch(':id/reject')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Qabulni rad etish' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  async reject(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectAppointmentDto,
  ) {
    return this.appointmentsService.reject(id, dto, user);
  }

  @Patch(':id/complete')
  @Roles(Role.DOCTOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Qabulni yakunlash' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  async complete(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointmentsService.complete(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Qabul statusini o‘zgartirish (faqat admin)' })
  @ApiOkResponse({ type: AppointmentResponseDto })
  async updateStatus(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.appointmentsService.updateStatus(id, dto, adminId);
  }
}

