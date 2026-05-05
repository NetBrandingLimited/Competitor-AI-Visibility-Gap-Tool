import { weeklyDigestPipelineLabel, weeklyDigestSignalsLabel, type WeeklyDigest } from '@/lib/digest/weekly';
import type { GapInsights } from '@/lib/insights/gap';
import type { TrendSnapshot } from '@/lib/trends/store';
import { visibilityUsesLlmMentionSignal, type getLatestVisibilityScore } from '@/lib/visibility/scoreV1';
import { buildCsvDocument } from './csv';

type LatestVisibilitySnapshot = NonNullable<Awaited<ReturnType<typeof getLatestVisibilityScore>>>;

/** Empty cells for non–visibility-score rows (score + provenance + LLM rollup columns). */
const VISIBILITY_SCORE_CSV_TAIL_PLACEHOLDER = ['', '', '', '', '', '', '', '', '', '', ''] as const;

function visibilityScoreRowTail(v: LatestVisibilitySnapshot): string[] {
  const i = v.inputs;
  const mentionSource = visibilityUsesLlmMentionSignal(i) ? 'llm_answers' : 'trend_snapshot';
  return [
    String(Math.round(v.score)),
    v.createdAt,
    i.pipelineIngestionSource ?? '',
    i.pipelineGscDiagnosticsSummary ?? '',
    i.pipelineRunId ?? '',
    mentionSource,
    i.pipelineBrandShareOfVoice != null ? String(i.pipelineBrandShareOfVoice) : '',
    i.llmAvgBrandShareOfMentions != null ? String(i.llmAvgBrandShareOfMentions) : '',
    String(i.llmShareSampleCount ?? 0),
    i.llmBrandTopOrTiedRate != null ? String(i.llmBrandTopOrTiedRate) : '',
    String(i.llmAnswerSamplesScanned ?? 0)
  ];
}

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
    'visibilityPipelineRunId',
    'visibilityMentionShareSource',
    'visibilityPipelineBrandShareOfVoice',
    'visibilityLlmAvgBrandShareOfMentions',
    'visibilityLlmShareSampleCount',
    'visibilityLlmBrandTopOrTiedRate',
    'visibilityLlmAnswerSamplesScanned'
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
      ...VISIBILITY_SCORE_CSV_TAIL_PLACEHOLDER
    ]
  );

  const opportunityRows = gapInsights.opportunities.map((item) => {
    const gscRunId = item.pipelineRunIdForGsc?.trim() ?? '';
    const opportunityVisTail = ['', '', '', '', gscRunId, '', '', '', '', '', ''] as const;
    return [
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
      ...opportunityVisTail
    ];
  });

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
      ...VISIBILITY_SCORE_CSV_TAIL_PLACEHOLDER
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
          ...VISIBILITY_SCORE_CSV_TAIL_PLACEHOLDER
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
          ...visibilityScoreRowTail(latestVisibility)
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
