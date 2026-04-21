import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PromotionService } from './promotion.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../database/generated/prisma/enums';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  QueryPromotionDto,
  ValidateCodeDto,
} from './dtos/promotion.dto';
import type { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.type';

@Controller('promotions')
export class PromotionController {
  constructor(private promotionService: PromotionService) {}

  @Get()
  getPromotions(@Query() query: QueryPromotionDto) {
    return this.promotionService.getPromotions(query);
  }

  @Get('active')
  getActivePromotions() {
    return this.promotionService.getActivePromotions();
  }

  @Post('validate-code')
  validateCode(@Body() dto: ValidateCodeDto) {
    return this.promotionService.validatePromoCode(dto);
  }

  @Get('admin/analytics')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  getAnalytics() {
    return this.promotionService.getAnalytics();
  }

  @Get('instructor/my-courses')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.INSTRUCTOR)
  getMyCoursesPromotions(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.promotionService.getInstructorPromotions(user.sub);
  }

  @Get(':id')
  getPromotion(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionService.getPromotionById(id);
  }

  @Post()
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  createPromotion(@Body() dto: CreatePromotionDto, @Req() req: Request) {
    void req;
    return this.promotionService.createPromotion(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  updatePromotion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
    @Req() req: Request,
  ) {
    void req;
    return this.promotionService.updatePromotion(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.ADMIN)
  deletePromotion(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionService.deletePromotion(id);
  }
}
