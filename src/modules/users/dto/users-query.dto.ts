import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';

export class UsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: Role, description: 'Foydalanuvchi roli bo‘yicha filtr' })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ enum: UserStatus, description: 'Foydalanuvchi statusi bo‘yicha filtr' })
  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}

