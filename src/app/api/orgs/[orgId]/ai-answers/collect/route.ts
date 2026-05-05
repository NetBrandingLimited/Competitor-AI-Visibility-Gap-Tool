import { NextResponse, type NextRequest } from 'next/server';

import { collectAiAnswersForOrganization } from '@/lib/ai-visibility/collectAnswers';
import { requireOrgRole } from '@/lib/auth';

export async function POST(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'EDITOR');
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json().catch(() => ({}))) as { promptIds?: string[] };

  const summary = await collectAiAnswersForOrganization({
    organizationId: orgId,
    promptIds: Array.isArray(body.promptIds) ? body.promptIds.filter((x): x is string => typeof x === 'string') : undefined
  });

  return NextResponse.json({
    organizationId: orgId,
    summary,
    envHints: {
      openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
      anthropic: Boolean(process.env.ANTHROPIC_API_KEY?.trim())
    }
  });
}
