import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import { ErrorCodes } from '../constants/error-codes.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import {
  AppException,
  TokenExpiredException,
  TokenInvalidException,
  UserBlockedException,
} from '../exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Avtorizatsiya talab qilinadi',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new AppException(
        ErrorCodes.UNAUTHORIZED,
        'Bearer token formati noto‘g‘ri',
        HttpStatus.UNAUTHORIZED,
      );
    }

    let payload: { sub: string; email?: string; role?: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
    } catch (error: any) {
      if (error?.name === 'TokenExpiredError') {
        throw new TokenExpiredException('Access token muddati tugagan');
      }
      throw new TokenInvalidException('Access token yaroqsiz');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        role: true,
        status: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new TokenInvalidException('Foydalanuvchi topilmadi');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new UserBlockedException('Foydalanuvchi akkaunti bloklangan');
    }

    request.user = user;
    return true;
  }
}

