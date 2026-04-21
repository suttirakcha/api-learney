import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsDate,
  IsArray,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsPositive,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  PromotionType,
  PromotionScopeType,
  SeasonalThemeKey,
} from '../../database/generated/prisma/enums';

export class QueryPromotionDto {
  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === undefined ? undefined : value === 'true' || value === true,
  )
  active?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit = 10;
}

export class CreatePromotionDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(PromotionType)
  type!: PromotionType;

  @IsOptional()
  @IsInt()
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  discountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  minimumSpend?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  usageLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsInt()
  @Min(0)
  priority!: number;

  @IsBoolean()
  stackable!: boolean;

  @IsEnum(PromotionScopeType)
  scope!: PromotionScopeType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryKeys?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  instructorIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  courseIds?: string[];

  @IsOptional()
  @IsString()
  banner?: string;

  @IsOptional()
  @IsString()
  promoCode?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsDate()
  @Transform(({ value }) => new Date(value))
  startDate!: Date;

  @IsDate()
  @Transform(({ value }) => new Date(value))
  endDate!: Date;

  @IsBoolean()
  active!: boolean;

  @IsOptional()
  @IsEnum(SeasonalThemeKey)
  themeKey?: SeasonalThemeKey;
}

export class UpdatePromotionDto extends PartialType(CreatePromotionDto) {}

export class ValidateCodeDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  courseIds?: string[];

  @IsOptional()
  @Min(0)
  @Type(() => Number)
  subtotal = 0;
}
