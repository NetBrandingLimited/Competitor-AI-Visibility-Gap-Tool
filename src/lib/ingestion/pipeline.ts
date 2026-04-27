import { enrichDocumentsWithOrgContext } from '@/lib/org-visibility-mock';

import { MOCK_CONNECTORS } from './connectors';
import type {
  IngestionEvent,
  IngestionRunInput,
  IngestionRunResult,
  NormalizedIngestionInput,
  SourceDocument
} from './types';

function normalizeInput(input: IngestionRunInput): NormalizedIngestionInput {
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

export async function runMockIngestion(input: IngestionRunInput): Promise<IngestionRunResult> {
  const normalized = normalizeInput(input);
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
