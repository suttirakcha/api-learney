import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../database/generated/prisma/client';
import { PrismaService } from '../database/prisma.service';
import { CreateHomeShowcaseDto } from './dto/create-home-showcase.dto';
import { UpdateHomeShowcaseDto } from './dto/update-home-showcase.dto';

@Injectable()
export class HomeShowcaseService {
  constructor(private prisma: PrismaService) {}

  async findActive() {
    const now = new Date();

    return this.prisma.homeShowcase.findFirst({
      where: {
        isActive: true,
        AND: [
          {
            OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          },
          {
            OR: [{ endsAt: null }, { endsAt: { gte: now } }],
          },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async findAll() {
    return this.prisma.homeShowcase.findMany({
      orderBy: [
        { isActive: 'desc' },
        { sortOrder: 'asc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async create(dto: CreateHomeShowcaseDto) {
    const data = this.toPrismaData(dto);

    return this.prisma.homeShowcase.create({
      data,
    });
  }

  async update(id: string, dto: UpdateHomeShowcaseDto) {
    await this.findOne(id);
    const data = this.toPrismaData(dto);

    return this.prisma.homeShowcase.update({
      where: { id },
      data,
    });
  }

  async toggle(id: string) {
    const banner = await this.findOne(id);

    return this.prisma.homeShowcase.update({
      where: { id },
      data: { isActive: !banner.isActive },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.homeShowcase.delete({
      where: { id },
    });
  }

  private async findOne(id: string) {
    const banner = await this.prisma.homeShowcase.findUnique({ where: { id } });
    if (!banner) {
      throw new NotFoundException('Home Showcase not found');
    }
    return banner;
  }

  private toPrismaData(
    dto: CreateHomeShowcaseDto,
  ): Prisma.HomeShowcaseCreateInput;
  private toPrismaData(
    dto: UpdateHomeShowcaseDto,
  ): Prisma.HomeShowcaseUpdateInput;
  private toPrismaData(
    dto: CreateHomeShowcaseDto | UpdateHomeShowcaseDto,
  ): Prisma.HomeShowcaseCreateInput | Prisma.HomeShowcaseUpdateInput {
    const startsAt = this.parseOptionalDate(dto.startsAt);
    const endsAt = this.parseOptionalDate(dto.endsAt);

    if (startsAt && endsAt && startsAt > endsAt) {
      throw new BadRequestException(
        'startsAt must be earlier than or equal to endsAt',
      );
    }

    return {
      ...dto,
      subtitle: this.toNullableString(dto.subtitle),
      badge: this.toNullableString(dto.badge),
      description: this.toNullableString(dto.description),
      mobileImageUrl: this.toNullableString(dto.mobileImageUrl),
      primaryText: this.toNullableString(dto.primaryText),
      primaryHref: this.toNullableString(dto.primaryHref),
      secondaryText: this.toNullableString(dto.secondaryText),
      secondaryHref: this.toNullableString(dto.secondaryHref),
      startsAt,
      endsAt,
    };
  }

  private parseOptionalDate(value?: string | null) {
    if (typeof value === 'undefined') {
      return undefined;
    }

    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid datetime value');
    }

    return date;
  }

  private toNullableString(value?: string | null) {
    if (typeof value === 'undefined') {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
}
