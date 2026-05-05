import { NextResponse, type NextRequest } from 'next/server';

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

  const rows = await prisma.aiAnswerSample.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      trackedPrompt: { select: { id: true, text: true, label: true } }
    }
  });

  return NextResponse.json({
    organizationId: orgId,
    samples: rows.map((r) => ({
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
      createdAt: r.createdAt.toISOString()
    }))
  });
}
