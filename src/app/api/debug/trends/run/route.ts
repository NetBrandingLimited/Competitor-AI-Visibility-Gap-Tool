import { NextResponse, type NextRequest } from 'next/server';

import { activeOrgCanEdit, resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { runTrendsJob } from '@/lib/trends/job';
import { readTrendSnapshots } from '@/lib/trends/store';

/**
 * Cron-like job runner stub: trigger manually in development.
 */
export async function POST(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!activeOrgCanEdit(active)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const result = await runTrendsJob(active.organizationId);
  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const snapshots = await readTrendSnapshots(active.organizationId);
  return NextResponse.json({ snapshots });
}
