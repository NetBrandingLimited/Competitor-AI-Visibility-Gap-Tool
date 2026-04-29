import { NextResponse, type NextRequest } from 'next/server';

import { activeOrgCanEdit, resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { runOrgIngestionDebug } from '@/lib/ingestion/pipeline';
import { defaultPipelineQueryFromOrg, simpleHash } from '@/lib/org-visibility-mock';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!activeOrgCanEdit(active)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: active.organizationId },
    select: {
      brandName: true,
      category: true,
      competitorA: true,
      competitorB: true,
      competitorC: true
    }
  });
  const brandContext = org
    ? {
        brandName: org.brandName,
        category: org.category,
        competitorA: org.competitorA,
        competitorB: org.competitorB,
        competitorC: org.competitorC
      }
    : {};

  const q = request.nextUrl.searchParams.get('query')?.trim();
  const query =
    q && q.length > 0 ? q : defaultPipelineQueryFromOrg(brandContext);
  const limitRaw = request.nextUrl.searchParams.get('limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;

  const { result, ingestionSource, gscDiagnostics } = await runOrgIngestionDebug({
    organizationId: active.organizationId,
    query,
    limitPerConnector: Number.isFinite(limit) ? limit : undefined,
    brandContext,
    contentVariant: simpleHash(`${active.organizationId}-${Date.now()}`)
  });

  return NextResponse.json({ ...result, ingestionSource, gscDiagnostics });
}
