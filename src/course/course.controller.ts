import {
  Controller,
  Get,
  Param,
  Query,
  Body,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';

import { CourseService } from './course.service';
import { CreateCourseDto, QueryCourseDto } from './dtos/course.dto';

import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../database/generated/prisma/enums';

import type { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';

@Controller('courses')
export class CourseController {
  constructor(private courseService: CourseService) {}

  // ===============================
  // 🔥 PUBLIC
  // ===============================
  @Get()
  getCourses(@Query() query: QueryCourseDto) {
    return this.courseService.getCourses(query);
  }

  // ===============================
  // 🔥 INSTRUCTOR ROUTES (ต้องอยู่ก่อน :id)
  // ===============================
  @Get('me')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.INSTRUCTOR)
  getMyCourses(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.courseService.getMyCourses(user.sub);
  }

  @Get('dashboard')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.INSTRUCTOR)
  getDashboard(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.courseService.getInstructorDashboard(user.sub);
  }

  // ===============================
  // 🔥 CREATE COURSE
  // ===============================
  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.INSTRUCTOR)
  createCourse(@Req() req: Request, @Body() dto: CreateCourseDto) {
    const user = req.user as JwtPayload;
    return this.courseService.createCourse(user.sub, dto);
  }

  // ===============================
  // ❗ ต้องอยู่ล่างสุด (สำคัญมาก)
  // ===============================
  @Get(':id')
  getCourse(@Param('id') id: string) {
    return this.courseService.getCourseById(id);
  }
}
