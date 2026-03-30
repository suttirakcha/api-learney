import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { TypedConfigService } from '../../../config/typed-config.service';
import { JwtPayload } from '../../../types/jwt-payload.type';

@Injectable()
export class AuthTokenService {
  constructor(
    private readonly typedConfigService: TypedConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async sign(payload: JwtPayload, options?: JwtSignOptions): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.typedConfigService.get('JWT_SECRET'),
      ...options, // ✅ merge options
    });
  }

  async verify(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.typedConfigService.get('JWT_SECRET'),
    });
  }
}
