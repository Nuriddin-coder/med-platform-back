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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import {
  CreateSpecializationDto,
  SpecializationResponseDto,
  UpdateSpecializationDto,
} from './dto/specialization.dto.js';
import { SpecializationsService } from './specializations.service.js';

@ApiTags('Specializations')
@Controller('specializations')
export class SpecializationsController {
  constructor(private readonly service: SpecializationsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Barcha mutaxassisliklar ro‘yxati' })
  @ApiOkResponse({ type: [SpecializationResponseDto] })
  async findAll(): Promise<SpecializationResponseDto[]> {
    return this.service.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'ID bo‘yicha mutaxassislikni olish' })
  @ApiOkResponse({ type: SpecializationResponseDto })
  async findOne(@Param('id') id: string): Promise<SpecializationResponseDto> {
    return this.service.findOne(id);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Yangi mutaxassislik yaratish (Admin)' })
  @ApiOkResponse({ type: SpecializationResponseDto })
  async create(
    @Body() dto: CreateSpecializationDto,
  ): Promise<SpecializationResponseDto> {
    return this.service.create(dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Mutaxassislikni tahrirlash (Admin)' })
  @ApiOkResponse({ type: SpecializationResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSpecializationDto,
  ): Promise<SpecializationResponseDto> {
    return this.service.update(id, dto);
  }

  @ApiBearerAuth('bearer')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mutaxassislikni o‘chirish (Admin)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Mutaxassislik muvaffaqiyatli o‘chirildi' },
      },
    },
  })
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

