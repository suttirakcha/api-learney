import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from 'src/database/generated/prisma/internal/prismaNamespace';
import { PromotionType } from 'src/database/generated/prisma/client';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async getCurrentCart(userId: string) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
      include: {
        appliedPromotion: true,
      },
    });
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
            promotions: {
              include: {
                promotion: true,
              },
            },
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

  private async calculatePromotionDiscount(params: {
    userId: string;
    subtotal: number;
    cartItems: Array<{
      courseId: string;
      course: {
        category: string;
        instructorId: string;
        price: unknown;
      };
    }>;
    promotionId?: string | null;
    code?: string | null;
  }) {
    const { userId, subtotal, cartItems, promotionId, code } = params;

    if (!promotionId && !code) {
      return {
        discount: 0,
        appliedPromotionId: null,
        appliedPromotionCode: null,
      };
    }

    const promotion = await this.prisma.promotion.findFirst({
      where: promotionId
        ? { id: promotionId }
        : {
            OR: [
              { code: code?.toUpperCase() },
              { promoCode: code?.toUpperCase() },
            ],
          },
      include: {
        courses: true,
        usages: true,
      },
    });

    if (!promotion || !promotion.active) {
      return {
        discount: 0,
        appliedPromotionId: null,
        appliedPromotionCode: null,
      };
    }

    const now = new Date();
    if (promotion.startDate > now || promotion.endDate < now) {
      throw new BadRequestException('โปรโมชันนี้อยู่นอกช่วงเวลาใช้งาน');
    }

    if (
      promotion.minimumSpend &&
      subtotal < this.toNumber(promotion.minimumSpend)
    ) {
      throw new BadRequestException('ยอดซื้อขั้นต่ำยังไม่ถึงเงื่อนไขโปรโมชัน');
    }

    if (
      promotion.usageLimit &&
      promotion.usages.length >= promotion.usageLimit
    ) {
      throw new BadRequestException('โปรโมชันนี้ถูกใช้งานครบจำนวนแล้ว');
    }

    const perUserUsage = promotion.usages.filter(
      (usage) => usage.userId === userId,
    );

    if (
      promotion.perUserLimit &&
      perUserUsage.length >= promotion.perUserLimit
    ) {
      throw new BadRequestException('คุณใช้โปรโมชันนี้ครบจำนวนที่กำหนดแล้ว');
    }

    const courseIds = new Set(promotion.courses.map((item) => item.courseId));

    const eligibleItems = cartItems.filter((item) => {
      if (promotion.scope === 'COURSE' && courseIds.size > 0) {
        return courseIds.has(item.courseId);
      }

      if (promotion.scope === 'CATEGORY' && promotion.categoryKeys.length > 0) {
        return promotion.categoryKeys.includes(item.course.category);
      }

      if (
        promotion.scope === 'INSTRUCTOR' &&
        promotion.instructorIds.length > 0
      ) {
        return promotion.instructorIds.includes(item.course.instructorId);
      }

      return true;
    });

    if (!eligibleItems.length) {
      throw new BadRequestException('โปรโมชันนี้ใช้กับตะกร้าปัจจุบันไม่ได้');
    }

    const eligibleSubtotal = eligibleItems.reduce(
      (sum, item) => sum + this.toNumber(item.course.price),
      0,
    );
    const numericDiscount =
      this.toNumber(promotion.discountAmount) ||
      this.toNumber(promotion.discount);
    const percentageTypes = new Set<PromotionType>([
      PromotionType.PERCENTAGE_DISCOUNT,
      PromotionType.FLASH_SALE,
      PromotionType.SEASONAL_SALE,
      PromotionType.PROMO_CODE,
      PromotionType.COUPON_CODE,
      PromotionType.FEATURED_CAMPAIGN,
      PromotionType.FIRST_USER_DISCOUNT,
      PromotionType.CATEGORY_PROMOTION,
      PromotionType.COURSE_PROMOTION,
      PromotionType.INSTRUCTOR_PROMOTION,
      PromotionType.SEASONAL_PROMOTION,
    ]);

    let discount = 0;

    if (promotion.type === PromotionType.BUY_ONE_GET_ONE) {
      discount = Math.min(
        ...eligibleItems.map((item) => this.toNumber(item.course.price)),
      );
    } else if (percentageTypes.has(promotion.type)) {
      discount = (eligibleSubtotal * numericDiscount) / 100;
    } else {
      discount = numericDiscount;
    }

    return {
      discount: Math.min(subtotal, Math.max(0, Number(discount.toFixed(2)))),
      appliedPromotionId: promotion.id,
      appliedPromotionCode:
        promotion.code ?? promotion.promoCode ?? code?.toUpperCase() ?? null,
    };
  }

  private async updateCart(cartId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { cartId },
      include: {
        course: {
          select: {
            courseName: true,
            category: true,
            instructorId: true,
            instructor: true,
            price: true,
          },
        },
      },
    });

    const subtotal = cartItems.reduce(
      (acc, curr) => acc + this.toNumber(curr.course.price),
      0,
    );

    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      select: {
        userId: true,
        appliedPromotionId: true,
        appliedPromotionCode: true,
      },
    });

    const promotionState = cart
      ? await this.calculatePromotionDiscount({
          userId: cart.userId,
          subtotal,
          cartItems,
          promotionId: cart.appliedPromotionId,
          code: cart.appliedPromotionCode,
        }).catch(() => ({
          discount: 0,
          appliedPromotionId: null,
          appliedPromotionCode: null,
        }))
      : {
          discount: 0,
          appliedPromotionId: null,
          appliedPromotionCode: null,
        };

    const total = Math.max(0, subtotal - promotionState.discount);

    return this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal,
        total,
        discount: promotionState.discount,
        appliedPromotionId: promotionState.appliedPromotionId,
        appliedPromotionCode: promotionState.appliedPromotionCode,
      },
    });
  }

  async addItemToCart(userId: string, courseId: string) {
    const cart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId, total: 0, subtotal: 0, discount: 0 },
    });

    try {
      await this.prisma.cartItem.upsert({
        where: {
          cartItemIdentifier: {
            cartId: cart.id,
            courseId,
          },
        },
        update: {},
        create: {
          cartId: cart.id,
          courseId,
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

  async applyPromotionCode(userId: string, code: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            course: {
              select: {
                category: true,
                instructorId: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!cart || !cart.cartItems.length) {
      throw new BadRequestException('กรุณาเพิ่มคอร์สลงตะกร้าก่อนใช้โปรโมชัน');
    }

    const subtotal = cart.cartItems.reduce(
      (sum, item) => sum + this.toNumber(item.course.price),
      0,
    );

    const promotionResult = await this.calculatePromotionDiscount({
      userId,
      subtotal,
      cartItems: cart.cartItems,
      code,
    });

    const updatedCart = await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        appliedPromotionId: promotionResult.appliedPromotionId,
        appliedPromotionCode: promotionResult.appliedPromotionCode,
        discount: promotionResult.discount,
        total: Math.max(0, subtotal - promotionResult.discount),
      },
    });

    return {
      message: 'ใช้โปรโมชันเรียบร้อยแล้ว',
      cart: updatedCart,
    };
  }

  async removePromotionCode(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const updatedCart = await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        appliedPromotionId: null,
        appliedPromotionCode: null,
        discount: 0,
        total: this.toNumber(cart.subtotal),
      },
    });

    return {
      message: 'ลบโปรโมชันออกจากตะกร้าแล้ว',
      cart: updatedCart,
    };
  }
}
