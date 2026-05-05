import { prisma } from '@/lib/prisma';
import type { OrgBrandFields } from '@/lib/org-visibility-mock';

import { analyzeLlmOutput } from './analyzeLlmOutput';

const DEFAULT_LIMIT = 50;

export type LlmRollupForScoring = {
  answerSamplesScanned: number;
  avgBrandShareOfMentions: number | null;
  shareSampleCount: number;
  brandTopOrTiedRate: number | null;
};

/**
 * Aggregate mention analytics over recent stored assistant answers (same window as the ai-answers API).
 */
export async function loadLlmRollupForScoring(
  organizationId: string,
  orgFields: OrgBrandFields | null,
  limit = DEFAULT_LIMIT
): Promise<LlmRollupForScoring> {
  const rows = await prisma.aiAnswerSample.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { answerText: true, error: true }
  });

  const shares: number[] = [];
  let topOrTiedCount = 0;

  for (const r of rows) {
    if (r.error || !r.answerText?.trim()) {
      continue;
    }
    const a = analyzeLlmOutput(r.answerText, orgFields);
    if (!a || a.brandShareOfMentions == null) {
      continue;
    }
    shares.push(a.brandShareOfMentions);
    if (a.brandIsTopOrTied) {
      topOrTiedCount += 1;
    }
  }

  const shareSampleCount = shares.length;
  const sum = shares.reduce((acc, x) => acc + x, 0);

  return {
    answerSamplesScanned: rows.length,
    avgBrandShareOfMentions: shareSampleCount > 0 ? sum / shareSampleCount : null,
    shareSampleCount,
    brandTopOrTiedRate: shareSampleCount > 0 ? topOrTiedCount / shareSampleCount : null
  };
}
