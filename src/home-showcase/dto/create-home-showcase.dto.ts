import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsUrl,
  Min,
  Max,
  IsEnum,
  IsDateString,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

const INTERNAL_OR_EXTERNAL_PATH_REGEX =
  /^(\/[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*|https?:\/\/[^\s]+)$/i;

function trimRequiredString(value: unknown) {
  return typeof value === 'string' ? value.trim() : value;
}

function trimOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export class CreateHomeShowcaseDto {
  @IsString()
  @Transform(({ value }) => trimRequiredString(value))
  title!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  subtitle?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  badge?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  description?: string;

  @IsString()
  @IsUrl()
  @Transform(({ value }) => trimRequiredString(value))
  desktopImageUrl!: string;

  @IsOptional()
  @IsString()
  @IsUrl()
  @Transform(({ value }) => trimOptionalString(value))
  mobileImageUrl?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  primaryText?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  @Matches(INTERNAL_OR_EXTERNAL_PATH_REGEX, {
    message: 'primaryHref must be a valid URL or internal path like /courses',
  })
  primaryHref?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  secondaryText?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  @Matches(INTERNAL_OR_EXTERNAL_PATH_REGEX, {
    message: 'secondaryHref must be a valid URL or internal path like /courses',
  })
  secondaryHref?: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  @Transform(({ value }) =>
    value === '' || value === null || typeof value === 'undefined'
      ? 0.18
      : Number(value),
  )
  overlayOpacity!: number;

  @IsOptional()
  @IsEnum(['left', 'center', 'right'], {
    message: 'textAlign must be left, center, or right',
  })
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  textAlign?: 'left' | 'center' | 'right';

  @IsOptional()
  @IsEnum(['left', 'right'], {
    message: 'mediaPosition must be left or right',
  })
  @IsString()
  @Transform(({ value }) => trimOptionalString(value))
  mediaPosition?: 'left' | 'right';

  @IsOptional()
  @IsBoolean()
  enableAnimation?: boolean;

  @IsOptional()
  @IsBoolean()
  enableFloating?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => trimOptionalString(value))
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  @Transform(({ value }) => trimOptionalString(value))
  endsAt?: string;
}
