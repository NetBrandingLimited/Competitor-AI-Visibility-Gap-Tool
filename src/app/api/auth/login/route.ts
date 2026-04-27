import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';
import {
  LEGACY_DEV_SESSION_EMAIL_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  SESSION_ORG_ID_COOKIE,
  SESSION_USER_ID_COOKIE,
  sessionCookieBase
} from '@/lib/session';

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    username?: string;
    password?: string;
  };
  const normalized = body.username?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';

  if (!normalized || !password) {
    return NextResponse.json({ error: 'username_and_password_required' }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ username: normalized }, { email: normalized }]
    }
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name
    }
  });

  const cookieOpts = { ...sessionCookieBase(), maxAge: SESSION_COOKIE_MAX_AGE };
  response.cookies.set(SESSION_USER_ID_COOKIE, user.id, cookieOpts);

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    orderBy: { organization: { createdAt: 'asc' } }
  });
  if (membership) {
    response.cookies.set(SESSION_ORG_ID_COOKIE, membership.organizationId, cookieOpts);
  } else {
    response.cookies.set(SESSION_ORG_ID_COOKIE, '', { ...sessionCookieBase(), maxAge: 0 });
  }

  response.cookies.set(LEGACY_DEV_SESSION_EMAIL_COOKIE, '', {
    ...sessionCookieBase(),
    maxAge: 0
  });

  return response;
}
