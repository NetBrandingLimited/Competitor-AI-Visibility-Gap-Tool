import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { buildDownloadHeaders } from '@/lib/http/downloadHeaders';
import { buildGapInsightsFromLatestData } from '@/lib/insights/gap';
import { readLatestPipelineRun } from '@/lib/pipeline/store';
import { prisma } from '@/lib/prisma';
import { readTrendSnapshots } from '@/lib/trends/store';
import { getLatestVisibilityScore } from '@/lib/visibility/scoreV1';

function escapeCsv(value: string | number): string {
  const raw = String(value);
  // Prevent CSV formula injection when opened in spreadsheet apps.
  const str = /^[=+\-@]/.test(raw) || raw.startsWith('\t') ? `'${raw}` : raw;
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export async function GET() {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    return new Response('Unauthorized', { status: 401 });
  }

  const [snapshots, org, latestRun, latestVisibility] = await Promise.all([
    readTrendSnapshots(active.organizationId),
    prisma.organization.findUnique({
      where: { id: active.organizationId },
      select: {
        brandName: true,
        competitorA: true,
        competitorB: true,
        competitorC: true
      }
    }),
    readLatestPipelineRun(active.organizationId),
    getLatestVisibilityScore(active.organizationId)
  ]);
  const latestTrend = snapshots.at(-1) ?? null;
  const gapInsights = buildGapInsightsFromLatestData(org, latestRun, latestTrend, latestVisibility);

  const header = [
    'section',
    'date',
    'generatedAt',
    'totalMentions',
    'topBrand',
    'topBrandMentions',
    'opportunityId',
    'opportunityPriority',
    'opportunityTitle',
    'opportunityDetail',
    'topic',
    'topicGapScore',
    'topicTriggerCount',
    'topicClusterWeight',
    'topicRecommendation'
  ];

  const trendRows = snapshots.map((row) =>
    [
      'trend',
      row.date,
      row.generatedAt,
      row.totalMentions,
      row.topBrand,
      row.topBrandMentions,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]
      .map(escapeCsv)
      .join(',')
  );

  const opportunityRows = gapInsights.opportunities.map((item) =>
    [
      'gap_opportunity',
      '',
      gapInsights.generatedAt,
      '',
      '',
      '',
      item.id,
      item.priority,
      item.title,
      item.detail,
      '',
      '',
      '',
      '',
      ''
    ]
      .map(escapeCsv)
      .join(',')
  );

  const topicRows = gapInsights.topics.map((topic) =>
    [
      'gap_topic',
      '',
      gapInsights.generatedAt,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      topic.topic,
      topic.gapScore,
      topic.triggerCount,
      topic.clusterWeight,
      topic.recommendation
    ]
      .map(escapeCsv)
      .join(',')
  );
  const csv = `\uFEFF${[header.join(','), ...trendRows, ...opportunityRows, ...topicRows].join('\n')}`;

  return new Response(csv, {
    headers: buildDownloadHeaders('text/csv; charset=utf-8', 'visibility-report.csv')
  });
}
