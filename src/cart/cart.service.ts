import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async addItemToCart(userId: string, courseId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId, total: 0, subtotal: 0 },
    });

    return this.prisma.cartItem.upsert({
      where: {
        cartId_courseId: {
          cartId: cart.id,
          courseId: courseId,
        },
      },
      create: {
        cartId: cart.id,
        courseId: courseId,
      },
    });
  }

  async removeItemFromCart(userId: string, courseId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException({
        message: 'Cart is empty',
        code: 'CART_EMPTY',
      });
    }

    return this.prisma.cartItem.delete({
      where: {
        cartId_courseId: {
          cartId: cart.id,
          courseId,
        },
      },
    });
  }
}
