import { JwtPayload } from './jwt-payload.type';

declare module 'express' {
  interface Request {
    user?: JwtPayload;

    cookies: {
      refreshToken?: string;
    };
  }
}
