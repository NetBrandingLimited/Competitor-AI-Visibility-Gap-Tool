import type { User } from '@prisma/client';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

import { prisma } from './prisma';
import { isOrgRole, roleSatisfies, type OrgRole } from './roles';
import { SESSION_ORG_ID_COOKIE, SESSION_USER_ID_COOKIE } from './session';

export type ActiveOrgSession = {
  user: User;
  organizationId: string;
  organizationName: string;
  role: OrgRole;
};

async function loadActiveOrg(
  userId: string | undefined,
  orgCookie: string | undefined
): Promise<ActiveOrgSession | null> {
  if (!userId) {
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return null;
  }
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { organization: { createdAt: 'asc' } }
  });
  if (memberships.length === 0) {
    return null;
  }
  const fromCookie = orgCookie
    ? memberships.find((m) => m.organizationId === orgCookie)
    : undefined;
  const pick = fromCookie ?? memberships[0];
  if (!isOrgRole(pick.role)) {
    return null;
  }
  return {
    user,
    organizationId: pick.organizationId,
    organizationName: pick.organization.name,
    role: pick.role
  };
}

export async function resolveActiveOrgSessionForRequest(
  request: NextRequest
): Promise<ActiveOrgSession | null> {
  const userId = request.cookies.get(SESSION_USER_ID_COOKIE)?.value?.trim();
  const orgCookie = request.cookies.get(SESSION_ORG_ID_COOKIE)?.value?.trim();
  return loadActiveOrg(userId, orgCookie);
}

export async function resolveActiveOrgSessionForServerComponent(): Promise<ActiveOrgSession | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_USER_ID_COOKIE)?.value?.trim();
  const orgCookie = cookieStore.get(SESSION_ORG_ID_COOKIE)?.value?.trim();
  return loadActiveOrg(userId, orgCookie);
}

export function activeOrgCanEdit(active: ActiveOrgSession): boolean {
  return roleSatisfies(active.role, 'EDITOR');
}
