import {
  Body,
  Controller,
  Post,
  Res,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { Public } from './decorators/public.decorator';
import { AuthTokenService } from '../shared/securities/services/auth-token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: AuthTokenService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.register(dto);

    // ✅ set refresh token (HttpOnly)
    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: false, // 👉 dev = false / production = true
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 วัน
    });

    return {
      user: data.user,
      accessToken: data.accessToken,
    };
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.login(dto);

    // ✅ set refresh token ONLY
    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: false, // 👉 dev = false
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return {
      user: data.user,
      accessToken: data.accessToken,
    };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies.refreshToken as string;

    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token');
    }

    const payload = await this.tokenService.verify(refreshToken);

    const tokens = await this.authService.generateTokens({
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    });

    // 🔥 refresh token rotation (สำคัญ)
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken');

    return {
      message: 'Logged out',
    };
  }
}
