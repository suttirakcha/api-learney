import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../database/generated/prisma/client';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  QueryPromotionDto,
  ValidateCodeDto,
} from './dtos/promotion.dto';

@Injectable()
export class PromotionService {
  constructor(private prisma: PrismaService) {}

  private slugify(value: string) {
    const normalized = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);

    return normalized || `promotion-${Date.now()}`;
  }

  private toLocalizedJson(value: string): Prisma.InputJsonValue {
    return {
      th: value,
      en: value,
    };
  }

  private toNullableDecimal(value?: number | null) {
    if (value === undefined || value === null) {
      return null;
    }

    return new Prisma.Decimal(value);
  }

  private normalizeCode(value?: string | null) {
    if (!value) {
      return null;
    }

    const normalized = value.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  async getPromotions(query: QueryPromotionDto) {
    const { type, active, category, limit = 10 } = query;
    return this.prisma.promotion.findMany({
      where: {
        ...(type && { type }),
        ...(active !== undefined && { active }),
        ...(category && { categoryKeys: { has: category } }),
      },
      include: {
        courses: { include: { course: true } },
        _count: { select: { usages: true } },
      },
      orderBy: { priority: 'desc', createdAt: 'desc' },
      take: limit,
    });
  }

  async getActivePromotions() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        courses: { include: { course: true } },
      },
      orderBy: { priority: 'desc' },
    });
  }

  async getPromotionById(id: string) {
    const promo = await this.prisma.promotion.findUnique({
      where: { id },
      include: {
        courses: { include: { course: true } },
        _count: { select: { usages: true } },
      },
    });
    if (!promo) throw new NotFoundException('Promotion not found');
    return promo;
  }

  async validatePromoCode(dto: ValidateCodeDto) {
    const { code, courseIds = [], subtotal = 0 } = dto;
    const now = new Date();
    const promo = await this.prisma.promotion.findFirst({
      where: {
        OR: [{ code: code.toUpperCase() }, { promoCode: code.toUpperCase() }],
        active: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        courses: true,
        _count: { select: { usages: true } },
      },
    });

    if (!promo) throw new BadRequestException('Invalid or expired promo code');

    if (promo.usageLimit && promo._count.usages >= promo.usageLimit) {
      throw new BadRequestException('Promo usage limit reached');
    }

    if (promo.minimumSpend && subtotal < Number(promo.minimumSpend)) {
      throw new BadRequestException('Minimum spend not met');
    }

    if (courseIds.length > 0 && promo.scope === 'COURSE') {
      const eligible = promo.courses.some((pc) =>
        courseIds.includes(pc.courseId),
      );
      if (!eligible) throw new BadRequestException('Courses not eligible');
    }

    const discount =
      Number(promo.discountAmount || 0) ||
      (Number(promo.discount || 0) / 100) * subtotal;
    return {
      valid: true,
      discount: Math.min(Number(promo.discountAmount || 0), Number(discount)),
      promotion: promo,
    };
  }

  async createPromotion(dto: CreatePromotionDto) {
    const normalizedCode = this.normalizeCode(dto.code ?? dto.promoCode);
    const slugSource = dto.slug ?? normalizedCode ?? dto.title;
    const slug = this.slugify(slugSource);

    return this.prisma.promotion.create({
      data: {
        slug,
        title: this.toLocalizedJson(dto.title),
        description: dto.description
          ? this.toLocalizedJson(dto.description)
          : Prisma.JsonNull,
        type: dto.type,
        discount: dto.discount ?? null,
        banner: dto.banner ?? null,
        promoCode: normalizedCode,
        code: normalizedCode,
        discountAmount: this.toNullableDecimal(dto.discountAmount),
        minimumSpend: this.toNullableDecimal(dto.minimumSpend),
        usageLimit: dto.usageLimit ?? null,
        perUserLimit: dto.perUserLimit ?? null,
        priority: dto.priority,
        stackable: dto.stackable,
        scope: dto.scope,
        categoryKeys: dto.categoryKeys ?? [],
        instructorIds: dto.instructorIds ?? [],
        startDate: dto.startDate,
        endDate: dto.endDate,
        active: dto.active,
        themeKey: dto.themeKey ?? null,
        ...(dto.courseIds?.length
          ? {
              courses: {
                create: dto.courseIds.map((courseId) => ({
                  course: { connect: { id: courseId } },
                })),
              },
            }
          : {}),
      },
      include: { courses: { include: { course: true } } },
    });
  }

  async updatePromotion(id: string, dto: UpdatePromotionDto) {
    await this.getPromotionById(id);
    const normalizedCode = this.normalizeCode(dto.code ?? dto.promoCode);

    const data: Prisma.PromotionUpdateInput = {
      ...(dto.slug !== undefined
        ? { slug: this.slugify(dto.slug || dto.title || id) }
        : {}),
      ...(dto.title !== undefined
        ? { title: this.toLocalizedJson(dto.title) }
        : {}),
      ...(dto.description !== undefined
        ? {
            description: dto.description
              ? this.toLocalizedJson(dto.description)
              : Prisma.JsonNull,
          }
        : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.discount !== undefined ? { discount: dto.discount } : {}),
      ...(dto.banner !== undefined ? { banner: dto.banner || null } : {}),
      ...(dto.code !== undefined || dto.promoCode !== undefined
        ? {
            code: normalizedCode,
            promoCode: normalizedCode,
          }
        : {}),
      ...(dto.discountAmount !== undefined
        ? { discountAmount: this.toNullableDecimal(dto.discountAmount) }
        : {}),
      ...(dto.minimumSpend !== undefined
        ? { minimumSpend: this.toNullableDecimal(dto.minimumSpend) }
        : {}),
      ...(dto.usageLimit !== undefined ? { usageLimit: dto.usageLimit } : {}),
      ...(dto.perUserLimit !== undefined
        ? { perUserLimit: dto.perUserLimit }
        : {}),
      ...(dto.priority !== undefined ? { priority: dto.priority } : {}),
      ...(dto.stackable !== undefined ? { stackable: dto.stackable } : {}),
      ...(dto.scope !== undefined ? { scope: dto.scope } : {}),
      ...(dto.categoryKeys !== undefined
        ? { categoryKeys: dto.categoryKeys }
        : {}),
      ...(dto.instructorIds !== undefined
        ? { instructorIds: dto.instructorIds }
        : {}),
      ...(dto.startDate !== undefined ? { startDate: dto.startDate } : {}),
      ...(dto.endDate !== undefined ? { endDate: dto.endDate } : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
      ...(dto.themeKey !== undefined ? { themeKey: dto.themeKey } : {}),
    };

    const promotion = await this.prisma.promotion.update({
      where: { id },
      data,
      include: { courses: { include: { course: true } } },
    });

    if (dto.courseIds !== undefined) {
      await this.prisma.promotionCourse.deleteMany({
        where: { promotionId: id },
      });

      if (dto.courseIds.length > 0) {
        await this.prisma.promotionCourse.createMany({
          data: dto.courseIds.map((courseId) => ({
            promotionId: id,
            courseId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return this.getPromotionById(promotion.id);
  }

  async deletePromotion(id: string) {
    await this.getPromotionById(id);
    return this.prisma.promotion.delete({ where: { id } });
  }

  async getAnalytics() {
    return this.prisma.promotion.groupBy({
      by: ['type'],
      _sum: { usageCount: true },
      _count: { id: true },
    });
  }

  async getInstructorPromotions(instructorId: string) {
    return this.prisma.promotion.findMany({
      where: {
        active: true,
        instructorIds: { has: instructorId },
      },
      include: {
        courses: {
          where: { course: { instructorId } },
          include: { course: true },
        },
      },
    });
  }
}
