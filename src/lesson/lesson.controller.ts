import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  Patch,
  Delete,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dtos/create-lesson.dto';
import { UpdateLessonDto } from './dtos/update-lesson.dto';
import { Multer } from 'multer';

@Controller('courses/:courseId/lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @UseInterceptors(FileInterceptor('video'))
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateLessonDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.lessonService.create(courseId, dto, file);
  }

  @Get()
  findAll(@Param('courseId') courseId: string) {
    return this.lessonService.findAll(courseId);
  }

  @Patch(':lessonId')
  @UseInterceptors(FileInterceptor('video'))
  update(
    @Param('lessonId') lessonId: string,
    @Body() dto: UpdateLessonDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.lessonService.update(lessonId, dto, file);
  }

  @Delete(':lessonId')
  remove(@Param('lessonId') lessonId: string) {
    return this.lessonService.remove(lessonId);
  }
}
