import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { PrismaService } from '../database/prisma.service';
import { BcryptService } from '../shared/securities/services/bcrypt.service';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

@Module({
  imports: [AuthModule],
  controllers: [WorkspaceController],
  providers: [
    WorkspaceService,
    PrismaService,
    BcryptService,
    AuthGuard,
    RoleGuard,
    PermissionGuard,
  ],
  exports: [WorkspaceService],
})
export class WorkspaceModule {}
