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
        course: {
          include: {
            instructor: true,
          },
        },
      },
    });

    return {
      cart,
      courses: cartItems.map((item) => ({
        ...item.course,
        instructor: item.course.instructor.fullname,
      })),
    };
  }

  private async updateCart(cartId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { cartId },
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

    const subtotal = cartItems.reduce(
      (acc, curr) => acc + Number(curr.course.price),
      0,
    );

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: { discount: true },
    });

    const discount = Number(cart?.discount || 0);
    const total = Math.max(0, subtotal - discount);

    return await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        total,
      },
    });
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

      await this.updateCart(cart.id);
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

      await this.updateCart(cart.id);
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
