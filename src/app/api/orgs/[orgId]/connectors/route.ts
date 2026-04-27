import { NextResponse, type NextRequest } from 'next/server';
import { google } from 'googleapis';

import { requireOrgRole } from '@/lib/auth';
import { getAllConnectorHealth } from '@/lib/connectors';
import { rollingGscWindowDays } from '@/lib/connectors/gsc-date-range';
import { createGoogleAuth } from '@/lib/connectors/google-service-account-auth';
import { readOrgConnectorSettings, resolveGa4PropertyId, resolveGscSiteUrl } from '@/lib/connectors/org-settings';
import type { VisibilitySignal } from '@/lib/connectors/types';
import { encryptSecret } from '@/lib/crypto/secrets';
import { prisma } from '@/lib/prisma';

/**
 * Connector adapter health (GSC / GA4-ready). Signals stay empty until API auth is implemented.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'VIEWER');
  if (auth instanceof Response) {
    return auth;
  }

  const [connectors, org] = await Promise.all([
    getAllConnectorHealth({ organizationId: orgId }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        gscSiteUrl: true,
        ga4PropertyId: true,
        gscServiceAccountJsonEnc: true,
        ga4ServiceAccountJsonEnc: true,
        connectorTestedAt: true,
        connectorTestResultsJson: true,
        connectorSignalsFetchedAt: true,
        connectorSignalsJson: true
      }
    })
  ]);
  const testResults = parseCachedTests(org?.connectorTestResultsJson);
  const signalResults = parseCachedSignals(org?.connectorSignalsJson);
  return NextResponse.json({
    organizationId: orgId,
    settings: {
      gscSiteUrl: org?.gscSiteUrl ?? null,
      ga4PropertyId: org?.ga4PropertyId ?? null,
      hasGscServiceAccountJson: Boolean(org?.gscServiceAccountJsonEnc),
      hasGa4ServiceAccountJson: Boolean(org?.ga4ServiceAccountJsonEnc)
    },
    connectors,
    cachedTest: {
      testedAt: org?.connectorTestedAt?.toISOString() ?? null,
      results: testResults
    },
    cachedSignals: {
      fetchedAt: org?.connectorSignalsFetchedAt?.toISOString() ?? null,
      signals: signalResults
    }
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'EDITOR');
  if (auth instanceof Response) {
    return auth;
  }

  const body = (await request.json().catch(() => ({}))) as {
    gscSiteUrl?: string | null;
    ga4PropertyId?: string | null;
    gscServiceAccountJson?: string | null;
    ga4ServiceAccountJson?: string | null;
  };
  const normalize = (value?: string | null): string | null => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };
  let gscServiceAccountJsonEnc: string | null | undefined;
  let ga4ServiceAccountJsonEnc: string | null | undefined;
  const gscCred = normalize(body.gscServiceAccountJson);
  const ga4Cred = normalize(body.ga4ServiceAccountJson);
  try {
    if (body.gscServiceAccountJson !== undefined) {
      gscServiceAccountJsonEnc = gscCred ? encryptSecret(gscCred) : null;
    }
    if (body.ga4ServiceAccountJson !== undefined) {
      ga4ServiceAccountJsonEnc = ga4Cred ? encryptSecret(ga4Cred) : null;
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Failed to encrypt connector credentials. Set APP_SECRETS_KEY on the server.',
        detail: process.env.NODE_ENV === 'development' ? String(err) : undefined
      },
      { status: 400 }
    );
  }

  const organization = await prisma.organization.update({
    where: { id: orgId },
    data: {
      gscSiteUrl: body.gscSiteUrl?.trim() || null,
      ga4PropertyId: body.ga4PropertyId?.trim() || null,
      gscServiceAccountJsonEnc,
      ga4ServiceAccountJsonEnc
    },
    select: {
      id: true,
      gscSiteUrl: true,
      ga4PropertyId: true,
      gscServiceAccountJsonEnc: true,
      ga4ServiceAccountJsonEnc: true
    }
  });

  return NextResponse.json({
    organization: {
      id: organization.id,
      gscSiteUrl: organization.gscSiteUrl,
      ga4PropertyId: organization.ga4PropertyId,
      hasGscServiceAccountJson: Boolean(organization.gscServiceAccountJsonEnc),
      hasGa4ServiceAccountJson: Boolean(organization.ga4ServiceAccountJsonEnc)
    }
  });
}

type ConnectorTestResult = {
  id: 'google_search_console' | 'google_analytics_4';
  ok: boolean;
  detail: string;
};

function parseCachedSignals(raw: string | null | undefined): VisibilitySignal[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is VisibilitySignal => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      const rec = item as Record<string, unknown>;
      return (
        (rec.source === 'google_search_console' || rec.source === 'google_analytics_4') &&
        typeof rec.metric === 'string' &&
        typeof rec.value === 'number' &&
        typeof rec.asOf === 'string'
      );
    });
  } catch {
    return [];
  }
}

function parseCachedTests(raw: string | null | undefined): ConnectorTestResult[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is ConnectorTestResult => {
      if (!item || typeof item !== 'object') {
        return false;
      }
      const rec = item as Record<string, unknown>;
      const validId = rec.id === 'google_search_console' || rec.id === 'google_analytics_4';
      return validId && typeof rec.ok === 'boolean' && typeof rec.detail === 'string';
    });
  } catch {
    return [];
  }
}

function toErrorMessage(err: unknown): string {
  if (!err) {
    return 'Unknown error';
  }
  if (typeof err === 'string') {
    return err;
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'object') {
    const maybe = err as { message?: unknown };
    if (typeof maybe.message === 'string') {
      return maybe.message;
    }
  }
  return 'Unknown error';
}

async function testGsc(organizationId: string): Promise<ConnectorTestResult> {
  const siteUrl = await resolveGscSiteUrl(organizationId);
  if (!siteUrl) {
    return { id: 'google_search_console', ok: false, detail: 'Missing property URL (set GSC site URL).' };
  }

  const org = await readOrgConnectorSettings(organizationId);
  const hasAnyCreds =
    Boolean(org.gscServiceAccountJson) ||
    Boolean(org.ga4ServiceAccountJson) ||
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) ||
    Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()) ||
    Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON?.trim());
  if (!hasAnyCreds) {
    return { id: 'google_search_console', ok: false, detail: 'Missing service-account credentials.' };
  }

  try {
    const auth = createGoogleAuth(
      ['https://www.googleapis.com/auth/webmasters.readonly'],
      [org.gscServiceAccountJson, org.ga4ServiceAccountJson],
      ['GSC_SERVICE_ACCOUNT_JSON', 'GA4_SERVICE_ACCOUNT_JSON']
    );
    const webmasters = google.webmasters({ version: 'v3', auth });
    const { startDate, endDate } = rollingGscWindowDays(3);
    await webmasters.searchanalytics.query({
      siteUrl,
      requestBody: { startDate, endDate, dimensions: [], rowLimit: 1 }
    });
    return { id: 'google_search_console', ok: true, detail: 'Connected. Search Analytics query succeeded.' };
  } catch (err) {
    return { id: 'google_search_console', ok: false, detail: `Connection failed: ${toErrorMessage(err)}` };
  }
}

async function testGa4(organizationId: string): Promise<ConnectorTestResult> {
  const propertyId = await resolveGa4PropertyId(organizationId);
  if (!propertyId) {
    return { id: 'google_analytics_4', ok: false, detail: 'Missing GA4 property ID.' };
  }
  const org = await readOrgConnectorSettings(organizationId);
  const hasAnyCreds =
    Boolean(org.ga4ServiceAccountJson) ||
    Boolean(org.gscServiceAccountJson) ||
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) ||
    Boolean(process.env.GSC_SERVICE_ACCOUNT_JSON?.trim()) ||
    Boolean(process.env.GA4_SERVICE_ACCOUNT_JSON?.trim());
  if (!hasAnyCreds) {
    return { id: 'google_analytics_4', ok: false, detail: 'Missing service-account credentials.' };
  }

  try {
    const auth = createGoogleAuth(
      ['https://www.googleapis.com/auth/analytics.readonly'],
      [org.ga4ServiceAccountJson, org.gscServiceAccountJson],
      ['GA4_SERVICE_ACCOUNT_JSON', 'GSC_SERVICE_ACCOUNT_JSON']
    );
    const analyticsdata = google.analyticsdata({ version: 'v1beta', auth });
    const { startDate, endDate } = rollingGscWindowDays(3);
    await analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate, endDate }],
        metrics: [{ name: 'sessions' }],
        limit: '1'
      }
    });
    return { id: 'google_analytics_4', ok: true, detail: 'Connected. Data API runReport succeeded.' };
  } catch (err) {
    return { id: 'google_analytics_4', ok: false, detail: `Connection failed: ${toErrorMessage(err)}` };
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await context.params;
  const auth = await requireOrgRole(request, orgId, 'EDITOR');
  if (auth instanceof Response) {
    return auth;
  }

  const [gsc, ga4] = await Promise.all([testGsc(orgId), testGa4(orgId)]);
  const tests = [gsc, ga4];
  await prisma.organization.update({
    where: { id: orgId },
    data: {
      connectorTestedAt: new Date(),
      connectorTestResultsJson: JSON.stringify(tests)
    }
  });
  return NextResponse.json({
    organizationId: orgId,
    tests
  });
}
