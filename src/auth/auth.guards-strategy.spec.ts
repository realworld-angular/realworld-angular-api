import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums';
import { ROLES_KEY } from './decorators/roles.decorator';

// ─── RolesGuard ──────────────────────────────────────────────────────────────

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  function createContext(
    role: string | undefined,
    requiredRoles: Role[] | null,
  ): ExecutionContext {
    const mockHandler = jest.fn();
    const mockClass = jest.fn();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
    return {
      getHandler: () => mockHandler,
      getClass: () => mockClass,
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    } as unknown as ExecutionContext;
  }

  it('should allow access when no roles are required', () => {
    const ctx = createContext(undefined, null);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when roles array is empty', () => {
    const ctx = createContext(undefined, []);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should allow access when user has required role', () => {
    const ctx = createContext(Role.PIZZERIA_ADMIN, [Role.PIZZERIA_ADMIN]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when user does not have required role', () => {
    const ctx = createContext(Role.CUSTOMER, [Role.PIZZERIA_ADMIN]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when user is undefined', () => {
    const ctx = createContext(undefined, [Role.PIZZERIA_ADMIN]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});

// ─── JwtStrategy ─────────────────────────────────────────────────────────────

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const mockPrisma = {
    user: { findUnique: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    jest.clearAllMocks();
  });

  it('should return the user when payload is valid', async () => {
    const dbRow = {
      id: 'user-1',
      email: 'a@b.com',
      role: Role.CUSTOMER,
      name: 'SpicyBasil',
    };
    mockPrisma.user.findUnique.mockResolvedValue(dbRow);

    const result = await strategy.validate({
      sub: 'user-1',
      email: 'a@b.com',
      role: Role.CUSTOMER,
    });

    expect(result).toEqual({
      id: 'user-1',
      email: 'a@b.com',
      role: Role.CUSTOMER,
      name: 'SpicyBasil',
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });
  });

  it('should throw UnauthorizedException when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({
        sub: 'missing',
        email: 'x@y.com',
        role: Role.CUSTOMER,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
