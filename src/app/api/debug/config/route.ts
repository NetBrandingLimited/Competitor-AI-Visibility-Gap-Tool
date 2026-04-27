import { NextResponse, type NextRequest } from 'next/server';

import { resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { getFreshnessThresholds } from '@/lib/config/freshness';

export async function GET(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { freshHours, agingHours, misconfigured } = getFreshnessThresholds();

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    workspace: {
      organizationId: active.organizationId,
      organizationName: active.organizationName,
      role: active.role
    },
    freshnessThresholds: {
      freshHours,
      agingHours,
      misconfigured
    },
    runtime: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      allowDevAuthHeaders: process.env.ALLOW_DEV_AUTH_HEADERS === 'true'
    }
  });
}
