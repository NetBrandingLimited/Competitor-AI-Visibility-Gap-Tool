import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { readPipelineRuns } from '@/lib/pipeline/store';

function escapeCsv(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
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
      run.limitPerConnector,
      run.documentCount,
      run.triggerCount,
      run.clusterCount
    ]
      .map(escapeCsv)
      .join(',')
  );
  const csv = [header.join(','), ...rows].join('\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="pipeline-runs.csv"'
    }
  });
}
