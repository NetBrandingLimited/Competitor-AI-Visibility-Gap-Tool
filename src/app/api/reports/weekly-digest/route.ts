import { NextResponse, type NextRequest } from 'next/server';

import { resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { membershipCanEdit } from '@/lib/roles';
import { generateWeeklyDigest } from '@/lib/digest/weekly';

export async function POST(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!membershipCanEdit(active.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const digest = await generateWeeklyDigest(active.organizationId);
  return NextResponse.json({
    organizationId: active.organizationId,
    digest
  });
}
