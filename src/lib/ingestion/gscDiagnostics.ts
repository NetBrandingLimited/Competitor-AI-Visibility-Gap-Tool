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

/** Single-line status (Ops, visibility card). */
export const GSC_SUMMARY_UI_NARROW_MAX = 44;

/** Dashboard digest + latest-run lines. */
export const GSC_SUMMARY_UI_PARAGRAPH_MAX = 48;

/** Reports tables; default max for {@link ellipsisGscDiagnosticsSummaryForUi}. */
export const GSC_SUMMARY_UI_TABLE_MAX = 56;

/** Post-action status toasts after API runs. */
export const GSC_SUMMARY_UI_STATUS_MAX = 140;

/**
 * Inline display for long stable ids (digest, pipeline run, scheduler job) in headers/status lines.
 * Full id stays in `href`, copy targets, and native `title` when truncated via {@link tableCellEllipsisParts}.
 */
export const UI_INLINE_ID_DISPLAY_MAX = 24;

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

/**
 * Truncate a formatted diagnostics summary for dense UI (status lines, table cells).
 * Prefer putting the full string in an element `title` for hover / accessibility.
 */
export function ellipsisGscDiagnosticsSummaryForUi(summary: string, maxChars: number = GSC_SUMMARY_UI_TABLE_MAX): string {
  const t = summary.trim();
  if (t.length <= maxChars) {
    return t;
  }
  return `${t.slice(0, maxChars)}…`;
}

/** Dense table cells: trimmed display plus `title` only when the value is truncated. */
export function tableCellEllipsisParts(
  value: string,
  maxChars: number = GSC_SUMMARY_UI_TABLE_MAX
): { display: string; title: string | undefined } {
  const t = value.trim();
  if (t.length === 0) {
    return { display: '', title: undefined };
  }
  if (t.length <= maxChars) {
    return { display: t, title: undefined };
  }
  return { display: ellipsisGscDiagnosticsSummaryForUi(t, maxChars), title: t };
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
