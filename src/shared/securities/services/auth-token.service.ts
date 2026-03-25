import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TypedConfigService } from '../../../config/typed-config.service';
import { JwtPayload } from '../../../types/jwt-payload.type';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly typedConfigService: TypedConfigService,
    private readonly jwtService: JwtService,
  ) {}

  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.typedConfigService.get('JWT_SECRET'),
      expiresIn: this.typedConfigService.get('JWT_EXPIRES_IN'),
    });
  }

  verify(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.typedConfigService.get('JWT_SECRET'),
    });
  }
}
