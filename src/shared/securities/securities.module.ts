import { Module } from '@nestjs/common';
import { BcryptService } from './services/bcrypt.service';
import { AuthTokenService } from './services/auth-token.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfigOptions } from 'src/auth/config/jwt.config';

@Module({
  imports: [
    JwtModule.registerAsync(jwtConfigOptions), // ✅ สำคัญมาก
  ],
  providers: [BcryptService, AuthTokenService],
  exports: [BcryptService, AuthTokenService],
})
export class SecuritiesModule {}
