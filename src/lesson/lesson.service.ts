import { Injectable } from '@nestjs/common';
import { CourseService } from 'src/course/course.service';

@Injectable()
export class LessonService {
  constructor(private readonly courseService: CourseService) {}
}
