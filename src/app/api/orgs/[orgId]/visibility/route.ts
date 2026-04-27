import { NextResponse, type NextRequest } from 'next/server';

import { requireOrgRole } from '@/lib/auth';
import { computeAndPersistVisibilityScoreV1, getLatestVisibilityScore } from '@/lib/visibility/scoreV1';

export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  const latest = await getLatestVisibilityScore(orgId);
  if (!latest) {
    return NextResponse.json({
      organizationId: orgId,
      latest: null,
      message: 'No score yet. Run the unified pipeline or trend snapshot, or POST to recalculate.'
    });
  }

  return NextResponse.json({
    organizationId: orgId,
    latest: {
      score: latest.score,
      createdAt: latest.createdAt,
      reasons: latest.reasons,
      inputs: latest.inputs,
      signalSource: latest.inputs.connectorSignalSource,
      signalCount: latest.inputs.connectorSignalCount,
      signalsAsOf: latest.inputs.connectorSignalsAsOf
    }
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'EDITOR');
  if (auth instanceof Response) {
    return auth;
  }

  const result = await computeAndPersistVisibilityScoreV1(orgId);
  return NextResponse.json({
    organizationId: orgId,
    score: result.score,
    reasons: result.reasons,
    inputs: result.inputs,
    signalSource: result.inputs.connectorSignalSource,
    signalCount: result.inputs.connectorSignalCount,
    signalsAsOf: result.inputs.connectorSignalsAsOf
  });
}
