import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Put,
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
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminService } from './admin.service.js';
import {
  AdminLogResponseDto,
  AdminLogsQueryDto,
  AdminStatsResponseDto,
  AppointmentsChartPointDto,
  AppointmentsChartQueryDto,
  PermissionsResponseDto,
  PlatformSettingsResponseDto,
  UpdatePlatformSettingsDto,
  UpdateUserPermissionsDto,
  UpdateUserPermissionsResponseDto,
} from './dto/admin.dto.js';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Platformaning umumiy statistikasi' })
  @ApiOkResponse({ type: AdminStatsResponseDto })
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('stats/appointments-chart')
  @ApiOperation({ summary: 'Qabullar statistikasi grafigi (kunlar bo‘yicha)' })
  @ApiOkResponse({ type: [AppointmentsChartPointDto] })
  async getAppointmentsChart(@Query() query: AppointmentsChartQueryDto) {
    return this.adminService.getAppointmentsChart(query.days);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Administrator harakatlari jurnali (audit log)' })
  @ApiOkResponse({ type: [AdminLogResponseDto] })
  async getLogs(@Query() query: AdminLogsQueryDto) {
    const result = await this.adminService.getLogs(query);
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

  @Get('settings')
  @ApiOperation({ summary: 'Platforma sozlamalarini olish' })
  @ApiOkResponse({ type: PlatformSettingsResponseDto })
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Platforma sozlamalarini yangilash' })
  @ApiOkResponse({ type: PlatformSettingsResponseDto })
  async updateSettings(
    @CurrentUser('id') adminId: string,
    @Body() dto: UpdatePlatformSettingsDto,
    @Ip() ipAddress: string,
  ) {
    return this.adminService.updateSettings(adminId, dto, ipAddress);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Tizim huquqlari va ruxsatlar ro‘yxati' })
  @ApiOkResponse({ type: PermissionsResponseDto })
  async getPermissions() {
    return this.adminService.getPermissions();
  }

  @Put('permissions/:userId')
  @ApiOperation({ summary: 'Foydalanuvchiga huquqlar biriktirish' })
  @ApiOkResponse({ type: UpdateUserPermissionsResponseDto })
  async updateUserPermissions(
    @CurrentUser('id') adminId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateUserPermissionsDto,
    @Ip() ipAddress: string,
  ) {
    return this.adminService.updateUserPermissions(
      adminId,
      targetUserId,
      dto,
      ipAddress,
    );
  }
}

