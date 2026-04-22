import { Controller, Get } from '@nestjs/common';
import { HomeShowcaseService } from './home-showcase.service';

@Controller('home/showcase')
export class HomeShowcaseController {
  constructor(private readonly service: HomeShowcaseService) {}

  @Get('active')
  getActive() {
    return this.service.findActive();
  }
}
