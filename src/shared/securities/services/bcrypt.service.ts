import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

@Injectable()
export class BcryptService {
  hash(data: string) {
    // const SALT_ROUNDS = process.env.SALT_ROUNDS ?? 12;
    return bcrypt.hash(data, 12);
  }

  compare(data: string, digest: string) {
    return bcrypt.compare(data, digest);
  }
}
