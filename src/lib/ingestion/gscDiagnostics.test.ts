import { describe, expect, it } from 'vitest';

import {
  ellipsisGscDiagnosticsSummaryForUi,
  formatGscIngestionDiagnosticsSummary,
  parseGscIngestionDiagnosticsRaw,
  type GscIngestionDiagnostics
} from '@/lib/ingestion/gscDiagnostics';

const sample: GscIngestionDiagnostics = {
  queryAttempt: { usedFiltered: true, usedUnfiltered: false, filteredRows: 1, unfilteredRows: 0 },
  query: { fetched: 1, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 1 },
  page: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
  qp: { fetched: 0, filteredZeroEngagement: 0, filteredLowSignal: 0, docsCreated: 0 },
  mergedDocsBeforeDedupe: 1,
  dedupedDocs: 1,
  cappedDocs: 1
};

describe('parseGscIngestionDiagnosticsRaw', () => {
  it('returns null for empty input', () => {
    expect(parseGscIngestionDiagnosticsRaw(null)).toBeNull();
    expect(parseGscIngestionDiagnosticsRaw(undefined)).toBeNull();
    expect(parseGscIngestionDiagnosticsRaw('')).toBeNull();
    expect(parseGscIngestionDiagnosticsRaw('   ')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseGscIngestionDiagnosticsRaw('{')).toBeNull();
  });

  it('round-trips with JSON.stringify', () => {
    const raw = JSON.stringify(sample);
    expect(parseGscIngestionDiagnosticsRaw(raw)).toEqual(sample);
  });
});

describe('formatGscIngestionDiagnosticsSummary', () => {
  it('includes attempt and dimension stats', () => {
    const s = formatGscIngestionDiagnosticsSummary(sample);
    expect(s).toContain('attempt=filtered');
    expect(s).toContain('q:fetched=1');
    expect(s).toContain('cap=1');
  });
});

describe('ellipsisGscDiagnosticsSummaryForUi', () => {
  it('returns short strings unchanged', () => {
    expect(ellipsisGscDiagnosticsSummaryForUi('abc', 10)).toBe('abc');
  });

  it('truncates with ellipsis', () => {
    expect(ellipsisGscDiagnosticsSummaryForUi('0123456789', 4)).toBe('0123…');
  });

  it('trims whitespace before measuring', () => {
    expect(ellipsisGscDiagnosticsSummaryForUi('  hi  ', 10)).toBe('hi');
  });
});
