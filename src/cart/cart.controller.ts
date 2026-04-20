import {
  Controller,
  Post,
  Body,
  Delete,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { CartDto } from './dto/cart.dto';
import { PromotionCodeDto } from './dto/promotion-code.dto';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { type Request } from 'express';
import { JwtPayload } from 'src/types/jwt-payload.type';

@Controller('cart')
@UseGuards(AuthGuard, RoleGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('')
  getCurrentCart(@Req() req: Request) {
    const userId = (req.user as JwtPayload).sub;
    return this.cartService.getCurrentCart(userId);
  }

  @Post()
  addItemToCart(@Body() cartDto: CartDto, @Req() req: Request) {
    const userId = (req.user as JwtPayload).sub;
    return this.cartService.addItemToCart(userId, cartDto.courseId);
  }

  @Delete()
  removeItemFromCart(@Body() cartDto: CartDto, @Req() req: Request) {
    const userId = (req.user as JwtPayload).sub;
    return this.cartService.removeItemFromCart(userId, cartDto.courseId);
  }

  @Post('promotion')
  applyPromotionCode(@Body() dto: PromotionCodeDto, @Req() req: Request) {
    const userId = (req.user as JwtPayload).sub;
    return this.cartService.applyPromotionCode(userId, dto.code);
  }

  @Delete('promotion')
  removePromotionCode(@Req() req: Request) {
    const userId = (req.user as JwtPayload).sub;
    return this.cartService.removePromotionCode(userId);
  }
}
