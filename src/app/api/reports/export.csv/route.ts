import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { buildGapInsightsForOrg } from '@/lib/insights/gap';
import { readTrendSnapshots } from '@/lib/trends/store';

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export async function GET() {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    return new Response('Unauthorized', { status: 401 });
  }

  const [snapshots, gapInsights] = await Promise.all([
    readTrendSnapshots(active.organizationId),
    buildGapInsightsForOrg(active.organizationId)
  ]);

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
  const csv = [header.join(','), ...trendRows, ...opportunityRows, ...topicRows].join('\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="visibility-report.csv"'
    }
  });
}
