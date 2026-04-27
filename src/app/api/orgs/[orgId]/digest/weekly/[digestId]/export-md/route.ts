import { NextResponse, type NextRequest } from 'next/server';

import { requireOrgRole } from '@/lib/auth';
import { formatWeeklyDigestMarkdown } from '@/lib/digest/formatMarkdown';
import { getWeeklyDigestForOrg } from '@/lib/digest/weekly';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orgId: string; digestId: string }> }
) {
  const { orgId, digestId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  const [digest, org] = await Promise.all([
    getWeeklyDigestForOrg(orgId, digestId),
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } })
  ]);

  if (!digest) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const orgName = org?.name ?? orgId;
  const generatedLabel = new Date(digest.generatedAt).toLocaleString();
  const body = formatWeeklyDigestMarkdown({
    orgName,
    periodStart: digest.periodStart,
    periodEnd: digest.periodEnd,
    generatedAt: generatedLabel,
    summary: digest.summary
  });

  const safe = `${digest.periodStart}_${digest.periodEnd}`.replace(/[^\w.-]+/g, '-');
  const filename = `weekly-digest-${safe}.md`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`
    }
  });
}
