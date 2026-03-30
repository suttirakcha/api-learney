// src/auth/auth.service.ts

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { BcryptService } from '../shared/securities/services/bcrypt.service';
import { AuthTokenService } from '../shared/securities/services/auth-token.service';
import { JwtPayload } from '../types/jwt-payload.type';
import { Role } from '../database/generated/prisma/enums';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly bcryptService: BcryptService,
    private readonly tokenService: AuthTokenService,
  ) {}

  async generateTokens(user: { id: string; email: string; role: Role }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // ✅ แยก access / refresh
    const accessToken = await this.tokenService.sign(payload, {
      expiresIn: '15m',
    });

    const refreshToken = await this.tokenService.sign(payload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  async register(body: RegisterDto) {
    const { email, password, fullname, role } = body;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await this.bcryptService.hash(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        fullname,
        password: hashedPassword,
        role,
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await this.bcryptService.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);

    return {
      user,
      ...tokens,
    };
  }
}
