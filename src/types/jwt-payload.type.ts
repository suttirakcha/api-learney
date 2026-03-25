import { Role } from '../database/generated/prisma/enums';

export type JwtPayload = {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
  role: Role;
};
