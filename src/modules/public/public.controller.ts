import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { PublicOverviewResponseDto } from './dto/overview.dto.js';
import { PublicService } from './public.service.js';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Public()
  @Get('overview')
  @ApiOperation({ summary: 'Asosiy sahifa (landing) umumiy statistikasi' })
  @ApiOkResponse({ type: PublicOverviewResponseDto })
  async getOverview(): Promise<PublicOverviewResponseDto> {
    return this.publicService.getOverview();
  }
}

