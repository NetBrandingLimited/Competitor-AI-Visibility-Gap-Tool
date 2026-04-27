import { NextResponse, type NextRequest } from 'next/server';

import { getOrgAuthContext } from '@/lib/auth';
import {
  SESSION_COOKIE_MAX_AGE,
  SESSION_ORG_ID_COOKIE,
  sessionCookieBase
} from '@/lib/session';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { organizationId?: string };
  const organizationId = body.organizationId?.trim() ?? '';
  if (!organizationId) {
    return NextResponse.json({ error: 'organization_id_required' }, { status: 400 });
  }

  const ctx = await getOrgAuthContext(request, organizationId);
  if (!ctx) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, organizationId });
  response.cookies.set(SESSION_ORG_ID_COOKIE, organizationId, {
    ...sessionCookieBase(),
    maxAge: SESSION_COOKIE_MAX_AGE
  });
  return response;
}
