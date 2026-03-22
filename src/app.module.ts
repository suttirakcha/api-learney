import { Module } from '@nestjs/common';
import { PrismaService } from './database/prisma.service';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { BcryptService } from './shared/securities/services/bcrypt.service';

@Module({
  imports: [UsersModule, DatabaseModule],
  controllers: [],
  providers: [PrismaService, BcryptService],
})
export class AppModule {}
