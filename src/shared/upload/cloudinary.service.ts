import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { TypedConfigService } from 'src/config/typed-config.service';

@Injectable()
export class CloudinaryService {
  constructor(private readonly typedConfigService: TypedConfigService) {
    cloudinary.config({
      cloud_name: typedConfigService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: typedConfigService.get('CLOUDINARY_API_KEY'),
      api_secret: typedConfigService.get('CLOUDINARY_API_SECRET'),
    });
  }
}
