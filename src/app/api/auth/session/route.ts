import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { isOrgRole } from '@/lib/roles';
import { LEGACY_DEV_SESSION_EMAIL_COOKIE, SESSION_USER_ID_COOKIE } from '@/lib/session';

async function resolveUserId(request: NextRequest): Promise<string | null> {
  const fromCookie = request.cookies.get(SESSION_USER_ID_COOKIE)?.value?.trim();
  if (fromCookie) {
    return fromCookie;
  }
  const legacyEmail = request.cookies.get(LEGACY_DEV_SESSION_EMAIL_COOKIE)?.value?.trim().toLowerCase();
  if (legacyEmail) {
    const u = await prisma.user.findUnique({ where: { email: legacyEmail }, select: { id: true } });
    return u?.id ?? null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ user: null, organizations: [] });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, name: true }
  });
  if (!user) {
    return NextResponse.json({ user: null, organizations: [] });
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: true
    }
  });

  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
    role: isOrgRole(m.role) ? m.role : 'VIEWER',
    brandName: m.organization.brandName,
    category: m.organization.category,
    competitorA: m.organization.competitorA,
    competitorB: m.organization.competitorB,
    competitorC: m.organization.competitorC,
    weeklyDigestNotifyEmail: m.organization.weeklyDigestNotifyEmail
  }));

  return NextResponse.json({ user, organizations });
}
