import { PrismaClient } from '@prisma/client';

import { resolveDatabaseUrl } from '@/lib/dbEnv';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

const databaseUrl = resolveDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(databaseUrl ? { datasources: { db: { url: databaseUrl } } } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
