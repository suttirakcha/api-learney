import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { PaymentStatus } from '@/database/generated/prisma/client';
import {
  MockPaymentConfirmResponse,
  MockPaymentDetailResponse,
  MockPaymentSession,
  MockPaymentSessionResponse,
} from './payment.types';
import {
  buildMockQrValue,
  buildMockReferenceCode,
  parsePaymentEvidence,
  serializePaymentEvidence,
} from './payment.utils';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  private buildSessionResponse(
    paymentId: string,
    latestSession: MockPaymentSession,
    courseCount: number,
  ): MockPaymentSessionResponse {
    return {
      paymentId,
      amount: latestSession.amount,
      status: 'PENDING',
      referenceCode: latestSession.referenceCode,
      qrCodeValue: latestSession.qrCodeValue,
      createdAt: latestSession.createdAt,
      courseCount,
    };
  }

  private toNumber(value: unknown): number {
    const parsedValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  private getCartAmount(
    total: unknown,
    cartItems: Array<{ course: { price: unknown } }>,
  ): number {
    const cartTotal = this.toNumber(total);

    if (cartTotal > 0) {
      return cartTotal;
    }

    return cartItems.reduce(
      (sum, item) => sum + this.toNumber(item.course.price),
      0,
    );
  }

  private async getCartSnapshot(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        cartItems: {
          include: {
            course: {
              select: {
                id: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found.');
    }

    if (!cart.cartItems.length) {
      throw new BadRequestException('Cart is empty.');
    }

    const courseIds = cart.cartItems.map((item) => item.courseId).sort();
    const amount = this.getCartAmount(cart.total, cart.cartItems);

    if (amount <= 0) {
      throw new BadRequestException('Cart total must be greater than zero.');
    }

    return {
      cart,
      amount,
      courseIds,
    };
  }

  private buildLatestSession(
    userId: string,
    amount: number,
    courseIds: string[],
  ): MockPaymentSession {
    const referenceCode = buildMockReferenceCode();
    const createdAt = new Date().toISOString();

    return {
      referenceCode,
      qrCodeValue: buildMockQrValue(referenceCode, amount, userId),
      amount,
      courseIds,
      createdAt,
      status: 'PENDING',
    };
  }

  async createMockSession(userId: string): Promise<MockPaymentSessionResponse> {
    const { cart, amount, courseIds } = await this.getCartSnapshot(userId);
    const latestSession = this.buildLatestSession(userId, amount, courseIds);
    const existingPayment = await this.prisma.payment.findUnique({
      where: { cartId: cart.id },
    });

    if (!existingPayment) {
      const createdPayment = await this.prisma.payment.create({
        data: {
          cart: { connect: { id: cart.id } },
          user: { connect: { id: userId } },
          amount: 0,
          status: PaymentStatus.PENDING,
          evidence: serializePaymentEvidence({
            latestSession,
            transactions: [],
          }),
        },
      });

      return this.buildSessionResponse(
        createdPayment.id,
        latestSession,
        courseIds.length,
      );
    }

    const parsedEvidence = parsePaymentEvidence(existingPayment.evidence);
    const updatedPayment = await this.prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        status:
          this.toNumber(existingPayment.amount) > 0
            ? PaymentStatus.SUCCESS
            : PaymentStatus.PENDING,
        evidence: serializePaymentEvidence({
          latestSession,
          transactions: parsedEvidence.transactions,
        }),
      },
    });

    return this.buildSessionResponse(
      updatedPayment.id,
      latestSession,
      courseIds.length,
    );
  }

  async getMockPayment(
    userId: string,
    paymentId: string,
  ): Promise<MockPaymentDetailResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    const parsedEvidence = parsePaymentEvidence(payment.evidence);

    return {
      paymentId: payment.id,
      paymentStatus: payment.status,
      sessionStatus: parsedEvidence.latestSession?.status ?? 'EMPTY',
      totalPaid: this.toNumber(payment.amount),
      latestSession: parsedEvidence.latestSession,
      transactionCount:
        parsedEvidence.transactions.length ||
        (payment.status === PaymentStatus.SUCCESS &&
        this.toNumber(payment.amount) > 0
          ? 1
          : 0),
    };
  }

  async confirmMockPayment(
    userId: string,
    paymentId: string,
  ): Promise<MockPaymentConfirmResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        userId,
      },
      include: {
        cart: {
          include: {
            cartItems: {
              include: {
                course: {
                  select: {
                    price: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found.');
    }

    const parsedEvidence = parsePaymentEvidence(payment.evidence);
    const latestSession = parsedEvidence.latestSession;

    if (!latestSession || latestSession.status !== 'PENDING') {
      throw new BadRequestException(
        'No pending payment session. Please create a new QR code.',
      );
    }

    const latestCourseIds = payment.cart.cartItems
      .map((item) => item.courseId)
      .sort();
    const latestAmount = this.getCartAmount(
      payment.cart.total,
      payment.cart.cartItems,
    );

    if (
      Math.abs(latestAmount - latestSession.amount) > 0.001 ||
      latestCourseIds.join(',') !==
        [...latestSession.courseIds].sort().join(',')
    ) {
      throw new BadRequestException(
        'Cart changed. Please create a new QR code before confirming payment.',
      );
    }

    const confirmedAt = new Date().toISOString();
    const confirmedSession = {
      ...latestSession,
      status: 'SUCCESS' as const,
    };
    const updatedPayment = await this.prisma.$transaction(async (tx) => {
      const existingEnrollments = await tx.enrolledCourse.findMany({
        where: {
          userId,
          courseId: {
            in: latestCourseIds,
          },
        },
        select: {
          courseId: true,
        },
      });
      const existingCourseIds = new Set(
        existingEnrollments.map((enrollment) => enrollment.courseId),
      );
      const missingEnrollments = latestCourseIds
        .filter((courseId) => !existingCourseIds.has(courseId))
        .map((courseId) => ({
          userId,
          courseId,
        }));

      if (missingEnrollments.length) {
        await tx.enrolledCourse.createMany({
          data: missingEnrollments,
        });
      }

      const nextTransactions = [
        ...parsedEvidence.transactions,
        {
          referenceCode: latestSession.referenceCode,
          amount: latestSession.amount,
          courseIds: latestCourseIds,
          confirmedAt,
        },
      ];

      const nextPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          amount: this.toNumber(payment.amount) + latestSession.amount,
          status: PaymentStatus.SUCCESS,
          evidence: serializePaymentEvidence({
            latestSession: confirmedSession,
            transactions: nextTransactions,
          }),
        },
      });

      if (
        payment.cart.appliedPromotionId &&
        this.toNumber(payment.cart.discount) > 0
      ) {
        await tx.promotionUsage.create({
          data: {
            promotionId: payment.cart.appliedPromotionId,
            userId,
            paymentId: payment.id,
            courseId: latestCourseIds[0] ?? null,
            codeApplied: payment.cart.appliedPromotionCode,
            discountAmount: payment.cart.discount ?? 0,
            orderAmount: payment.cart.subtotal,
          },
        });

        const usageCount = await tx.promotionUsage.count({
          where: {
            promotionId: payment.cart.appliedPromotionId,
          },
        });

        await tx.promotion.update({
          where: {
            id: payment.cart.appliedPromotionId,
          },
          data: {
            usageCount,
          },
        });
      }

      await tx.cartItem.deleteMany({
        where: { cartId: payment.cartId },
      });

      await tx.cart.update({
        where: { id: payment.cartId },
        data: {
          subtotal: 0,
          total: 0,
          discount: 0,
          appliedPromotionId: null,
          appliedPromotionCode: null,
        },
      });

      return {
        payment: nextPayment,
        enrolledCourseCount: missingEnrollments.length,
      };
    });

    return {
      paymentId: updatedPayment.payment.id,
      status: 'SUCCESS',
      amount: latestSession.amount,
      referenceCode: latestSession.referenceCode,
      confirmedAt,
      enrolledCourseCount: updatedPayment.enrolledCourseCount,
    };
  }
}
