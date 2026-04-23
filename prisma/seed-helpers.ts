import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/database/generated/prisma/client';

export const t = (th: string, en: string) => ({ th, en });

export function createSeedPrisma() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}
