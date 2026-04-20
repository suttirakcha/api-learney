import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { Public } from './decorators/public.decorator';
import { AuthTokenService } from '../shared/securities/services/auth-token.service';
import { ForgotPasswordDto } from './dtos/forgot-password.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { AuthGuard } from './guards/auth.guard';
import { UsersService } from '../users/users.service';
import { Permission, Role } from '../database/generated/prisma/enums';

const REFRESH_TOKEN_MAX_AGE = 1000 * 60 * 60 * 24 * 7;
const ACCESS_TOKEN_MAX_AGE = 1000 * 60 * 15;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: AuthTokenService,
    private readonly usersService: UsersService,
  ) {}

  private getCookieOptions(maxAge: number): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge,
    };
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    res.cookie(
      'refreshToken',
      refreshToken,
      this.getCookieOptions(REFRESH_TOKEN_MAX_AGE),
    );
    res.cookie(
      'accessToken',
      accessToken,
      this.getCookieOptions(ACCESS_TOKEN_MAX_AGE),
    );
  }

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.authService.register(dto);

    this.setAuthCookies(res, data.accessToken, data.refreshToken);

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

    this.setAuthCookies(res, data.accessToken, data.refreshToken);

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

    const user = await this.usersService.findByIdWithAccess(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const tokens = await this.authService.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role as Role,
      roles: (user.roles ?? []) as Role[],
      permissions: (user.permissions ?? []) as Permission[],
    });

    this.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req: Request) {
    const userId = (req.user as { sub: string }).sub;
    const user = await this.usersService.findByIdWithAccess(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    const cookieOptions = this.getCookieOptions(0);
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('accessToken', cookieOptions);

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
    return { message: 'Password reset successful' };
  }
}
