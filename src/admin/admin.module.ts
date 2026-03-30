import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../database/prisma.service';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminService, PrismaService, RoleGuard],
})
export class AdminModule {}
