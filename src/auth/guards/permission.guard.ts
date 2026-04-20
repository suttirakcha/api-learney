import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Permission } from '../../database/generated/prisma/enums';
import { JwtPayload } from '../../types/jwt-payload.type';
import { PERMISSIONS } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      Permission[] | undefined
    >(PERMISSIONS, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;

    if (!user?.sub) {
      throw new UnauthorizedException('Authentication is required');
    }

    const grantedPermissions = new Set(user.permissions ?? []);

    const hasPermission = requiredPermissions.every((permission) =>
      grantedPermissions.has(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permission to perform this action',
      );
    }

    return true;
  }
}

