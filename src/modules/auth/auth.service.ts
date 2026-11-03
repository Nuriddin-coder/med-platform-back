import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import {
  InvalidCredentialsException,
  TokenExpiredException,
  TokenInvalidException,
  UserBlockedException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { toUserResponse } from '../users/dto/user-response.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { MessageResponseDto } from './dto/message-response.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateMeDto } from './dto/update-me.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private isDevelopment(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'development';
  }

  private async generateTokens(
    userId: string,
    email: string | null,
    role: Role,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessExpiresIn =
      this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn as any,
      }),
      this.jwtService.signAsync(
        { sub: userId, tokenId: crypto.randomUUID() },
        {
          secret: refreshSecret,
          expiresIn: refreshExpiresIn as any,
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException(
        'Ro‘yxatdan o‘tish uchun email yoki telefon raqami kiritilishi shart',
      );
    }

    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('Ushbu email allaqachon ro‘yxatdan o‘tgan');
      }
    }

    if (dto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (existingPhone) {
        throw new ConflictException(
          'Ushbu telefon raqami allaqachon ro‘yxatdan o‘tgan',
        );
      }
    }

    const passwordHash = await argon2.hash(dto.password);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email ?? null,
          phone: dto.phone ?? null,
          passwordHash,
          role: Role.PATIENT,
          status: UserStatus.ACTIVE,
          isEmailVerified: false,
        },
      });

      // Automatically create Patient record
      await tx.patient.create({
        data: {
          userId: user.id,
        },
      });

      // Create email verification token
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: verificationExpiresAt,
        },
      });

      return user;
    });

    if (this.isDevelopment()) {
      this.logger.log(
        `[DEV ONLY] Email verification token for ${result.email || result.phone}: ${verificationToken}`,
      );
    }

    const tokens = await this.generateTokens(
      result.id,
      result.email,
      result.role,
    );

    // Store hashed refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        userId: result.id,
        tokenHash: this.hashToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: toUserResponse(result),
      devToken: this.isDevelopment() ? verificationToken : undefined,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.login }, { phone: dto.login }],
      },
    });

    if (!user) {
      throw new InvalidCredentialsException('Login yoki parol noto‘g‘ri');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) {
      throw new InvalidCredentialsException('Login yoki parol noto‘g‘ri');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UserBlockedException('Foydalanuvchi akkaunti bloklangan');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: toUserResponse(user),
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    let payload: { sub: string };

    try {
      payload = await this.jwtService.verifyAsync(dto.refreshToken, {
        secret: refreshSecret,
      });
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new TokenExpiredException('Refresh token muddati tugagan');
      }
      throw new TokenInvalidException('Refresh token yaroqsiz');
    }

    const tokenHash = this.hashToken(dto.refreshToken);
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: payload.sub,
        tokenHash,
        revokedAt: null,
      },
    });

    if (!storedToken) {
      throw new TokenInvalidException(
        'Refresh token bekor qilingan yoki topilmadi',
      );
    }

    if (storedToken.expiresAt < new Date()) {
      throw new TokenExpiredException('Refresh token muddati tugagan');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new TokenInvalidException('Foydalanuvchi topilmadi');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UserBlockedException('Foydalanuvchi akkaunti bloklangan');
    }

    // Refresh Rotation: Revoke old refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate new token pair
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store new refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: toUserResponse(user),
    };
  }

  async logout(userId: string, dto: RefreshTokenDto): Promise<MessageResponseDto> {
    const tokenHash = this.hashToken(dto.refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return { message: 'Muvaffaqiyatli chiqildi' };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.login }, { phone: dto.login }],
      },
    });

    let devToken: string | undefined = undefined;

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt,
        },
      });

      if (this.isDevelopment()) {
        devToken = resetToken;
        this.logger.log(
          `[DEV ONLY] Password reset token for ${user.email || user.phone}: ${resetToken}`,
        );
      }
    }

    return {
      message: 'Parolni tiklash bo‘yicha ko‘rsatma yuborildi',
      devToken,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { token: dto.token },
    });

    if (!resetRecord || resetRecord.usedAt !== null) {
      throw new TokenInvalidException('Parolni tiklash tokeni yaroqsiz');
    }

    if (resetRecord.expiresAt < new Date()) {
      throw new TokenExpiredException('Parolni tiklash tokeni muddati tugagan');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });

      // Security: Revoke all active refresh tokens
      await tx.refreshToken.updateMany({
        where: { userId: resetRecord.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<MessageResponseDto> {
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { token: dto.token },
    });

    if (!record || record.usedAt !== null) {
      throw new TokenInvalidException('Email tasdiqlash tokeni yaroqsiz');
    }

    if (record.expiresAt < new Date()) {
      throw new TokenExpiredException('Email tasdiqlash tokeni muddati tugagan');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      });

      await tx.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
    });

    return { message: 'Elektron pochta muvaffaqiyatli tasdiqlandi' };
  }

  async resendVerification(userId: string): Promise<MessageResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new TokenInvalidException('Foydalanuvchi topilmadi');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt,
      },
    });

    if (this.isDevelopment()) {
      this.logger.log(
        `[DEV ONLY] Resent email verification token for ${user.email || user.phone}: ${verificationToken}`,
      );
    }

    return {
      message: 'Tasdiqlash kodi qayta yuborildi',
      devToken: this.isDevelopment() ? verificationToken : undefined,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new TokenInvalidException('Foydalanuvchi topilmadi');
    }
    return toUserResponse(user);
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.avatarUrl !== undefined && { avatarUrl: dto.avatarUrl }),
      },
    });

    return toUserResponse(updatedUser);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new TokenInvalidException('Foydalanuvchi topilmadi');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.oldPassword);
    if (!isMatch) {
      throw new InvalidCredentialsException('Eski parol noto‘g‘ri kiritildi');
    }

    const newPasswordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      });

      // Revoke all refresh tokens
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    return { message: 'Parol muvaffaqiyatli o‘zgartirildi' };
  }
}

