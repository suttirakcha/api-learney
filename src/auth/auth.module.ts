// src/auth/auth.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaService } from '../database/prisma.service';
import { SecuritiesModule } from '../shared/securities/securities.module';
import { jwtConfigOptions } from './config/jwt.config';
import { AuthTokenService } from 'src/shared/securities/services/auth-token.service';
import { UsersModule } from 'src/users/users.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    JwtModule.registerAsync(jwtConfigOptions),
    SecuritiesModule,
    UsersModule,
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, AuthTokenService],
  exports: [AuthTokenService],
})
export class AuthModule {}
