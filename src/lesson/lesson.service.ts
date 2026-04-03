import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { UploadService } from 'src/upload/upload.service';
import { CreateLessonDto } from './dtos/create-lesson.dto';
import { LessonType } from 'src/database/generated/prisma/enums';
import 'multer';

@Injectable()
export class LessonService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(
    courseId: string,
    dto: CreateLessonDto,
    file?: Express.Multer.File,
  ) {
    let videoUrl: string | null = null;

    // 👉 ถ้าเป็น VIDEO ต้องมี file
    if (dto.type === LessonType.VIDEO) {
      if (!file) {
        throw new BadRequestException('Video file is required');
      }

      const uploadResult = await this.uploadService.uploadVideo(file.buffer);
      videoUrl = uploadResult.secure_url;
    }

    // 👉 ถ้าเป็น DOCS ต้องมี docs
    if (dto.type === LessonType.DOCS && !dto.docs) {
      throw new BadRequestException('Docs content is required');
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

  async findByCourse(courseId: string) {
    return this.prisma.courseDetail.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async delete(id: string) {
    return this.prisma.courseDetail.delete({
      where: { id },
    });
  }
}
