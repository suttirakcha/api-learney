import { Module } from '@nestjs/common';
import { LessonController } from './lesson.controller';
import { LessonService } from './lesson.service';
import { CourseModule } from 'src/course/course.module';

@Module({
  imports: [CourseModule],
  controllers: [LessonController],
  providers: [LessonService],
})
export class LessonModule {}
