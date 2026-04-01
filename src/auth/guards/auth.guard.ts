import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthTokenService } from '../../shared/securities/services/auth-token.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

type RequestWithUser = Request & {
  user?: any;
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const [bearer, token] = request.headers.authorization?.split(' ') ?? [];

    if (bearer !== 'Bearer' || !token) {
      throw new BadRequestException('Invalid authorization header');
    }

    try {
      const payload = await this.authTokenService.verify(token);
      request.user = payload; // ✅ ไม่ error แล้ว
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }

      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }

      throw error;
    }

    return true;
  }
}
