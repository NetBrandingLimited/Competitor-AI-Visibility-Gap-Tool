import { NextResponse } from 'next/server';

import {
  LEGACY_DEV_SESSION_EMAIL_COOKIE,
  SESSION_ORG_ID_COOKIE,
  SESSION_USER_ID_COOKIE,
  sessionCookieBase
} from '@/lib/session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const clear = { ...sessionCookieBase(), maxAge: 0 };
  response.cookies.set(SESSION_USER_ID_COOKIE, '', clear);
  response.cookies.set(SESSION_ORG_ID_COOKIE, '', clear);
  response.cookies.set(LEGACY_DEV_SESSION_EMAIL_COOKIE, '', clear);
  return response;
}
