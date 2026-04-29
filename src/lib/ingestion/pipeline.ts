import { enrichDocumentsWithOrgContext } from '@/lib/org-visibility-mock';
import type { PipelineIngestionSource } from '@/lib/pipeline/types';

import { MOCK_CONNECTORS } from './connectors';
import {
  fetchGscQueryDocuments,
  fetchGscQueryDocumentsWithDiagnostics,
  type GscIngestionDiagnostics
} from './gscQueryIngestion';
import type {
  IngestionEvent,
  IngestionRunInput,
  IngestionRunResult,
  NormalizedIngestionInput,
  SourceDocument
} from './types';

export function normalizeIngestionInput(input: IngestionRunInput): NormalizedIngestionInput {
  return {
    query: input.query.trim(),
    limitPerConnector: Math.max(1, Math.min(input.limitPerConnector ?? 3, 10)),
    brandContext: input.brandContext,
    contentVariant: input.contentVariant ?? 0
  };
}

function dedupeDocuments(documents: SourceDocument[]): SourceDocument[] {
  const seen = new Set<string>();
  const deduped: SourceDocument[] = [];
  for (const doc of documents) {
    const key = doc.url.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(doc);
  }
  return deduped;
}

function ingestionResultFromGscDocuments(
  normalized: NormalizedIngestionInput,
  fetchedCount: number,
  afterUrlDedupeCount: number,
  deduped: SourceDocument[]
): IngestionRunResult {
  const events: IngestionEvent[] = [];
  const emit = (event: IngestionEvent) => events.push(event);
  emit({
    ts: new Date().toISOString(),
    level: 'info',
    type: 'run_started',
    query: normalized.query
  });
  emit({
    ts: new Date().toISOString(),
    level: 'info',
    type: 'connector_started',
    connector: 'google_search_console'
  });
  emit({
    ts: new Date().toISOString(),
    level: 'info',
    type: 'connector_completed',
    connector: 'google_search_console',
    count: fetchedCount
  });
  emit({
    ts: new Date().toISOString(),
    level: 'info',
    type: 'documents_deduped',
    inputCount: afterUrlDedupeCount,
    outputCount: deduped.length
  });
  emit({
    ts: new Date().toISOString(),
    level: 'info',
    type: 'run_completed',
    totalDocuments: deduped.length
  });
  return {
    input: normalized,
    events,
    documents: deduped
  };
}

export type OrgIngestionInput = IngestionRunInput & { organizationId: string };

/**
 * Prefer live Google Search Console query rows when the org has GSC + credentials and the API returns data;
 * otherwise falls back to mock connectors (same shape as {@link runMockIngestion}).
 */
export async function runOrgIngestion(
  input: OrgIngestionInput
): Promise<{ result: IngestionRunResult; ingestionSource: PipelineIngestionSource }> {
  const normalized = normalizeIngestionInput(input);
  const rowLimit = Math.min(250, Math.max(10, normalized.limitPerConnector * 25));
  const gscDocs = await fetchGscQueryDocuments({
    organizationId: input.organizationId,
    pipelineQuery: normalized.query,
    rowLimit
  });

  if (gscDocs.length === 0) {
    const result = await runMockIngestion(input);
    return { result, ingestionSource: 'mock_ingestion' };
  }

  const preBrand = dedupeDocuments(gscDocs);
  let deduped = preBrand;
  if (normalized.brandContext) {
    deduped = enrichDocumentsWithOrgContext(preBrand, normalized.brandContext);
  }

  return {
    result: ingestionResultFromGscDocuments(
      normalized,
      gscDocs.length,
      preBrand.length,
      deduped
    ),
    ingestionSource: 'live_gsc_queries'
  };
}

export async function runOrgIngestionDebug(
  input: OrgIngestionInput
): Promise<{
  result: IngestionRunResult;
  ingestionSource: PipelineIngestionSource;
  gscDiagnostics: GscIngestionDiagnostics | null;
}> {
  const normalized = normalizeIngestionInput(input);
  const rowLimit = Math.min(250, Math.max(10, normalized.limitPerConnector * 25));

  const { docs: gscDocs, diagnostics } = await fetchGscQueryDocumentsWithDiagnostics({
    organizationId: input.organizationId,
    pipelineQuery: normalized.query,
    rowLimit
  });

  if (gscDocs.length === 0) {
    const result = await runMockIngestion(input);
    return { result, ingestionSource: 'mock_ingestion', gscDiagnostics: null };
  }

  const preBrand = dedupeDocuments(gscDocs);
  let deduped = preBrand;
  if (normalized.brandContext) {
    deduped = enrichDocumentsWithOrgContext(preBrand, normalized.brandContext);
  }

  return {
    result: ingestionResultFromGscDocuments(
      normalized,
      gscDocs.length,
      preBrand.length,
      deduped
    ),
    ingestionSource: 'live_gsc_queries',
    gscDiagnostics: diagnostics
  };
}

export async function runMockIngestion(input: IngestionRunInput): Promise<IngestionRunResult> {
  const normalized = normalizeIngestionInput(input);
  const events: IngestionEvent[] = [];
  const documents: SourceDocument[] = [];

  const emit = (event: IngestionEvent) => events.push(event);

  emit({
    ts: new Date().toISOString(),
    level: 'info',
    type: 'run_started',
    query: normalized.query
  });

  for (const connector of MOCK_CONNECTORS) {
    emit({
      ts: new Date().toISOString(),
      level: 'info',
      type: 'connector_started',
      connector: connector.name
    });

    const fetched = await connector.fetchDocuments({
      query: normalized.query,
      limit: normalized.limitPerConnector,
      contentVariant: normalized.contentVariant
    });
    documents.push(...fetched);

    emit({
      ts: new Date().toISOString(),
      level: 'info',
      type: 'connector_completed',
      connector: connector.name,
      count: fetched.length
    });
  }

  let deduped = dedupeDocuments(documents);
  if (normalized.brandContext) {
    deduped = enrichDocumentsWithOrgContext(deduped, normalized.brandContext);
  }
  emit({
    ts: new Date().toISOString(),
    level: 'info',
    type: 'documents_deduped',
    inputCount: documents.length,
    outputCount: deduped.length
  });
  emit({
    ts: new Date().toISOString(),
    level: 'info',
    type: 'run_completed',
    totalDocuments: deduped.length
  });

  return {
    input: normalized,
    events,
    documents: deduped
  };
}
