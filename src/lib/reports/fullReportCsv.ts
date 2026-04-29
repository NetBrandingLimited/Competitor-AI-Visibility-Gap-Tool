import { weeklyDigestPipelineLabel, weeklyDigestSignalsLabel, type WeeklyDigest } from '@/lib/digest/weekly';
import type { GapInsights } from '@/lib/insights/gap';
import type { TrendSnapshot } from '@/lib/trends/store';

function escapeCsv(value: string | number): string {
  const raw = String(value);
  // Prevent CSV formula injection when opened in spreadsheet apps.
  const str = /^[=+\-@]/.test(raw) || raw.startsWith('\t') ? `'${raw}` : raw;
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

export function buildVisibilityReportCsv(
  snapshots: TrendSnapshot[],
  gapInsights: GapInsights,
  latestDigest: WeeklyDigest | null
): string {
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

  return `\uFEFF${[header.join(','), ...trendRows, ...opportunityRows, ...topicRows, ...digestRows].join('\n')}`;
}
