import { Permission, Role } from '../database/generated/prisma/enums';

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  roles: Role[];
  permissions: Permission[];
};
