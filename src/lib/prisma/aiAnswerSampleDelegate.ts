import { prisma } from '@/lib/prisma';

/**
 * Narrow delegate for models added after an older generated client (or failed `prisma generate`).
 * Avoids `undefined.findMany` at runtime until the client is regenerated and the dev server restarted.
 */
export type AiAnswerSamplePrismaDelegate = {
  findMany: (args: object) => Promise<unknown[]>;
  create: (args: object) => Promise<unknown>;
};

let warnedMissing = false;

export function getAiAnswerSampleDelegate(): AiAnswerSamplePrismaDelegate | null {
  const raw = prisma as unknown as { aiAnswerSample?: AiAnswerSamplePrismaDelegate };
  const d = raw.aiAnswerSample;
  if (!d || typeof d.findMany !== 'function' || typeof d.create !== 'function') {
    if (!warnedMissing && process.env.NODE_ENV !== 'production') {
      warnedMissing = true;
      console.warn(
        '[prisma] `aiAnswerSample` is missing on the client. Run `npx prisma generate` (and migrations), then restart the dev server. On Windows, stop Node if `generate` fails with EPERM on the query engine DLL.'
      );
    }
    return null;
  }
  return d;
}
