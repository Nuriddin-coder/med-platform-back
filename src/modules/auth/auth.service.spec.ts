import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Role, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  InvalidCredentialsException,
  TokenInvalidException,
  UserBlockedException,
} from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      patient: {
        create: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      emailVerificationToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      passwordResetToken: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(prisma)),
    };

    jwtService = {
      signAsync: vi.fn(),
      verifyAsync: vi.fn(),
    };

    configService = {
      get: vi.fn((key: string) => {
        const config: Record<string, string> = {
          NODE_ENV: 'test',
          JWT_ACCESS_SECRET: 'access_secret_123',
          JWT_REFRESH_SECRET: 'refresh_secret_123',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new patient successfully and create Patient record', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const fakeUser = {
        id: 'u-123',
        email: 'test@med.uz',
        phone: null,
        firstName: 'Ali',
        lastName: 'Valiyev',
        role: Role.PATIENT,
        status: UserStatus.ACTIVE,
        isEmailVerified: false,
        createdAt: new Date(),
      };
      prisma.user.create.mockResolvedValue(fakeUser);
      prisma.patient.create.mockResolvedValue({ id: 'p-1', userId: 'u-123' });
      prisma.refreshToken.create.mockResolvedValue({});
      prisma.emailVerificationToken.create.mockResolvedValue({});

      jwtService.signAsync
        .mockResolvedValueOnce('mock_access_token')
        .mockResolvedValueOnce('mock_refresh_token');

      const result = await service.register({
        firstName: 'Ali',
        lastName: 'Valiyev',
        email: 'test@med.uz',
        password: 'Password123!',
      });

      expect(result).toHaveProperty('accessToken', 'mock_access_token');
      expect(result).toHaveProperty('refreshToken', 'mock_refresh_token');
      expect(result.user).toHaveProperty('id', 'u-123');
      expect(result.user).toHaveProperty('role', Role.PATIENT);
      expect(prisma.patient.create).toHaveBeenCalledWith({
        data: { userId: 'u-123' },
      });
    });

    it('should throw ConflictException if email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u-existing' });

      await expect(
        service.register({
          firstName: 'Ali',
          lastName: 'Valiyev',
          email: 'test@med.uz',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully log in with valid credentials', async () => {
      const passwordHash = await argon2.hash('Password123!');
      const fakeUser = {
        id: 'u-123',
        email: 'test@med.uz',
        passwordHash,
        firstName: 'Ali',
        lastName: 'Valiyev',
        role: Role.PATIENT,
        status: UserStatus.ACTIVE,
        isEmailVerified: true,
        createdAt: new Date(),
      };

      prisma.user.findFirst.mockResolvedValue(fakeUser);
      jwtService.signAsync
        .mockResolvedValueOnce('mock_access_token')
        .mockResolvedValueOnce('mock_refresh_token');

      const result = await service.login({
        login: 'test@med.uz',
        password: 'Password123!',
      });

      expect(result.accessToken).toBe('mock_access_token');
      expect(result.user.email).toBe('test@med.uz');
    });

    it('should throw InvalidCredentialsException for invalid password', async () => {
      const passwordHash = await argon2.hash('Password123!');
      prisma.user.findFirst.mockResolvedValue({
        id: 'u-123',
        passwordHash,
        status: UserStatus.ACTIVE,
      });

      await expect(
        service.login({
          login: 'test@med.uz',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(InvalidCredentialsException);
    });

    it('should throw UserBlockedException if user is BLOCKED', async () => {
      const passwordHash = await argon2.hash('Password123!');
      prisma.user.findFirst.mockResolvedValue({
        id: 'u-123',
        passwordHash,
        status: UserStatus.BLOCKED,
      });

      await expect(
        service.login({
          login: 'test@med.uz',
          password: 'Password123!',
        }),
      ).rejects.toThrow(UserBlockedException);
    });
  });

  describe('refresh token rotation', () => {
    it('should rotate tokens and revoke old refresh token', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'u-123' });

      const storedToken = {
        id: 'rt-1',
        userId: 'u-123',
        tokenHash: 'hashed_token',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
      };

      prisma.refreshToken.findFirst.mockResolvedValue(storedToken);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-123',
        email: 'test@med.uz',
        role: Role.PATIENT,
        status: UserStatus.ACTIVE,
      });
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      jwtService.signAsync
        .mockResolvedValueOnce('new_access_token')
        .mockResolvedValueOnce('new_refresh_token');

      const result = await service.refresh({ refreshToken: 'valid_refresh_token' });

      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should throw TokenInvalidException if token not found or already revoked', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'u-123' });
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(
        service.refresh({ refreshToken: 'revoked_token' }),
      ).rejects.toThrow(TokenInvalidException);
    });
  });
});

