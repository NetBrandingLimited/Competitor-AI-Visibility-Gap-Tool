import { NextResponse, type NextRequest } from 'next/server';

import { resolveActiveOrgSessionForRequest } from '@/lib/active-org';

function envHours(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return fallback;
  }
  return n;
}

export async function GET(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const freshHours = envHours('FRESH_HOURS', 24);
  const agingHours = envHours('AGING_HOURS', 72);

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
      misconfigured: agingHours < freshHours
    },
    runtime: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      allowDevAuthHeaders: process.env.ALLOW_DEV_AUTH_HEADERS === 'true'
    }
  });
}
