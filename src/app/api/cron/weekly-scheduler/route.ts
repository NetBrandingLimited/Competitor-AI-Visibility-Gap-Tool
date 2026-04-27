import { NextResponse, type NextRequest } from 'next/server';

import {
  isWeeklyDigestDue,
  listOrganizationIdsWithWeeklyDigestScheduleEnabled
} from '@/lib/digest/schedule';
import { runScheduledJob } from '@/lib/scheduler/runScheduledJob';

export const dynamic = 'force-dynamic';

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = request.headers.get('authorization');
  if (auth === `Bearer ${secret}`) {
    return true;
  }
  const header = request.headers.get('x-cron-secret');
  if (header === secret) {
    return true;
  }
  const q = request.nextUrl.searchParams.get('secret');
  if (q === secret) {
    return true;
  }
  return false;
}

function clampLimit(raw: string | null, fallback: number, max: number): number {
  if (!raw) {
    return fallback;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return fallback;
  }
  return Math.min(Math.floor(n), max);
}

async function handle(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const limit = clampLimit(request.nextUrl.searchParams.get('limit'), 25, 100);
  const fullPipeline =
    request.nextUrl.searchParams.get('full') === '1' ||
    request.nextUrl.searchParams.get('fullPipeline') === '1';
  const mode = fullPipeline ? ('full' as const) : ('digest-only' as const);

  const enabledIds = await listOrganizationIdsWithWeeklyDigestScheduleEnabled();
  const dueIds: string[] = [];
  for (const id of enabledIds) {
    if (await isWeeklyDigestDue(id, now)) {
      dueIds.push(id);
    }
  }

  const batch = dueIds.slice(0, limit);
  const results: Array<{
    organizationId: string;
    ok: boolean;
    mode?: typeof mode;
    digestGenerated?: boolean;
    pipelineRefreshedForDigest?: boolean;
    jobId?: string;
    error?: string;
  }> = [];

  for (const organizationId of batch) {
    try {
      const out = await runScheduledJob(organizationId, { mode });
      results.push({
        organizationId,
        ok: true,
        mode: out.mode,
        digestGenerated: out.digestGenerated,
        pipelineRefreshedForDigest: out.pipelineRefreshedForDigest,
        jobId: out.job.id
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scheduler job failed';
      results.push({ organizationId, ok: false, mode, error: message });
    }
  }

  return NextResponse.json({
    ranAt: now.toISOString(),
    schedulerMode: mode,
    scheduleEnabledOrgCount: enabledIds.length,
    dueCount: dueIds.length,
    processed: batch.length,
    truncated: dueIds.length > batch.length,
    results
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
