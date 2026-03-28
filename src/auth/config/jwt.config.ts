// src/shared/securities/jwt.config.ts

import { JwtModuleAsyncOptions } from '@nestjs/jwt';
import { TypedConfigService } from '../../config/typed-config.service';

export const jwtConfigOptions: JwtModuleAsyncOptions = {
  inject: [TypedConfigService],
  useFactory: (typedConfigService: TypedConfigService) => ({
    secret: typedConfigService.get('JWT_SECRET'),
    signOptions: {
      expiresIn: typedConfigService.get('JWT_EXPIRES_IN'),
    },
  }),
};
