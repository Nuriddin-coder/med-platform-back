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
  CreateServiceDto,
  ServiceResponseDto,
  ServicesQueryDto,
  UpdateServiceDto,
} from './dto/service.dto.js';
import { ServicesService } from './services.service.js';

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Xizmatlar ro‘yxati (ixtiyoriy clinicId bo‘yicha filtr)' })
  @ApiOkResponse({ type: [ServiceResponseDto] })
  async findAll(@Query() query: ServicesQueryDto): Promise<ServiceResponseDto[]> {
    return this.service.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'ID bo‘yicha xizmatni olish' })
  @ApiOkResponse({ type: ServiceResponseDto })
  async findOne(@Param('id') id: string): Promise<ServiceResponseDto> {
    return this.service.findOne(id);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CLINIC_MANAGER)
  @Post()
  @ApiOperation({ summary: 'Yangi xizmat yaratish (Admin, Clinic Manager)' })
  @ApiOkResponse({ type: ServiceResponseDto })
  async create(
    @CurrentUser() user: { id: string; role: Role },
    @Body() dto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.service.create(user, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CLINIC_MANAGER)
  @Patch(':id')
  @ApiOperation({ summary: 'Xizmatni tahrirlash (Admin, Clinic Manager)' })
  @ApiOkResponse({ type: ServiceResponseDto })
  async update(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.service.update(user, id, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.CLINIC_MANAGER)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xizmatni o‘chirish (Admin, Clinic Manager)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Xizmat muvaffaqiyatli o‘chirildi' },
      },
    },
  })
  async remove(
    @CurrentUser() user: { id: string; role: Role },
    @Param('id') id: string,
  ) {
    return this.service.remove(user, id);
  }
}

