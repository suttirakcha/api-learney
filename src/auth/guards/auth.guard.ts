import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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

    const authHeader = request.headers.authorization;
    let token: string | undefined;

    // ✅ รองรับ header (เผื่อ)
    if (authHeader) {
      const [bearer, value] = authHeader.split(' ');
      if (bearer === 'Bearer') token = value;
    }

    // 🔥 ใช้ cookie
    if (!token) {
      token = request.cookies?.accessToken as string | undefined;
    }

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const payload = await this.authTokenService.verify(token);
    request.user = payload;

    return true;
  }
}
