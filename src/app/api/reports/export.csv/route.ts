import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { listWeeklyDigests, weeklyDigestPipelineLabel, weeklyDigestSignalsLabel } from '@/lib/digest/weekly';
import { buildDownloadHeaders } from '@/lib/http/downloadHeaders';
import { buildGapInsightsFromLatestData, readGapLatestDataForOrg } from '@/lib/insights/gap';
import { readTrendSnapshots } from '@/lib/trends/store';

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
    'topicRecommendation',
    'digestId',
    'digestPeriodStart',
    'digestPeriodEnd',
    'digestScore',
    'digestConnectorSignals',
    'digestPipelineDocs',
    'digestPipelineIngestionSource'
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
      topic.recommendation,
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

  const latestDigest = digests[0] ?? null;
  const digestRows = latestDigest
    ? [
        [
          'weekly_digest',
          '',
          latestDigest.generatedAt,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          latestDigest.id,
          latestDigest.periodStart,
          latestDigest.periodEnd,
          latestDigest.summary.score ?? '',
          weeklyDigestSignalsLabel(latestDigest.summary),
          weeklyDigestPipelineLabel(latestDigest.summary),
          latestDigest.summary.pipelineIngestionSource ?? ''
        ]
          .map(escapeCsv)
          .join(',')
      ]
    : [];

  const csv = `\uFEFF${[header.join(','), ...trendRows, ...opportunityRows, ...topicRows, ...digestRows].join('\n')}`;

  return new Response(csv, {
    headers: buildDownloadHeaders('text/csv; charset=utf-8', 'visibility-report.csv')
  });
}
