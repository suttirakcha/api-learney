import { Logger } from '@nestjs/common';
import z from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return value;
}, z.boolean());

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const optionalEnvString = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).optional(),
);

const optionalEnvUrl = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().url().optional(),
);

const plainEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const displayNameEmailPattern = /^.+\s<[^<>\s@]+@[^\s@]+\.[^\s@]+>$/;

const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535),
  DATABASE_URL: z.url(),
  SALT_ROUNDS: z.coerce.number().int().min(10),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().int().positive(),
  CLOUD_NAME: z.string(),
  API_KEY: z.string(),
  API_SECRET: z.string(),
  MAIL_HOST: optionalEnvString,
  MAIL_PORT: z.coerce.number().int().positive().default(587),
  MAIL_USER: optionalEnvString,
  MAIL_PASSWORD: optionalEnvString,
  MAIL_FROM: z
    .string()
    .trim()
    .refine(
      (value) =>
        plainEmailPattern.test(value) || displayNameEmailPattern.test(value),
      {
        message:
          'MAIL_FROM must be either "email@example.com" or "Display Name <email@example.com>"',
      },
    )
    .default('no-reply@fakebuck.local'),
  MAIL_SECURE: booleanFromEnv.default(false),
  RESET_PASSWORD_TOKEN_EXPIRES_IN: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
  FRONTEND_RESET_PASSWORD_URL: optionalEnvUrl.default(
    'http://localhost:3000/reset-password',
  ),
  STRIPE_SECRET_KEY: optionalEnvString,
  STRIPE_WEBHOOK_SECRET: optionalEnvString,
  FRONTEND_URL: optionalEnvUrl.default('http://localhost:3000'),
});

export type EnvConfigType = z.infer<typeof envSchema>;

export const validate = (config: Record<string, any>) => {
  const { success, data, error } = envSchema.safeParse(config);
  if (!success) {
    const logger = new Logger('EnvValidation');
    logger.error(`Env validation failed: \n${z.prettifyError(error)}`);
    process.exit(1);
  }
  return data;
};
