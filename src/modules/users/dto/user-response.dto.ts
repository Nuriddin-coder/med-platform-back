import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, UserStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', description: 'Foydalanuvchi unikal identifikatori (UUID)' })
  id: string;

  @ApiPropertyOptional({ example: 'user@med.uz', nullable: true, description: 'Elektron pochta manzili' })
  email: string | null;

  @ApiPropertyOptional({ example: '+998901234567', nullable: true, description: 'Telefon raqami' })
  phone: string | null;

  @ApiProperty({ example: 'Ali', description: 'Ismi' })
  firstName: string;

  @ApiProperty({ example: 'Valiyev', description: 'Familiyasi' })
  lastName: string;

  @ApiPropertyOptional({ example: '/uploads/avatars/ali.jpg', nullable: true, description: 'Profil rasmi URL manzili' })
  avatarUrl: string | null;

  @ApiProperty({ enum: Role, example: Role.PATIENT, description: 'Foydalanuvchi roli' })
  role: Role;

  @ApiProperty({ enum: UserStatus, example: UserStatus.ACTIVE, description: 'Akkaunt holati' })
  status: UserStatus;

  @ApiProperty({ example: false, description: 'Email tasdiqlanganmi yoki yo‘q' })
  isEmailVerified: boolean;

  @ApiProperty({ example: '2026-11-02T10:00:00.000Z', description: 'Yaratilgan sana (ISO 8601)' })
  createdAt: Date;
}

export function toUserResponse(user: any): UserResponseDto {
  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl ?? null,
    role: user.role,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}

