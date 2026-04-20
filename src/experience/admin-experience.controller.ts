import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ExperienceService } from './experience.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../database/generated/prisma/enums';
import { AdminConsoleActionDto } from './dtos/experience.dto';

@Controller('admin/console')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.ADMIN)
export class AdminExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}

  @Get('overview')
  getOverview() {
    return this.experienceService.getAdminOverview();
  }

  @Get(':section')
  getSection(@Param('section') section: string) {
    return this.experienceService.getAdminSection(section);
  }

  @Post(':section/actions')
  applyAction(
    @Req() req: Request,
    @Param('section') section: string,
    @Body() dto: AdminConsoleActionDto,
  ) {
    const adminId = (req.user as { sub: string }).sub;
    return this.experienceService.applyAdminAction(section, dto, adminId);
  }
}
