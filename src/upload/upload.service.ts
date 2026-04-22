import { Injectable } from '@nestjs/common';

import { UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import cloudinary from '../config/cloudinary';

@Injectable()
export class UploadService {
  async uploadVideo(buffer: Buffer): Promise<UploadApiResponse> {
    return this.uploadAsset(buffer, {
      upload_preset: process.env.UPLOAD_PRESET,
      resource_type: 'auto',
      folder: 'learney/videos',
    });
  }

  async uploadImage(buffer: Buffer): Promise<UploadApiResponse> {
    return this.uploadAsset(buffer, {
      upload_preset: process.env.UPLOAD_PRESET,
      resource_type: 'image',
      folder: 'learney/home-showcase',
    });
  }

  private async uploadAsset(
    buffer: Buffer,
    options: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error: any, result: UploadApiResponse | undefined) => {
          if (result) resolve(result);
          else reject(new Error((error as Error)?.message || 'Upload failed'));
        },
      );

      Readable.from(buffer).pipe(stream);
    });
  }
}
