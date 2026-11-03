import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ForbiddenAppException } from '../exceptions/app.exception.js';
import { RolesGuard } from './roles.guard.js';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (userRole?: Role): ExecutionContext => {
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: userRole ? { id: 'u-1', role: userRole } : null,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no roles are required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext(Role.PATIENT);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has required role (ADMIN or SUPER_ADMIN)', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN, Role.SUPER_ADMIN]);
    const context = createMockContext(Role.ADMIN);

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenAppException if user has wrong role', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.SUPER_ADMIN, Role.ADMIN]);
    const context = createMockContext(Role.PATIENT);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenAppException);
  });

  it('should throw ForbiddenAppException if no user is present', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenAppException);
  });
});

