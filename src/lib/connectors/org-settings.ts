import { prisma } from '@/lib/prisma';
import { decryptSecret } from '@/lib/crypto/secrets';

export type OrgConnectorSettings = {
  gscSiteUrl: string | null;
  ga4PropertyId: string | null;
  gscServiceAccountJson: string | null;
  ga4ServiceAccountJson: string | null;
};

export async function readOrgConnectorSettings(organizationId: string): Promise<OrgConnectorSettings> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      gscSiteUrl: true,
      ga4PropertyId: true,
      gscServiceAccountJsonEnc: true,
      ga4ServiceAccountJsonEnc: true
    }
  });
  let gscServiceAccountJson: string | null = null;
  let ga4ServiceAccountJson: string | null = null;
  if (org?.gscServiceAccountJsonEnc) {
    try {
      gscServiceAccountJson = decryptSecret(org.gscServiceAccountJsonEnc);
    } catch {
      gscServiceAccountJson = null;
    }
  }
  if (org?.ga4ServiceAccountJsonEnc) {
    try {
      ga4ServiceAccountJson = decryptSecret(org.ga4ServiceAccountJsonEnc);
    } catch {
      ga4ServiceAccountJson = null;
    }
  }
  return {
    gscSiteUrl: org?.gscSiteUrl?.trim() || null,
    ga4PropertyId: org?.ga4PropertyId?.trim() || null,
    gscServiceAccountJson,
    ga4ServiceAccountJson
  };
}

export async function resolveGscSiteUrl(organizationId: string): Promise<string | null> {
  const s = await readOrgConnectorSettings(organizationId);
  return s.gscSiteUrl || process.env.GSC_SITE_URL?.trim() || null;
}

export async function resolveGa4PropertyId(organizationId: string): Promise<string | null> {
  const s = await readOrgConnectorSettings(organizationId);
  return s.ga4PropertyId || process.env.GA4_PROPERTY_ID?.trim() || null;
}
