import { NextResponse, type NextRequest } from 'next/server';

import { requireOrgRole } from '@/lib/auth';
import { buildGapInsightsForOrg } from '@/lib/insights/gap';

export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  const insights = await buildGapInsightsForOrg(orgId);
  return NextResponse.json({
    organizationId: orgId,
    insights
  });
}
