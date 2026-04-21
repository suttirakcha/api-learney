import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { InstructorService } from './instructor.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../database/generated/prisma/enums';
import { CreateCourseDto } from './dto/create-course.dto';
import { JwtPayload } from '../types/jwt-payload.type';

@Controller('instructor')
@UseGuards(AuthGuard, RoleGuard)
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  @Get('dashboard')
  @Roles(Role.INSTRUCTOR)
  async getDashboard(@Req() req: Request) {
    const user = req.user as JwtPayload;

    return this.instructorService.getDashboard(user.sub);
  }

  @Post('courses')
  @Roles(Role.INSTRUCTOR)
  async createCourse(@Req() req: Request, @Body() dto: CreateCourseDto) {
    const user = req.user as JwtPayload;
    return this.instructorService.createCourse(dto, user.sub);
  }

  @Patch('courses/:id')
  @Roles(Role.INSTRUCTOR)
  async updateCourse(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: CreateCourseDto,
  ) {
    const user = req.user as JwtPayload;
    return this.instructorService.updateCourse(id, dto, user.sub);
  }

  @Post('courses/:id/submit-review')
  @Roles(Role.INSTRUCTOR)
  async submitForReview(
    @Req() req: Request,
    @Param('id') id: string,
    @Body('notes') notes: string,
  ) {
    const user = req.user as JwtPayload;
    return this.instructorService.submitForReview(id, notes, user.sub);
  }

  @Get('courses')
  @Roles(Role.INSTRUCTOR)
  async getCourses(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.instructorService.getInstructorCourses(user.sub);
  }
}
