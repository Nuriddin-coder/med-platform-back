import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'Ali', description: 'Ism' })
  @IsString({ message: 'Ism satr bo‘lishi kerak' })
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Valiyev', description: 'Familiya' })
  @IsString({ message: 'Familiya satr bo‘lishi kerak' })
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: '/uploads/avatars/new-avatar.png', description: 'Profil rasmi manzili' })
  @IsString({ message: 'Avatar URL satr bo‘lishi kerak' })
  @IsOptional()
  avatarUrl?: string;
}

