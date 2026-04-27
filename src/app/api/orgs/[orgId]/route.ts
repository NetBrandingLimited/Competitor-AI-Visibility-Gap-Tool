import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireOrgRole } from '@/lib/auth';

/** Example org-scoped route: requires membership at least VIEWER (dev headers). */
export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, createdAt: true }
  });

  if (!org) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    organization: org,
    viewer: { id: auth.user.id, email: auth.user.email, role: auth.role }
  });
}
