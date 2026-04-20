import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../database/generated/prisma/enums';

export const PERMISSIONS = Symbol('Permissions');

export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS, permissions);

