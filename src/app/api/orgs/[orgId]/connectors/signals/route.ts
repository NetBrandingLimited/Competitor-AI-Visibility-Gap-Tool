import { NextResponse, type NextRequest } from 'next/server';

import { requireOrgRole } from '@/lib/auth';
import { collectAllConnectorSignals } from '@/lib/connectors';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  try {
    const signals = await collectAllConnectorSignals({ organizationId: orgId });
    const fetchedAt = new Date();
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        connectorSignalsFetchedAt: fetchedAt,
        connectorSignalsJson: JSON.stringify(signals)
      }
    });
    return NextResponse.json({
      organizationId: orgId,
      fetchedAt: fetchedAt.toISOString(),
      signals
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Failed to fetch live connector signals.',
        detail: process.env.NODE_ENV === 'development' ? String(err) : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'EDITOR');
  if (auth instanceof Response) {
    return auth;
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      connectorSignalsFetchedAt: null,
      connectorSignalsJson: null
    }
  });

  return NextResponse.json({
    organizationId: orgId,
    cleared: true
  });
}
