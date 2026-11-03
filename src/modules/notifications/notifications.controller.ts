import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import {
  MarkAllReadResponseDto,
  NotificationResponseDto,
  NotificationsQueryDto,
  UnreadCountResponseDto,
} from './dto/notification.dto.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Foydalanuvchining bildirishnomalari ro‘yxati' })
  @ApiOkResponse({ type: [NotificationResponseDto] })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationsQueryDto,
  ) {
    const result = await this.notificationsService.findAll(userId, query);
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

  @Get('unread-count')
  @ApiOperation({ summary: 'O‘qilmagan bildirishnomalar soni' })
  @ApiOkResponse({ type: UnreadCountResponseDto })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Barcha bildirishnomalarni o‘qilgan deb belgilash' })
  @ApiOkResponse({ type: MarkAllReadResponseDto })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Bitta bildirishnomani o‘qilgan deb belgilash' })
  @ApiOkResponse({ type: NotificationResponseDto })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationsService.markAsRead(userId, id);
  }
}

