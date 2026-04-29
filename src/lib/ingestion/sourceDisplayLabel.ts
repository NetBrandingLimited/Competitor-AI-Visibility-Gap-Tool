import type { PipelineIngestionSource } from '@/lib/pipeline/types';

import type { ConnectorName } from './types';

const LABELS: Record<ConnectorName, string> = {
  'google_search_console': 'Search Console',
  'reddit-mock': 'Reddit (mock)',
  'hn-mock': 'Hacker News (mock)'
};

/** UI label for pipeline / snapshot `source` strings (falls back to raw value). */
export function ingestionSourceDisplayLabel(source: string): string {
  if (source in LABELS) {
    return LABELS[source as ConnectorName];
  }
  return source;
}

/** Short label for unified pipeline run `ingestionSource` (visibility card, summaries). */
export function pipelineIngestionProvenanceLabel(
  source: PipelineIngestionSource | null | undefined
): string {
  if (source === 'live_gsc_queries') {
    return 'Search Console';
  }
  if (source === 'mock_ingestion') {
    return 'Mock templates';
  }
  return 'Not recorded';
}

/** Longer UI copy describing what the pipeline document source means. */
export function pipelineIngestionProvenanceDescription(
  source: PipelineIngestionSource | null | undefined
): string {
  if (source === 'live_gsc_queries') {
    return 'Documents are top search queries and landing pages from Search Console (28-day window), enriched with your brand context when configured.';
  }
  if (source === 'mock_ingestion') {
    return 'Documents are mock templates (connect Search Console under Data connectors for live query rows).';
  }
  return 'Document source for this run is unspecified (older run).';
}
