import { NextResponse, type NextRequest } from 'next/server';

import { resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { readPipelineRunById } from '@/lib/pipeline/store';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ runId: string }> }
) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { runId } = await context.params;
  const run = await readPipelineRunById(active.organizationId, runId);
  if (!run) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  return NextResponse.json({ run });
}
