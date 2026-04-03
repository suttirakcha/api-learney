import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from 'src/database/generated/prisma/internal/prismaNamespace';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      throw new BadRequestException({
        message: 'Cart not found',
        code: 'CART_NOT_FOUND',
      });
    }

    const cartItems = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      include: {
        course: true,
      },
    });

    return {
      cart,
      courses: cartItems.map((item) => item.course),
    };
  }

  async addItemToCart(userId: string, courseId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId, total: 0, subtotal: 0 },
    });

    try {
      await this.prisma.cartItem.upsert({
        where: {
          cartItemIdentifier: {
            cartId: cart.id,
            courseId: courseId,
          },
        },
        update: {},
        create: {
          cartId: cart.id,
          courseId: courseId,
        },
        include: {
          course: {
            select: {
              courseName: true,
              instructor: true,
              price: true,
            },
          },
        },
      });
      return { message: 'Added course to cart' };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException({
          message: error.message,
          code: error.code,
        });
      }
      throw error;
    }
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

    try {
      await this.prisma.cartItem.delete({
        where: {
          cartItemIdentifier: {
            cartId: cart.id,
            courseId,
          },
        },
      });
      return { message: 'Removed course from cart' };
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        throw new BadRequestException({
          message: error.message,
          code: error.code,
        });
      }
      throw error;
    }
  }
}
