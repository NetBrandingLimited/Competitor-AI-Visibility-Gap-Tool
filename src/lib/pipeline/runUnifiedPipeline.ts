import { clusterThemes } from '@/lib/analysis/clusterThemes';
import { extractQuestionTriggers } from '@/lib/analysis/extractTriggers';
import { runOrgIngestion } from '@/lib/ingestion/pipeline';
import { defaultPipelineQueryFromOrg, simpleHash, type OrgBrandFields } from '@/lib/org-visibility-mock';
import { prisma } from '@/lib/prisma';

import { computeAndPersistVisibilityScoreV1 } from '@/lib/visibility/scoreV1';

import { savePipelineRun } from './store';
import type { UnifiedPipelineRun } from './types';

function makeRunId(now: Date): string {
  return `run-${now.getTime()}`;
}

const ORG_BRAND_SELECT = {
  brandName: true,
  category: true,
  competitorA: true,
  competitorB: true,
  competitorC: true
} as const;

function toBrandFields(
  org: {
    brandName: string | null;
    category: string | null;
    competitorA: string | null;
    competitorB: string | null;
    competitorC: string | null;
  } | null
): OrgBrandFields {
  if (!org) {
    return {};
  }
  return {
    brandName: org.brandName,
    category: org.category,
    competitorA: org.competitorA,
    competitorB: org.competitorB,
    competitorC: org.competitorC
  };
}

export async function runUnifiedPipeline(input: {
  organizationId: string;
  /** When omitted or empty, uses brand + category + competitors from the organization. */
  query?: string;
  limitPerConnector?: number;
}): Promise<UnifiedPipelineRun> {
  const now = new Date();
  const runId = makeRunId(now);
  const contentVariant = simpleHash(runId);

  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: ORG_BRAND_SELECT
  });
  const brandFields = toBrandFields(org);
  const trimmed = input.query?.trim();
  const query =
    trimmed && trimmed.length > 0 ? trimmed : defaultPipelineQueryFromOrg(brandFields);

  const { result: ingestion, ingestionSource, gscDiagnostics } = await runOrgIngestion({
    organizationId: input.organizationId,
    query,
    limitPerConnector: input.limitPerConnector,
    brandContext: brandFields,
    contentVariant
  });

  const combinedText = ingestion.documents
    .map((doc) => `${doc.title}. ${doc.content}`)
    .join('\n');
  const triggers = extractQuestionTriggers(combinedText);
  const clusters = clusterThemes(triggers);

  const run: UnifiedPipelineRun = {
    id: runId,
    createdAt: now.toISOString(),
    query: ingestion.input.query,
    limitPerConnector: ingestion.input.limitPerConnector,
    documentCount: ingestion.documents.length,
    triggerCount: triggers.length,
    clusterCount: clusters.length,
    ingestionSource,
    gscIngestionDiagnostics: ingestionSource === 'live_gsc_queries' && gscDiagnostics ? gscDiagnostics : undefined,
    ingestionEvents: ingestion.events.map((event) => event.type),
    documents: ingestion.documents,
    triggers,
    clusters
  };

  await savePipelineRun(input.organizationId, run);
  try {
    await computeAndPersistVisibilityScoreV1(input.organizationId);
  } catch {
    // visibility score must not fail the pipeline
  }
  return run;
}
