import { Logger } from '@nestjs/common';
import z from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535),
  DATABASE_URL: z.url(),
  SALT_ROUNDS: z.coerce.number().int().min(10),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().int().positive(),
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
