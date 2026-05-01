import type { NextRequest } from 'next/server';

import { resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { buildDownloadHeaders } from '@/lib/http/downloadHeaders';
import { buildTrendsCsv } from '@/lib/reports/trendsCsv';
import { readTrendSnapshots } from '@/lib/trends/store';

export async function GET(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return new Response('Unauthorized', { status: 401 });
  }

  const snapshots = await readTrendSnapshots(active.organizationId);
  const csv = buildTrendsCsv(snapshots);

  return new Response(csv, {
    headers: buildDownloadHeaders('text/csv; charset=utf-8', 'visibility-trends.csv')
  });
}
