import { NextResponse, type NextRequest } from 'next/server';

import { requireOrgRole } from '@/lib/auth';
import { getWeeklyDigestForOrg } from '@/lib/digest/weekly';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; digestId: string }> }
) {
  const { orgId, digestId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  const digest = await getWeeklyDigestForOrg(orgId, digestId);
  if (!digest) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({ organizationId: orgId, digest });
}
