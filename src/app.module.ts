import { Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { BcryptService } from './shared/securities/services/bcrypt.service';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [UsersModule, DatabaseModule, AuthModule],
  controllers: [],
  providers: [PrismaService, BcryptService],
})
export class AppModule {}
