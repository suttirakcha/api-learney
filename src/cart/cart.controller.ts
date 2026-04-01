// import { Controller, Post, Body, Delete } from '@nestjs/common';
// import { CartService } from './cart.service';
// import { CartDto } from './dto/cart.dto';

// @Controller('cart')
// export class CartController {
//   constructor(private readonly cartService: CartService) {}

//   @Post()
//   addItemToCart(@Body() cartDto: CartDto, userId: string) {
//     return this.cartService.addItemToCart(userId, cartDto.courseId);
//   }

//   @Delete()
//   removeItemFromCart(@Body() cartDto: CartDto, userId: string) {
//     return this.cartService.removeItemFromCart(userId, cartDto.courseId);
//   }
// }
