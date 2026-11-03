import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ReviewResponseDto } from '../doctors/dto/doctor.dto.js';
import { CreateReviewDto } from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

@ApiTags('Reviews')
@ApiBearerAuth('bearer')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Roles(Role.PATIENT)
  @Post()
  @ApiOperation({ summary: 'Shifokorga baho va fikr-mulohaza qoldirish (Faqat bemor, COMPLETED qabul)' })
  @ApiOkResponse({ type: ReviewResponseDto })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.service.create(userId, dto);
  }
}

