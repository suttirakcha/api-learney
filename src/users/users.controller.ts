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
import { AuthGuard } from '../auth/guards/auth.guard';
import { JwtPayload } from '../types/jwt-payload.type';
import { UsersService } from './users.service';
import { ChangePasswordDto } from './dtos/change-password.dto';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findUsers() {
    return this.usersService.findUsers();
  }

  @Post()
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.usersService.createUser(createUserDto);
  }

  @Get('me/overview')
  @UseGuards(AuthGuard)
  getMyOverview(@Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.usersService.getMyOverview(user.sub);
  }

  @Patch('me')
  @UseGuards(AuthGuard)
  updateMyProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const user = req.user as JwtPayload;
    return this.usersService.updateMyProfile(user.sub, dto);
  }

  @Patch('me/password')
  @UseGuards(AuthGuard)
  changeMyPassword(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    const user = req.user as JwtPayload;
    return this.usersService.changeMyPassword(user.sub, dto);
  }
}
