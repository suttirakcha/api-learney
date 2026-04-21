import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { SkillTestService } from './skill-test.service';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
import { Req } from '@nestjs/common';

@Controller('skill-test')
export class SkillTestController {
  constructor(private service: SkillTestService) {}

  @Get('stages')
  getStages() {
    return this.service.getStages();
  }

  @Get('questions/:stageSlug')
  getQuestions(@Param('stageSlug') stageSlug: string) {
    return this.service.getQuestions(stageSlug);
  }

  @Post('sessions')
  // @UseGuards(JwtAuthGuard)
  createSession(@Body() body: { stageSlug: string; userId?: string }) {
    return this.service.createSession(
      body.stageSlug,
      body.userId || 'demo-user',
    );
  }

  @Post('sessions/:id/answer')
  // @UseGuards(JwtAuthGuard)
  addAnswer(
    @Param('id') id: string,
    @Body() body: { questionId: string; choiceValue: number },
  ) {
    return this.service.addAnswer(id, body.questionId, body.choiceValue);
  }

  @Post('sessions/:id/finish')
  async finishSession(@Param('id') id: string) {
    return this.service.finishSession(id);
  }

  @Get('result/:id')
  getResult(@Param('id') id: string) {
    return this.service.getResult(id);
  }

  // Admin
  // @Get('admin/questions')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  getAdminQuestions() {
    return this.service.getAdminQuestions();
  }

  // @Post('admin/questions')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles('ADMIN')
  createQuestion(@Body() body: any) {
    return this.service.createQuestion(body);
  }

  // more CRUD...
}
