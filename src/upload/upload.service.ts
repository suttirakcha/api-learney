import { Injectable } from '@nestjs/common';

import { UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import cloudinary from '../config/cloudinary';

@Injectable()
export class UploadService {
  async uploadVideo(buffer: Buffer): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          upload_preset: process.env.UPLOAD_PRESET,
          resource_type: 'auto',
        },
        (error: any, result: UploadApiResponse | undefined) => {
          if (result) resolve(result);
          else reject(new Error((error as Error)?.message || 'Upload failed'));
        },
      );

      Readable.from(buffer).pipe(stream);
    });
  }
}
