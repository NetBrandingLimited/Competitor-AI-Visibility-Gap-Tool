import type { UnifiedPipelineRun } from '@/lib/pipeline/types';
import { buildCsvDocument } from './csv';

export function buildPipelineRunsCsv(runs: UnifiedPipelineRun[]): string {
  const header = [
    'id',
    'createdAt',
    'query',
    'ingestionSource',
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
      run.limitPerConnector,
      run.documentCount,
      run.triggerCount,
      run.clusterCount
    ]
  );
  return buildCsvDocument(header, rows);
}
