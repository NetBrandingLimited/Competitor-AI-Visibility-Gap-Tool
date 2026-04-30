import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { listWeeklyDigests } from '@/lib/digest/weekly';
import { buildDownloadHeaders } from '@/lib/http/downloadHeaders';
import { buildGapInsightsFromLatestData, readGapLatestDataForOrg } from '@/lib/insights/gap';
import { buildVisibilityReportCsv } from '@/lib/reports/fullReportCsv';
import { readTrendSnapshots } from '@/lib/trends/store';

export async function GET() {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    return new Response('Unauthorized', { status: 401 });
  }

  const [snapshots, gapLatest, digests] = await Promise.all([
    readTrendSnapshots(active.organizationId),
    readGapLatestDataForOrg(active.organizationId),
    listWeeklyDigests(active.organizationId)
  ]);
  const gapInsights = buildGapInsightsFromLatestData(
    gapLatest.org,
    gapLatest.latestRun,
    snapshots.at(-1) ?? gapLatest.latestTrend,
    gapLatest.visibility
  );
  const latestDigest = digests[0] ?? null;
  const csv = buildVisibilityReportCsv(snapshots, gapInsights, latestDigest, gapLatest.visibility);

  return new Response(csv, {
    headers: buildDownloadHeaders('text/csv; charset=utf-8', 'visibility-report.csv')
  });
}
