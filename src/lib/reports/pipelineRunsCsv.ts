import type { UnifiedPipelineRun } from '@/lib/pipeline/types';

function escapeCsv(value: string | number): string {
  const raw = String(value);
  // Prevent CSV formula injection when opened in spreadsheet apps.
  const str = /^[=+\-@]/.test(raw) || raw.startsWith('\t') ? `'${raw}` : raw;
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

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
      .map(escapeCsv)
      .join(',')
  );
  return `\uFEFF${[header.join(','), ...rows].join('\n')}`;
}
