import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dtos/create-lesson.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('courses/:courseId/lessons')
export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Param('courseId') courseId: string,
    @Body() dto: CreateLessonDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.lessonService.create(courseId, dto, file);
  }

  @Get()
  findAll(@Param('courseId') courseId: string) {
    return this.lessonService.findByCourse(courseId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.lessonService.delete(id);
  }
}
