import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../database/generated/prisma/enums';
import { JwtPayload } from '../types/jwt-payload.type';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @UseGuards(AuthGuard)
  updateProfile(
    @Req() req: Request,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const user = req.user as JwtPayload;
    return this.usersService.updateProfile(user.sub, updateProfileDto);
  }

  @Patch('me/password')
  @UseGuards(AuthGuard)
  changePassword(
    @Req() req: Request,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const user = req.user as JwtPayload;
    return this.usersService.changePassword(user.sub, changePasswordDto);
  }

  @Get('me/overview')
  @UseGuards(AuthGuard, RoleGuard)
  @Roles(Role.USER)
  getOverview(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.usersService.getOverview(user.sub);
  }

  @Get()
  findUsers() {
    return this.usersService.findUsers();
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }
}
