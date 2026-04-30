import { weeklyDigestPipelineLabel, weeklyDigestSignalsLabel, type WeeklyDigest } from '@/lib/digest/weekly';
import type { GapInsights } from '@/lib/insights/gap';
import type { TrendSnapshot } from '@/lib/trends/store';
import { buildCsvDocument } from './csv';

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
    'digestPipelineIngestionSource',
    'digestPipelineGscDiagnosticsSummary'
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
      '',
      ''
    ]
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
      '',
      ''
    ]
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
      '',
      ''
    ]
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
          latestDigest.summary.pipelineIngestionSource ?? '',
          latestDigest.summary.pipelineGscDiagnosticsSummary ?? ''
        ]
      ]
    : [];

  return buildCsvDocument(header, [...trendRows, ...opportunityRows, ...topicRows, ...digestRows]);
}
