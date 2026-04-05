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
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';

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

    // ✅ refresh token
    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    // 🔥 NEW: access token
    res.cookie('accessToken', data.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 15,
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

    res.cookie('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    // 🔥 NEW
    res.cookie('accessToken', data.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 15,
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

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    // 🔥 NEW
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 1000 * 60 * 15,
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken'); // 🔥 NEW

    return {
      message: 'Logged out',
    };
  }

  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'suss' };
  }
}
