import { NextResponse, type NextRequest } from 'next/server';

import { activeOrgCanEdit, resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { formatGscIngestionDiagnosticsSummary } from '@/lib/ingestion/gscDiagnostics';
import { readLatestPipelineRun, readPipelineRuns } from '@/lib/pipeline/store';
import { runUnifiedPipeline } from '@/lib/pipeline/runUnifiedPipeline';

export async function POST(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!activeOrgCanEdit(active)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const queryParam = request.nextUrl.searchParams.get('query')?.trim();
  const limitRaw = request.nextUrl.searchParams.get('limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const run = await runUnifiedPipeline({
    organizationId: active.organizationId,
    query: queryParam && queryParam.length > 0 ? queryParam : undefined,
    limitPerConnector: Number.isFinite(limit) ? limit : undefined
  });
  return NextResponse.json({
    run,
    gscDiagnosticsSummary: run.gscIngestionDiagnostics
      ? formatGscIngestionDiagnosticsSummary(run.gscIngestionDiagnostics)
      : null
  });
}

export async function GET(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const latest = await readLatestPipelineRun(active.organizationId);
  const runs = await readPipelineRuns(active.organizationId);
  return NextResponse.json({
    latest,
    latestGscDiagnosticsSummary: latest?.gscIngestionDiagnostics
      ? formatGscIngestionDiagnosticsSummary(latest.gscIngestionDiagnostics)
      : null,
    count: runs.length
  });
}
