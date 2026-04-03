import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { TypedConfigService } from 'src/config/typed-config.service';

@Injectable()
export class CloudinaryService {
  constructor(private readonly typedConfigService: TypedConfigService) {
    cloudinary.config({
      CLOUD_NAME: typedConfigService.get('CLOUD_NAME'),
      API_KEY: typedConfigService.get('API_KEY'),
      API_SECRET: typedConfigService.get('API_SECRET'),
    });
  }
}
