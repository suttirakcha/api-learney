import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { DatabaseModule } from '../database/database.module';
import { UsersController } from './users.controller';
import { SecuritiesModule } from '../shared/securities/securities.module';

@Module({
  imports: [DatabaseModule, SecuritiesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
