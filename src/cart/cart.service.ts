// import {
//   BadRequestException,
//   Injectable,
//   NotFoundException,
// } from '@nestjs/common';
// import { PrismaClientKnownRequestError } from 'src/database/generated/prisma/internal/prismaNamespace';
// import { PrismaService } from 'src/database/prisma.service';

// @Injectable()
// export class CartService {
//   constructor(private readonly prisma: PrismaService) {}

//   async addItemToCart(userId: string, courseId: string) {
//     const cart = await this.prisma.cart.upsert({
//       where: { userId },
//       update: {},
//       create: { userId, total: 0, subtotal: 0 },
//     });

//     try {
//       return await this.prisma.cartItem.upsert({
//         where: {
//           cartItemIdentifier: {
//             cartId: cart.id,
//             courseId: courseId,
//           },
//         },
//         update: {},
//         create: {
//           cartId: cart.id,
//           courseId: courseId,
//         },
//       });
//     } catch (error) {
//       if (
//         error instanceof PrismaClientKnownRequestError &&
//         error.code === 'P2002'
//       ) {
//         throw new BadRequestException({
//           message: error.message,
//           code: error.code,
//         });
//       }
//       throw error;
//     }
//   }

//   async removeItemFromCart(userId: string, courseId: string) {
//     const cart = await this.prisma.cart.findFirst({
//       where: { userId },
//     });

//     if (!cart) {
//       throw new NotFoundException({
//         message: 'Cart is empty',
//         code: 'CART_EMPTY',
//       });
//     }

//     try {
//       return this.prisma.cartItem.delete({
//         where: {
//           cartItemIdentifier: {
//             cartId: cart.id,
//             courseId,
//           },
//         },
//       });
//     } catch (error) {
//       if (
//         error instanceof PrismaClientKnownRequestError &&
//         error.code === 'P2002'
//       ) {
//         throw new BadRequestException({
//           message: error.message,
//           code: error.code,
//         });
//       }
//       throw error;
//     }
//   }
// }
