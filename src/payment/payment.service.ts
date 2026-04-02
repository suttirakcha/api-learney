import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Prisma, PaymentStatus } from '@/database/generated/prisma';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        cartId: dto.cartId,
        userId: dto.userId,
        amount: new Prisma.Decimal(dto.amount),
        status: PaymentStatus.PENDING,
      },
    });
  }

  async findAll() {
    return this.prisma.payment.findMany({
      include: {
        user: true,
        cart: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
    });
  }

  async update(id: string, dto: UpdatePaymentDto) {
    return this.prisma.payment.update({
      where: { id },
      data: {
        status: dto.status,
        evidence: dto.evidence,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.payment.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: PaymentStatus) {
    return this.prisma.payment.update({
      where: { id },
      data: { status },
    });
  }
}
