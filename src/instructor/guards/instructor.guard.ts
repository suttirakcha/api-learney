import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../database/generated/prisma/enums';
import { ROLES } from '../../auth/decorators/roles.decorator';
import { JwtPayload } from '../../types/jwt-payload.type';

@Injectable()
export class InstructorGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: JwtPayload }>();

    if (!user) {
      return false;
    }

    return (
      requiredRoles.includes(user.role) || user.roles?.includes(Role.INSTRUCTOR)
    );
  }
}
