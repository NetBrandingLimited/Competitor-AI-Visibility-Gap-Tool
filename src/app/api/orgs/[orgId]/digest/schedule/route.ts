import { NextResponse, type NextRequest } from 'next/server';

import { requireOrgRole } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      weeklyDigestScheduleEnabled: true,
      weeklyDigestScheduleDayUtc: true,
      weeklyDigestScheduleHourUtc: true,
      weeklyDigestRefreshPipelineFirst: true
    }
  });

  return NextResponse.json({
    organizationId: orgId,
    schedule: {
      enabled: org?.weeklyDigestScheduleEnabled ?? false,
      dayUtc: org?.weeklyDigestScheduleDayUtc ?? 1,
      hourUtc: org?.weeklyDigestScheduleHourUtc ?? 9,
      refreshPipelineFirst: org?.weeklyDigestRefreshPipelineFirst ?? false
    }
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'EDITOR');
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json().catch(() => ({}))) as {
    enabled?: boolean;
    dayUtc?: number;
    hourUtc?: number;
    refreshPipelineFirst?: boolean;
  };

  const updated = await prisma.organization.update({
    where: { id: orgId },
    data: {
      weeklyDigestScheduleEnabled: Boolean(body.enabled),
      weeklyDigestScheduleDayUtc: clampInt(body.dayUtc, 0, 6, 1),
      weeklyDigestScheduleHourUtc: clampInt(body.hourUtc, 0, 23, 9),
      weeklyDigestRefreshPipelineFirst: Boolean(body.refreshPipelineFirst)
    },
    select: {
      id: true,
      weeklyDigestScheduleEnabled: true,
      weeklyDigestScheduleDayUtc: true,
      weeklyDigestScheduleHourUtc: true,
      weeklyDigestRefreshPipelineFirst: true
    }
  });

  return NextResponse.json({
    organizationId: updated.id,
    schedule: {
      enabled: updated.weeklyDigestScheduleEnabled,
      dayUtc: updated.weeklyDigestScheduleDayUtc,
      hourUtc: updated.weeklyDigestScheduleHourUtc,
      refreshPipelineFirst: updated.weeklyDigestRefreshPipelineFirst
    }
  });
}
