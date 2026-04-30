export type GscIngestionDiagnostics = {
  queryAttempt: {
    usedFiltered: boolean;
    usedUnfiltered: boolean;
    filteredRows: number;
    unfilteredRows: number;
  };
  query: {
    fetched: number;
    filteredZeroEngagement: number;
    filteredLowSignal: number;
    docsCreated: number;
  };
  page: {
    fetched: number;
    filteredZeroEngagement: number;
    filteredLowSignal: number;
    docsCreated: number;
  };
  qp: {
    fetched: number;
    filteredZeroEngagement: number;
    filteredLowSignal: number;
    docsCreated: number;
  };
  mergedDocsBeforeDedupe: number;
  dedupedDocs: number;
  cappedDocs: number;
};

/** Parse persisted `PipelineRun.gscIngestionDiagnosticsRaw` (shared by store, CSV routes, etc.). */
export function parseGscIngestionDiagnosticsRaw(raw: string | null | undefined): GscIngestionDiagnostics | null {
  if (raw == null || String(raw).trim().length === 0) {
    return null;
  }
  try {
    return JSON.parse(String(raw)) as GscIngestionDiagnostics;
  } catch {
    return null;
  }
}

export function formatGscIngestionDiagnosticsSummary(d: GscIngestionDiagnostics): string {
  const q = d.query;
  const p = d.page;
  const qp = d.qp;
  const attempt = d.queryAttempt.usedFiltered ? 'filtered' : d.queryAttempt.usedUnfiltered ? 'unfiltered' : 'none';
  return (
    `attempt=${attempt}; ` +
    `q:fetched=${q.fetched},zero=${q.filteredZeroEngagement},low=${q.filteredLowSignal},docs=${q.docsCreated}; ` +
    `p:fetched=${p.fetched},zero=${p.filteredZeroEngagement},low=${p.filteredLowSignal},docs=${p.docsCreated}; ` +
    `qp:fetched=${qp.fetched},zero=${qp.filteredZeroEngagement},low=${qp.filteredLowSignal},docs=${qp.docsCreated}; ` +
    `merge=${d.mergedDocsBeforeDedupe},dedupe=${d.dedupedDocs},cap=${d.cappedDocs}`
  );
}
