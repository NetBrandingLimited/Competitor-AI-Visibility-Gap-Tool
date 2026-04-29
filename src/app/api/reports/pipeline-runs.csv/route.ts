import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { buildDownloadHeaders } from '@/lib/http/downloadHeaders';
import { readPipelineRuns } from '@/lib/pipeline/store';

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

  const runs = await readPipelineRuns(active.organizationId);
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
  const csv = `\uFEFF${[header.join(','), ...rows].join('\n')}`;

  return new Response(csv, {
    headers: buildDownloadHeaders('text/csv; charset=utf-8', 'pipeline-runs.csv')
  });
}
