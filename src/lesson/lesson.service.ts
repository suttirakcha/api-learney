import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { CreateLessonDto } from './dtos/create-lesson.dto';
import { UpdateLessonDto } from './dtos/update-lesson.dto';

@Injectable()
export class LessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    courseId: string,
    dto: CreateLessonDto,
    file?: Express.Multer.File,
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) throw new NotFoundException('Course not found');

    let videoUrl: string | null = null;

    if (dto.type === 'VIDEO') {
      if (!file) {
        throw new BadRequestException('Video file required');
      }

      const uploadResult = await this.uploadService.uploadVideo(file.buffer);
      videoUrl = uploadResult.secure_url;
    }
    return this.prisma.courseDetail.create({
      data: {
        title: dto.title, // ⚠️ คุณใช้ id เป็น title (แนะนำเปลี่ยนชื่อ field)
        type: dto.type,
        video: videoUrl,
        docs: dto.docs,
        courseId,
      },
    });
  }
  async findAll(courseId: string) {
    return this.prisma.courseDetail.findMany({
      where: { courseId },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async update(
    lessonId: string,
    dto: UpdateLessonDto,
    file?: Express.Multer.File,
  ) {
    const lesson = await this.prisma.courseDetail.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    let videoUrl = lesson.video;

    if (file) {
      const uploadResult = await this.uploadService.uploadVideo(file.buffer);
      videoUrl = uploadResult.secure_url;
    }
    return this.prisma.courseDetail.update({
      where: { id: lessonId },
      data: {
        ...dto,
        video: dto.type === 'VIDEO' ? videoUrl : null,
        docs: dto.type === 'DOCS' ? dto.docs : null,
      },
    });
  }

  async remove(lessonId: string) {
    const lesson = await this.prisma.courseDetail.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) throw new NotFoundException('Lesson not found');

    return this.prisma.courseDetail.delete({
      where: { id: lessonId },
    });
  }
}
