import { formatGscIngestionDiagnosticsSummary } from '@/lib/ingestion/gscDiagnostics';
import type { UnifiedPipelineRun } from '@/lib/pipeline/types';
import { buildCsvDocument } from './csv';

export function buildPipelineRunsCsv(runs: UnifiedPipelineRun[]): string {
  const header = [
    'id',
    'createdAt',
    'query',
    'ingestionSource',
    'gscDiagnosticsSummary',
    'limitPerConnector',
    'documentCount',
    'triggerCount',
    'clusterCount'
  ];
  const rows = runs.map((run) =>
    [
      run.id,
      run.createdAt,
      run.query,
      run.ingestionSource ?? '',
      run.gscIngestionDiagnostics ? formatGscIngestionDiagnosticsSummary(run.gscIngestionDiagnostics) : '',
      run.limitPerConnector,
      run.documentCount,
      run.triggerCount,
      run.clusterCount
    ]
  );
  return buildCsvDocument(header, rows);
}
