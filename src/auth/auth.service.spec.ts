import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { Role } from '../common/enums';
import { PrismaService } from '../prisma/prisma.service';
import { NamesService } from '../names/names.service';

jest.mock('bcrypt');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn(),
};

const mockNamesService = {
  generateName: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: NamesService, useValue: mockNamesService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = { email: 'test@example.com', password: 'password123' };

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: dto.email,
      });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should create a new user and return token + user session', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockNamesService.generateName.mockResolvedValue('SpicyMozzarella');
      const createdUser = {
        id: 'user-1',
        email: dto.email,
        role: Role.CUSTOMER,
        name: 'SpicyMozzarella',
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);
      mockJwtService.sign.mockReturnValue('customer-jwt');

      const result = await service.register(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          passwordHash: 'hashed_password',
          name: 'SpicyMozzarella',
          role: Role.CUSTOMER,
        },
        select: expect.any(Object),
      });
      expect(result).toEqual({
        token: 'customer-jwt',
        user: {
          id: 'user-1',
          email: dto.email,
          role: Role.CUSTOMER,
          name: 'SpicyMozzarella',
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: dto.email,
        role: Role.CUSTOMER,
      });
    });

    it('should create user with PIZZERIA_ADMIN role via registerPizzeriaOwner and return session', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockNamesService.generateName.mockResolvedValue('CrispyOwner');
      const createdUser = {
        id: 'owner-1',
        email: dto.email,
        role: Role.PIZZERIA_ADMIN,
        name: 'CrispyOwner',
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);
      mockJwtService.sign.mockReturnValue('owner-jwt');

      const result = await service.registerPizzeriaOwner(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            role: Role.PIZZERIA_ADMIN,
          }),
        }),
      );
      expect(result).toEqual({
        token: 'owner-jwt',
        user: {
          id: 'owner-1',
          email: dto.email,
          role: Role.PIZZERIA_ADMIN,
          name: 'CrispyOwner',
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 'owner-1',
        email: dto.email,
        role: Role.PIZZERIA_ADMIN,
      });
    });

    it('should throw ConflictException on registerPizzeriaOwner if email exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: '1',
        email: dto.email,
      });

      await expect(service.registerPizzeriaOwner(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash the password with cost factor 12', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockNamesService.generateName.mockResolvedValue('Name');
      mockPrisma.user.create.mockResolvedValue({});

      await service.register(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
    });
  });

  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'password123' };
    const dbUser = {
      id: 'user-1',
      email: dto.email,
      passwordHash: 'hashed',
      role: Role.CUSTOMER,
      name: 'SpicyMozzarella',
    };

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and user on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(dbUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(dto);

      expect(result).toEqual({
        token: 'jwt-token',
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          name: dbUser.name,
        },
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      });
    });

    // No saved delivery address is part of the auth user shape.
  });

  describe('issueSessionForUserId', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.issueSessionForUserId('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return token and user for an existing user', async () => {
      const row = {
        id: 'user-99',
        email: 'chef@example.com',
        role: Role.PIZZERIA_ADMIN,
        name: 'Chef',
      };
      mockPrisma.user.findUnique.mockResolvedValue(row);
      mockJwtService.sign.mockReturnValue('admin-jwt');

      const result = await service.issueSessionForUserId('user-99');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-99' },
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
        },
      });
      expect(result).toEqual({
        token: 'admin-jwt',
        user: {
          id: 'user-99',
          email: 'chef@example.com',
          role: Role.PIZZERIA_ADMIN,
          name: 'Chef',
        },
      });
    });
  });
});
