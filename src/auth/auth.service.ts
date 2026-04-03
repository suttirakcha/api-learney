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
import { MailService } from 'src/mail/mail.service';
import { TypedConfigService } from 'src/config/typed-config.service';
import { UsersService } from 'src/users/users.service';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { JwtService } from '@nestjs/jwt';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { ResetPasswordTokenPayload } from 'src/@types/jwt-payload.type';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly bcryptService: BcryptService,
    private readonly tokenService: AuthTokenService,

    private readonly authTokenService: AuthTokenService,
    private readonly typedConfigService: TypedConfigService,
    private readonly mailService: MailService,
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
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
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.userService.findByEmail(forgotPasswordDto.email);
    if (!user)
      throw new BadRequestException({
        message: 'Email not found',
        code: 'EMAIL_NOT_FOUND',
      });
    console.log('user ==>', user);
    const token = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        type: 'RESET_PASSWORD',
      },
      {
        secret: this.typedConfigService.get('JWT_SECRET'),
        expiresIn: this.typedConfigService.get(
          'RESET_PASSWORD_TOKEN_EXPIRES_IN',
        ),
      },
    );

    const resetUrl = new URL(
      this.typedConfigService.get('FRONTEND_RESET_PASSWORD_URL'),
    );
    resetUrl.searchParams.set('token', token);

    await this.mailService.sendResetPasswordEmail(
      user.email,
      resetUrl.toString(),
    );
  }
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    let payload: unknown;
    try {
      payload = await this.authTokenService.verify(resetPasswordDto.token);
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError')
        throw new UnauthorizedException({
          message: 'Reset password token has expired',
          code: 'RESET_PASSWORD_TOKEN_EXPIRED',
        });

      if (error instanceof Error && error.name === 'JsonWebTokenError')
        throw new UnauthorizedException({
          message: 'Invalid reset password token',
          code: 'INVALID_RESET_PASSWORD_TOKEN',
        });

      throw error;
    }

    if (!this.isResetPasswordPayload(payload))
      throw new UnauthorizedException({
        message: 'Invalid reset password token',
        code: 'INVALID_RESET_PASSWORD_TOKEN',
      });

    const user = await this.userService.findByEmail(payload.email);
    if (!user || user.id !== payload.sub)
      throw new UnauthorizedException({
        message: 'Invalid reset password token',
        code: 'INVALID_RESET_PASSWORD_TOKEN',
      });

    const hashedPassword = await this.bcryptService.hash(
      resetPasswordDto.password,
    );
    await this.userService.updatePassword(user.id, hashedPassword);
  }
  private isResetPasswordPayload(
    payload: unknown,
  ): payload is ResetPasswordTokenPayload {
    if (!payload || typeof payload !== 'object') return false;

    return (
      'type' in payload &&
      payload.type === 'RESET_PASSWORD' &&
      'sub' in payload &&
      typeof payload.sub === 'string' &&
      'email' in payload &&
      typeof payload.email === 'string'
    );
  }
}
