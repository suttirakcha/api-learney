import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { HomeShowcaseService } from './home-showcase.service';
import { CreateHomeShowcaseDto } from './dto/create-home-showcase.dto';
import { UpdateHomeShowcaseDto } from './dto/update-home-showcase.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../database/generated/prisma/enums';

@Controller('admin/home-showcase')
@UseGuards(AuthGuard, RoleGuard)
@Roles(Role.ADMIN)
export class HomeShowcaseAdminController {
  constructor(private readonly service: HomeShowcaseService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  create(@Body() createHomeShowcaseDto: CreateHomeShowcaseDto) {
    return this.service.create(createHomeShowcaseDto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateHomeShowcaseDto: UpdateHomeShowcaseDto,
  ) {
    return this.service.update(id, updateHomeShowcaseDto);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.service.toggle(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
