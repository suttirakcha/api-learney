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
          resource_type: 'video',
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
