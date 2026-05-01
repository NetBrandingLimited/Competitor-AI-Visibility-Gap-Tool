import type { NextRequest } from 'next/server';

import { resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { listWeeklyDigests } from '@/lib/digest/weekly';
import { buildDownloadHeaders } from '@/lib/http/downloadHeaders';
import { buildWeeklyDigestsCsv } from '@/lib/reports/weeklyDigestsCsv';

export async function GET(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return new Response('Unauthorized', { status: 401 });
  }

  const digests = await listWeeklyDigests(active.organizationId);
  const csv = buildWeeklyDigestsCsv(digests);

  return new Response(csv, {
    headers: buildDownloadHeaders('text/csv; charset=utf-8', 'weekly-digests.csv')
  });
}
