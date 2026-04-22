import { Module } from '@nestjs/common';
import { HomeShowcaseService } from './home-showcase.service';
import { HomeShowcaseController } from './home-showcase.controller';
import { HomeShowcaseAdminController } from './home-showcase.admin.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [HomeShowcaseController, HomeShowcaseAdminController],
  providers: [HomeShowcaseService],
  exports: [HomeShowcaseService],
})
export class HomeShowcaseModule {}
