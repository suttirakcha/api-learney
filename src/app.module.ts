import { Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { BcryptService } from './shared/securities/services/bcrypt.service';
import { AuthModule } from './auth/auth.module';

import { jwtConfigOptions } from './auth/config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from './config/config.module';
import { CartModule } from './cart/cart.module';

@Module({
  imports: [
    UsersModule,
    DatabaseModule,
    AuthModule,
    ConfigModule,
    JwtModule.registerAsync(jwtConfigOptions),
    CartModule,
  ],
  controllers: [],
  providers: [PrismaService, BcryptService],
})
export class AppModule {}
