import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { buildDownloadHeaders } from '@/lib/http/downloadHeaders';
import { readPipelineRuns } from '@/lib/pipeline/store';
import { buildPipelineRunsCsv } from '@/lib/reports/pipelineRunsCsv';

export async function GET() {
  const active = await resolveActiveOrgSessionForServerComponent();
  if (!active) {
    return new Response('Unauthorized', { status: 401 });
  }

  const runs = await readPipelineRuns(active.organizationId);
  const csv = buildPipelineRunsCsv(runs);

  return new Response(csv, {
    headers: buildDownloadHeaders('text/csv; charset=utf-8', 'pipeline-runs.csv')
  });
}
