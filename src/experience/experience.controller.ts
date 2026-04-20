import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ExperienceService } from './experience.service';
import {
  CatalogQueryDto,
  CreateReplyDto,
  CreateSkillAttemptDto,
  CreateThreadDto,
  ReportContentDto,
} from './dtos/experience.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthTokenService } from '../shared/securities/services/auth-token.service';

@Controller('experience')
export class ExperienceController {
  constructor(
    private readonly experienceService: ExperienceService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  private async getOptionalUserId(req: Request): Promise<string | null> {
    const authHeader = req.headers.authorization;
    const headerToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length)
        : null;
    const token = headerToken ?? req.cookies?.accessToken;

    if (!token) {
      return null;
    }

    try {
      const payload = await this.authTokenService.verify(token);
      return payload.sub;
    } catch {
      return null;
    }
  }

  @Get('bootstrap')
  getBootstrap() {
    return this.experienceService.getBootstrap();
  }

  @Get('home')
  getHomePage() {
    return this.experienceService.getHomePage();
  }

  @Get('courses')
  getCatalog(@Query() query: CatalogQueryDto) {
    return this.experienceService.getCatalog(query);
  }

  @Get('courses/:slugOrId')
  getCourseDetail(@Param('slugOrId') slugOrId: string) {
    return this.experienceService.getCourseDetail(slugOrId);
  }

  @Get('community')
  getCommunity(@Query('courseId') courseId?: string) {
    return this.experienceService.getCommunity(courseId);
  }

  @Post('community/threads')
  @UseGuards(AuthGuard)
  createThread(@Req() req: Request, @Body() dto: CreateThreadDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.experienceService.createCommunityThread(userId, dto);
  }

  @Post('community/threads/:threadId/replies')
  @UseGuards(AuthGuard)
  createReply(
    @Req() req: Request,
    @Param('threadId') threadId: string,
    @Body() dto: CreateReplyDto,
  ) {
    const userId = (req.user as { sub: string }).sub;
    return this.experienceService.createCommunityReply(userId, threadId, dto);
  }

  @Post('community/report')
  @UseGuards(AuthGuard)
  reportContent(@Req() req: Request, @Body() dto: ReportContentDto) {
    const userId = (req.user as { sub: string }).sub;
    return this.experienceService.reportCommunityContent(userId, dto);
  }

  @Get('promotions')
  getPromotions() {
    return this.experienceService.getPromotionsPage();
  }

  @Get('skill-test')
  getSkillTest(@Query('ageGroup') ageGroup?: string) {
    return this.experienceService.getSkillTestIntro(ageGroup);
  }

  @Post('skill-test/attempts')
  async createSkillAttempt(
    @Req() req: Request,
    @Body() dto: CreateSkillAttemptDto,
  ) {
    const userId = await this.getOptionalUserId(req);
    return this.experienceService.createSkillTestAttempt(userId, dto);
  }

  @Get('skill-test/attempts/:attemptId')
  getSkillAttempt(@Param('attemptId') attemptId: string) {
    return this.experienceService.getSkillTestAttemptResult(attemptId);
  }

  @Get('skill-test/attempts/:attemptId/careers')
  getCareerRecommendations(@Param('attemptId') attemptId: string) {
    return this.experienceService.getCareerRecommendations(attemptId);
  }

  @Get('skill-test/attempts/:attemptId/courses')
  getRecommendedCourses(@Param('attemptId') attemptId: string) {
    return this.experienceService.getRecommendedCourses(attemptId);
  }

  @Get('dashboard')
  @UseGuards(AuthGuard)
  getDashboard(@Req() req: Request) {
    const userId = (req.user as { sub: string }).sub;
    return this.experienceService.getDashboard(userId);
  }

  @Get('wishlist')
  @UseGuards(AuthGuard)
  getWishlist(@Req() req: Request) {
    const userId = (req.user as { sub: string }).sub;
    return this.experienceService.getWishlist(userId);
  }

  @Post('wishlist/:courseId')
  @UseGuards(AuthGuard)
  addWishlist(@Req() req: Request, @Param('courseId') courseId: string) {
    const userId = (req.user as { sub: string }).sub;
    return this.experienceService.toggleWishlist(userId, courseId, true);
  }

  @Delete('wishlist/:courseId')
  @UseGuards(AuthGuard)
  removeWishlist(@Req() req: Request, @Param('courseId') courseId: string) {
    const userId = (req.user as { sub: string }).sub;
    return this.experienceService.toggleWishlist(userId, courseId, false);
  }
}
