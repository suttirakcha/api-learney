import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { InstructorService } from './instructor.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../database/generated/prisma/enums';
import { JwtPayload } from '../types/jwt-payload.type';

@Controller('instructor')
@UseGuards(AuthGuard, RoleGuard)
export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  @Get('dashboard')
  @Roles(Role.INSTRUCTOR)
  async getDashboard(@Req() req: Request) {
    const user = req.user as JwtPayload; // ✅ แก้ตรงนี้

    return this.instructorService.getDashboard(user.sub);
  }
}
