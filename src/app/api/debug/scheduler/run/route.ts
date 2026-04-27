import { NextResponse, type NextRequest } from 'next/server';

import { activeOrgCanEdit, resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { runScheduledJob } from '@/lib/scheduler/runScheduledJob';
import { readSchedulerJobs } from '@/lib/scheduler/store';

export async function POST(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!activeOrgCanEdit(active)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  try {
    const query = request.nextUrl.searchParams.get('query') ?? 'ai visibility tool';
    const limitRaw = request.nextUrl.searchParams.get('limit');
    const limit = limitRaw ? Number(limitRaw) : undefined;
    const forceWeeklyDigest =
      request.nextUrl.searchParams.get('forceDigest') === '1' ||
      request.nextUrl.searchParams.get('forceWeeklyDigest') === '1';
    const digestOnly =
      request.nextUrl.searchParams.get('digestOnly') === '1' ||
      request.nextUrl.searchParams.get('mode') === 'digest-only';
    const result = await runScheduledJob(active.organizationId, {
      query,
      limitPerConnector: Number.isFinite(limit) ? limit : undefined,
      forceWeeklyDigest,
      mode: digestOnly ? 'digest-only' : 'full'
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Scheduler job failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const jobs = await readSchedulerJobs(active.organizationId);
  return NextResponse.json({ jobs, count: jobs.length, latest: jobs[0] ?? null });
}
