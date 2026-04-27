import type { User } from '@prisma/client';
import type { NextRequest } from 'next/server';

import { prisma } from './prisma';
import { isOrgRole, roleSatisfies, type OrgRole } from './roles';
import { LEGACY_DEV_SESSION_EMAIL_COOKIE, SESSION_USER_ID_COOKIE } from './session';

export { roleSatisfies };

export type OrgAuthContext = {
  user: User;
  organizationId: string;
  role: OrgRole;
};

/** Resolves user from session cookie; in dev, legacy email cookie + header fallback when enabled. */
export async function getOrgAuthContext(
  request: NextRequest,
  organizationId: string
): Promise<OrgAuthContext | null> {
  const user = await resolveUserFromRequest(request);
  if (!user) {
    return null;
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId
      }
    }
  });

  if (!membership) {
    return null;
  }

  if (!isOrgRole(membership.role)) {
    return null;
  }

  return { user, organizationId, role: membership.role };
}

export async function requireOrgRole(
  request: NextRequest,
  organizationId: string,
  minimum: OrgRole
): Promise<OrgAuthContext | Response> {
  const ctx = await getOrgAuthContext(request, organizationId);
  if (!ctx) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }
  if (!roleSatisfies(ctx.role, minimum)) {
    return new Response(JSON.stringify({ error: 'forbidden', required: minimum }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    });
  }
  return ctx;
}

async function resolveUserFromRequest(request: NextRequest): Promise<User | null> {
  const userId = request.cookies.get(SESSION_USER_ID_COOKIE)?.value?.trim();
  if (userId) {
    return prisma.user.findUnique({ where: { id: userId } });
  }

  const allowDev = process.env.ALLOW_DEV_AUTH_HEADERS === 'true';
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev || !allowDev) {
    return null;
  }

  const cookieEmail = request.cookies.get(LEGACY_DEV_SESSION_EMAIL_COOKIE)?.value?.trim().toLowerCase();
  if (cookieEmail) {
    return prisma.user.findUnique({ where: { email: cookieEmail } });
  }

  const email = request.headers.get('x-dev-user-email')?.trim().toLowerCase();
  if (!email) {
    return null;
  }

  return prisma.user.findUnique({ where: { email } });
}
