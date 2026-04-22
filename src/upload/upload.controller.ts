import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import type { Express } from 'express';

const IMAGE_MAX_SIZE = 8 * 1024 * 1024;

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    // ✅ เช็คก่อน
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.buffer) {
      throw new BadRequestException('Invalid file buffer');
    }

    // ✅ ค่อย cast หลังเช็ค
    const buffer = file.buffer;

    const result = await this.uploadService.uploadVideo(buffer);

    return {
      url: result.secure_url,
    };
  }

  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: IMAGE_MAX_SIZE,
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image uploaded');
    }

    if (!file.buffer) {
      throw new BadRequestException('Invalid image buffer');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const result = await this.uploadService.uploadImage(file.buffer);

    return {
      url: result.secure_url,
    };
  }
}
