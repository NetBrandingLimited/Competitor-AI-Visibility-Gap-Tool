import { NextResponse, type NextRequest } from 'next/server';

import { prisma } from '@/lib/prisma';
import { requireOrgRole } from '@/lib/auth';

export async function PATCH(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'EDITOR');
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json().catch(() => ({}))) as {
    brandName?: string | null;
    category?: string | null;
    competitorA?: string | null;
    competitorB?: string | null;
    competitorC?: string | null;
    weeklyDigestNotifyEmail?: string | null;
  };

  const notifyRaw = body.weeklyDigestNotifyEmail?.trim();
  const weeklyDigestNotifyEmail =
    notifyRaw && notifyRaw.length > 0 ? notifyRaw.toLowerCase().slice(0, 320) : null;

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      brandName: body.brandName?.trim() || null,
      category: body.category?.trim() || null,
      competitorA: body.competitorA?.trim() || null,
      competitorB: body.competitorB?.trim() || null,
      competitorC: body.competitorC?.trim() || null,
      weeklyDigestNotifyEmail
    },
    select: {
      id: true,
      name: true,
      brandName: true,
      category: true,
      competitorA: true,
      competitorB: true,
      competitorC: true,
      weeklyDigestNotifyEmail: true
    }
  });

  return NextResponse.json({ organization: org });
}
