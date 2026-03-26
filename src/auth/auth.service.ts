import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { BcryptService } from '../shared/securities/services/bcrypt.service';
import { AuthTokenService } from '../shared/securities/services/auth-token.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private readonly bcryptService: BcryptService,
    private readonly tokenService: AuthTokenService, // ✅ เพิ่ม
  ) {}

  async register(body: RegisterDto) {
    const { email, password, fullname, role } = body;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException({
        message: 'Email already exists',
        code: 'EMAIL_EXISTS',
      });
    }

    const hashedPassword = await this.bcryptService.hash(password);

    const user = await this.prisma.user.create({
      data: {
        email,
        fullname,
        password: hashedPassword,
        role,
      },
    });

    const token = await this.tokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
      },
      token,
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

    const isMatch = await this.bcryptService.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.tokenService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Login success',
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
      },
    };
  }
}
