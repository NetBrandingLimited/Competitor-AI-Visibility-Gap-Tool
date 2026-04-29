import { weeklyDigestPipelineLabel, weeklyDigestSignalsLabel, type WeeklyDigest } from '@/lib/digest/weekly';
import { buildCsvDocument } from './csv';

export function buildWeeklyDigestsCsv(digests: WeeklyDigest[]): string {
  const header = [
    'id',
    'generatedAt',
    'periodStart',
    'periodEnd',
    'score',
    'connectorSignals',
    'pipelineDocs',
    'pipelineIngestionSource',
    'topOpportunities'
  ];
  const rows = digests.map((digest) =>
    [
      digest.id,
      digest.generatedAt,
      digest.periodStart,
      digest.periodEnd,
      digest.summary.score ?? '',
      weeklyDigestSignalsLabel(digest.summary),
      weeklyDigestPipelineLabel(digest.summary),
      digest.summary.pipelineIngestionSource ?? '',
      digest.summary.topOpportunities.join(' | ')
    ]
  );
  return buildCsvDocument(header, rows);
}
