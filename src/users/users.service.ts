import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { BcryptService } from '../shared/securities/services/bcrypt.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bcryptService: BcryptService,
  ) {}

  async findUsers() {
    const users = await this.prisma.user.findMany();
    return users;
  }

  async createUser(createUserDto: CreateUserDto) {
    const hashedPassword = await this.bcryptService.hash(
      createUserDto.password,
    );
    const user = await this.prisma.user.create({
      data: {
        fullname: createUserDto.fullname,
        email: createUserDto.email,
        password: hashedPassword,
      },
    });
    return user;
  }
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }
  async updatePassword(id: string, password: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { password },
    });
  }
}
