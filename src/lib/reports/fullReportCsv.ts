import { weeklyDigestPipelineLabel, weeklyDigestSignalsLabel, type WeeklyDigest } from '@/lib/digest/weekly';
import type { GapInsights } from '@/lib/insights/gap';
import type { TrendSnapshot } from '@/lib/trends/store';
import type { getLatestVisibilityScore } from '@/lib/visibility/scoreV1';
import { buildCsvDocument } from './csv';

type LatestVisibilitySnapshot = NonNullable<Awaited<ReturnType<typeof getLatestVisibilityScore>>>;

const VIS_COLS_TAIL = ['', '', '', '', ''] as const;

export function buildVisibilityReportCsv(
  snapshots: TrendSnapshot[],
  gapInsights: GapInsights,
  latestDigest: WeeklyDigest | null,
  latestVisibility: LatestVisibilitySnapshot | null = null
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
    'digestPipelineGscDiagnosticsSummary',
    'visibilityScore',
    'visibilityCreatedAt',
    'visibilityPipelineIngestionSource',
    'visibilityPipelineGscDiagnosticsSummary',
    'visibilityPipelineRunId'
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
      '',
      ...VIS_COLS_TAIL
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
      '',
      ...VIS_COLS_TAIL
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
      '',
      ...VIS_COLS_TAIL
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
          latestDigest.summary.pipelineGscDiagnosticsSummary ?? '',
          ...VIS_COLS_TAIL
        ]
      ]
    : [];

  const visibilityRows = latestVisibility
    ? [
        [
          'visibility_score',
          '',
          latestVisibility.createdAt,
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
          '',
          '',
          '',
          '',
          Math.round(latestVisibility.score),
          latestVisibility.createdAt,
          latestVisibility.inputs.pipelineIngestionSource ?? '',
          latestVisibility.inputs.pipelineGscDiagnosticsSummary ?? '',
          latestVisibility.inputs.pipelineRunId ?? ''
        ]
      ]
    : [];

  return buildCsvDocument(header, [
    ...trendRows,
    ...opportunityRows,
    ...topicRows,
    ...digestRows,
    ...visibilityRows
  ]);
}
