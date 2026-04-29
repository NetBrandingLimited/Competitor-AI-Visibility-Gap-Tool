import { describe, expect, it } from 'vitest';

import {
  ingestionSourceDisplayLabel,
  pipelineIngestionProvenanceDescription,
  pipelineIngestionProvenanceLabel
} from './sourceDisplayLabel';

describe('ingestionSourceDisplayLabel', () => {
  it('maps known connector ids', () => {
    expect(ingestionSourceDisplayLabel('google_search_console')).toBe('Search Console');
    expect(ingestionSourceDisplayLabel('reddit-mock')).toBe('Reddit (mock)');
    expect(ingestionSourceDisplayLabel('hn-mock')).toBe('Hacker News (mock)');
  });

  it('returns unknown values unchanged', () => {
    expect(ingestionSourceDisplayLabel('future_connector')).toBe('future_connector');
  });
});

describe('pipelineIngestionProvenanceLabel', () => {
  it('maps pipeline ingestion sources', () => {
    expect(pipelineIngestionProvenanceLabel('live_gsc_queries')).toBe('Search Console');
    expect(pipelineIngestionProvenanceLabel('mock_ingestion')).toBe('Mock templates');
    expect(pipelineIngestionProvenanceLabel(undefined)).toBe('Not recorded');
    expect(pipelineIngestionProvenanceLabel(null)).toBe('Not recorded');
  });
});

describe('pipelineIngestionProvenanceDescription', () => {
  it('maps known and unknown provenance descriptions', () => {
    expect(pipelineIngestionProvenanceDescription('live_gsc_queries')).toContain('Search Console');
    expect(pipelineIngestionProvenanceDescription('mock_ingestion')).toContain('mock templates');
    expect(pipelineIngestionProvenanceDescription(undefined)).toContain('unspecified');
  });
});
