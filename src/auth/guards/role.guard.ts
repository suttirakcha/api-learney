import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { JwtPayload } from '../../types/jwt-payload.type';
import { Role } from '../../database/generated/prisma/enums';
import { ROLES } from '../decorators/roles.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles) return true;

    const request = context.switchToHttp().getRequest<Request>();

    const user = request.user as JwtPayload;

    if (!user?.role) {
      throw new UnauthorizedException('Authentication is required');
    }

    const grantedRoles = new Set([user.role, ...(user.roles ?? [])]);
    const hasRole = roles.some((role) => grantedRoles.has(role));

    if (!hasRole) {
      throw new ForbiddenException(
        'Insufficient permission to perform this action',
      );
    }

    return true;
  }
}
