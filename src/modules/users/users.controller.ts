import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
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
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { PaginatedUserResponseDto } from './dto/paginated-user-response.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UsersQueryDto } from './dto/users-query.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('Users')
@ApiBearerAuth('bearer')
@Roles(Role.SUPER_ADMIN, Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Foydalanuvchilar ro‘yxatini olish (Admin)' })
  @ApiOkResponse({ type: PaginatedUserResponseDto })
  async findAll(@Query() query: UsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'ID bo‘yicha foydalanuvchini olish (Admin)' })
  @ApiOkResponse({ type: UserResponseDto })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Yangi foydalanuvchi yaratish (Admin)' })
  @ApiOkResponse({ type: UserResponseDto })
  async create(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreateUserDto,
    @Ip() ipAddress: string,
  ): Promise<UserResponseDto> {
    return this.usersService.create(adminId, dto, ipAddress);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Foydalanuvchini tahrirlash (Admin)' })
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Ip() ipAddress: string,
  ): Promise<UserResponseDto> {
    return this.usersService.update(adminId, id, dto, ipAddress);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Foydalanuvchini o‘chirish (Admin)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Foydalanuvchi muvaffaqiyatli o‘chirildi' },
      },
    },
  })
  async remove(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Ip() ipAddress: string,
  ) {
    return this.usersService.remove(adminId, id, ipAddress);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Foydalanuvchini bloklash (Admin)' })
  @ApiOkResponse({ type: UserResponseDto })
  async block(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Ip() ipAddress: string,
  ): Promise<UserResponseDto> {
    return this.usersService.block(adminId, id, ipAddress);
  }

  @Patch(':id/unblock')
  @ApiOperation({ summary: 'Foydalanuvchini blokdan chiqarish (Admin)' })
  @ApiOkResponse({ type: UserResponseDto })
  async unblock(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Ip() ipAddress: string,
  ): Promise<UserResponseDto> {
    return this.usersService.unblock(adminId, id, ipAddress);
  }
}

