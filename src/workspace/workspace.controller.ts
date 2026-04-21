import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { WorkspaceService } from './workspace.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { WorkspaceQueryDto } from './dtos/workspace-query.dto';
import { WorkspaceActionDto } from './dtos/workspace-action.dto';
import { Permission, Role } from '../database/generated/prisma/enums';
import { JwtPayload } from '../types/jwt-payload.type';

@Controller('workspace')
@UseGuards(AuthGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get('session')
  getSession(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.workspaceService.getSession(user.sub);
  }

  @Get('admin/overview')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.ADMIN)
  @Permissions(Permission.VIEW_ADMIN_ANALYTICS)
  getAdminOverview() {
    return this.workspaceService.getAdminOverview();
  }

  @Get('admin/:section')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.ADMIN)
  @Permissions(Permission.MANAGE_COURSES)
  getAdminSection(
    @Param('section') section: string,
    @Query() query: WorkspaceQueryDto,
  ) {
    return this.workspaceService.getAdminSection(section, query);
  }

  @Post('admin/:section/actions')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.ADMIN)
  @Permissions(Permission.MANAGE_COURSES)
  applyAdminAction(
    @Req() req: Request,
    @Param('section') section: string,
    @Body() dto: WorkspaceActionDto,
  ) {
    const user = req.user as JwtPayload;
    return this.workspaceService.applyAdminAction(section, dto, user.sub);
  }

  @Get('instructor/overview')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.INSTRUCTOR)
  @Permissions(Permission.MANAGE_OWN_COURSES)
  getInstructorOverview(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.workspaceService.getInstructorOverview(user.sub);
  }

  @Get('instructor/:section')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.INSTRUCTOR)
  @Permissions(Permission.MANAGE_OWN_COURSES)
  getInstructorSection(
    @Req() req: Request,
    @Param('section') section: string,
    @Query() query: WorkspaceQueryDto,
  ) {
    const user = req.user as JwtPayload;
    return this.workspaceService.getInstructorSection(user.sub, section, query);
  }

  @Post('instructor/:section/actions')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.INSTRUCTOR)
  @Permissions(Permission.MANAGE_OWN_COURSES)
  applyInstructorAction(
    @Req() req: Request,
    @Param('section') section: string,
    @Body() dto: WorkspaceActionDto,
  ) {
    const user = req.user as JwtPayload;
    return this.workspaceService.applyInstructorAction(user.sub, section, dto);
  }

  @Get('student/overview')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.USER)
  @Permissions(Permission.MANAGE_OWN_PROFILE)
  getStudentOverview(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.workspaceService.getStudentOverview(user.sub);
  }

  @Get('student/:section')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.USER)
  @Permissions(Permission.MANAGE_OWN_PROFILE)
  getStudentSection(
    @Req() req: Request,
    @Param('section') section: string,
    @Query() query: WorkspaceQueryDto,
  ) {
    const user = req.user as JwtPayload;
    return this.workspaceService.getStudentSection(user.sub, section, query);
  }

  @Post('student/:section/actions')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.USER)
  @Permissions(Permission.MANAGE_OWN_PROFILE)
  applyStudentAction(
    @Req() req: Request,
    @Param('section') section: string,
    @Body() dto: WorkspaceActionDto,
  ) {
    const user = req.user as JwtPayload;
    return this.workspaceService.applyStudentAction(user.sub, section, dto);
  }

  @Get('student/exercises/:exerciseId')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.USER)
  @Permissions(Permission.MANAGE_OWN_PROFILE)
  getStudentExerciseDetail(
    @Req() req: Request,
    @Param('exerciseId') exerciseId: string,
  ) {
    const user = req.user as JwtPayload;
    return this.workspaceService.getStudentExerciseDetail(user.sub, exerciseId);
  }

  @Post('student/exercises/:exerciseId/attempts')
  @UseGuards(RoleGuard, PermissionGuard)
  @Roles(Role.USER)
  @Permissions(Permission.MANAGE_OWN_PROFILE)
  submitStudentExerciseAttempt(
    @Req() req: Request,
    @Param('exerciseId') exerciseId: string,
    @Body() dto: WorkspaceActionDto,
  ) {
    const user = req.user as JwtPayload;
    return this.workspaceService.submitStudentExerciseAttempt(
      user.sub,
      exerciseId,
      dto.payload ?? {},
    );
  }
}
