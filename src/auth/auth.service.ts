import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { BcryptService } from '../shared/securities/services/bcrypt.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly bcryptService: BcryptService,
  ) {}

  async register(body: RegisterDto) {
    const { email, password } = body;

    // ❗ เช็ค email ซ้ำ
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    // 🔐 hash password
    const hashedPassword = await this.bcryptService.hash(password);

    // ✅ create user
    const user = await this.prisma.user.create({
      data: {
        ...body,
        password: hashedPassword,
      },
    });

    // const { password, ...rest } = user แก้

    // ❗ ไม่ส่ง password กลับ
    return {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
    };
  }
  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return {
      message: 'Login success',
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
      },
    };
  }
}
