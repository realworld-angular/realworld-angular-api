import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { NamesService } from '../names/names.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { Role } from '../common/enums';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly names: NamesService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.createRegisteredUser(dto, Role.CUSTOMER);
    return this.buildSession(user);
  }

  /** Registers a new pizzeria owner and returns JWT + user (same shape as login). */
  async registerPizzeriaOwner(dto: RegisterDto) {
    const user = await this.createRegisteredUser(dto, Role.PIZZERIA_ADMIN);
    return this.buildSession(user);
  }

  private async createRegisteredUser(dto: RegisterDto, role: Role) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const name = await this.names.generateName();

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name,
        role,
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
      },
    });
  }

  private buildSession(user: {
    id: string;
    email: string;
    role: string;
    name: string;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildSession(user);
  }

  async checkEmail(email: string): Promise<{ available: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return { available: !user };
  }

  /** Issue JWT + public user payload for an existing user. */
  async issueSessionForUserId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    return this.buildSession(user);
  }
}
