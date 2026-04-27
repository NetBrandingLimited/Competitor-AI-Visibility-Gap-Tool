import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import {
  LEGACY_DEV_SESSION_EMAIL_COOKIE,
  SESSION_COOKIE_MAX_AGE,
  SESSION_ORG_ID_COOKIE,
  SESSION_USER_ID_COOKIE,
  sessionCookieBase
} from '@/lib/session';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    organizationName?: string;
  };
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  const organizationName = body.organizationName?.trim() ?? '';

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'email_in_use' }, { status: 409 });
  }

  const passwordHash = hashPassword(password);
  const orgDisplayName =
    organizationName || `${email.split('@')[0] ?? 'My'} workspace`;

  const { user, org } = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        email,
        passwordHash,
        name: email.split('@')[0] ?? null
      }
    });
    const o = await tx.organization.create({
      data: { name: orgDisplayName }
    });
    await tx.organizationMember.create({
      data: {
        userId: u.id,
        organizationId: o.id,
        role: 'ADMIN'
      }
    });
    return { user: u, org: o };
  });

  const response = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email },
    organizationId: org.id
  });

  const cookieOpts = { ...sessionCookieBase(), maxAge: SESSION_COOKIE_MAX_AGE };
  response.cookies.set(SESSION_USER_ID_COOKIE, user.id, cookieOpts);
  response.cookies.set(SESSION_ORG_ID_COOKIE, org.id, cookieOpts);
  response.cookies.set(LEGACY_DEV_SESSION_EMAIL_COOKIE, '', {
    ...sessionCookieBase(),
    maxAge: 0
  });

  return response;
}
