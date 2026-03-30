// src/admin/admin.controller.ts

import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Role } from '../database/generated/prisma/enums';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 📊 Dashboard
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  // 📥 pending + pagination
  @Get('courses/pending')
  getPendingCourses(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.adminService.getPendingCourses(+page, +limit);
  }

  // 📥 approved
  @Get('courses/approved')
  getApprovedCourses(@Query('page') page = '1', @Query('limit') limit = '10') {
    return this.adminService.getApprovedCourses(+page, +limit);
  }

  // ✅ approve
  @Patch('courses/:id/approve')
  approveCourse(@Param('id') id: string) {
    return this.adminService.approveCourse(id);
  }

  // ❌ delete
  @Delete('courses/:id')
  deleteCourse(@Param('id') id: string) {
    return this.adminService.deleteCourse(id);
  }
  @Get('course-performance')
  getCoursePerformance() {
    return this.adminService.getCoursePerformance();
  }

  @Get('categories')
  getCategories() {
    return this.adminService.getCategoryStats();
  }
}
