import { NextResponse, type NextRequest } from 'next/server';

import { analyzeLlmOutput, type LlmAnswerAnalytics } from '@/lib/ai-visibility/analyzeLlmOutput';
import { isPromptSurfaceId, PROMPT_SURFACE_LABELS } from '@/lib/ai-visibility/measurement';
import { requireOrgRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get('limit');
  let limit = 50;
  if (limitRaw != null) {
    const n = Number(limitRaw);
    if (Number.isFinite(n)) {
      limit = Math.min(100, Math.max(1, Math.floor(n)));
    }
  }
  const includeAnalytics = searchParams.get('analytics') !== '0';

  const [org, rows] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        brandName: true,
        category: true,
        competitorA: true,
        competitorB: true,
        competitorC: true
      }
    }),
    prisma.aiAnswerSample.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        trackedPrompt: { select: { id: true, text: true, label: true } }
      }
    })
  ]);

  const orgFields = org
    ? {
        brandName: org.brandName,
        category: org.category,
        competitorA: org.competitorA,
        competitorB: org.competitorB,
        competitorC: org.competitorC
      }
    : null;

  function analyticsForSample(answerText: string | null, err: string | null): LlmAnswerAnalytics | null {
    if (!includeAnalytics || err || !answerText) {
      return null;
    }
    return analyzeLlmOutput(answerText, orgFields);
  }

  const samples = rows.map((r) => ({
    id: r.id,
    trackedPromptId: r.trackedPromptId,
    promptText: r.trackedPrompt.text,
    promptLabel: r.trackedPrompt.label,
    surface: r.surface,
    surfaceLabel: isPromptSurfaceId(r.surface) ? PROMPT_SURFACE_LABELS[r.surface] : r.surface,
    provider: r.provider,
    model: r.model,
    answerText: r.answerText,
    error: r.error,
    createdAt: r.createdAt.toISOString(),
    analytics: analyticsForSample(r.answerText, r.error)
  }));

  let rollup: {
    samplesWithAnalytics: number;
    avgBrandShareOfMentions: number | null;
    shareCount: number;
  } | null = null;
  if (includeAnalytics) {
    const withShare = samples
      .map((s) => s.analytics?.brandShareOfMentions)
      .filter((x): x is number => typeof x === 'number' && Number.isFinite(x));
    const sum = withShare.reduce((a, b) => a + b, 0);
    rollup = {
      samplesWithAnalytics: samples.filter((s) => s.analytics != null).length,
      avgBrandShareOfMentions: withShare.length > 0 ? sum / withShare.length : null,
      shareCount: withShare.length
    };
  }

  return NextResponse.json({
    organizationId: orgId,
    samples,
    ...(rollup ? { analyticsRollup: rollup } : {})
  });
}
