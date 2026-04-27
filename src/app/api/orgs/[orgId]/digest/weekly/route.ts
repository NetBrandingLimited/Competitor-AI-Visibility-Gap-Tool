import { NextResponse, type NextRequest } from 'next/server';

import { requireOrgRole } from '@/lib/auth';
import { generateWeeklyDigest, listWeeklyDigests } from '@/lib/digest/weekly';

export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  const items = await listWeeklyDigests(orgId);
  return NextResponse.json({
    organizationId: orgId,
    digests: items
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'EDITOR');
  if (auth instanceof Response) {
    return auth;
  }

  const digest = await generateWeeklyDigest(orgId);
  return NextResponse.json({
    organizationId: orgId,
    digest
  });
}
