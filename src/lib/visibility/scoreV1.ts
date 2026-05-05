import { loadLlmRollupForScoring } from '@/lib/ai-visibility/rollupLlmSamples';
import { collectAllConnectorSignals } from '@/lib/connectors';
import type { VisibilitySignal } from '@/lib/connectors/types';
import { savedBrandShareFromPipelineDocs } from '@/lib/dashboard/pipelineSnapshot';
import { formatGscIngestionDiagnosticsSummary } from '@/lib/ingestion/gscDiagnostics';
import { prisma } from '@/lib/prisma';
import { readLatestPipelineRun } from '@/lib/pipeline/store';
import type { PipelineIngestionSource } from '@/lib/pipeline/types';
import { readLatestTrendSnapshot } from '@/lib/trends/store';

export type VisibilityReasonV1 = {
  code: string;
  message: string;
  /** Approximate points contribution vs previous snapshot (can be 0 on baseline). */
  deltaPoints?: number;
};

export type VisibilityInputsV1 = {
  pipelineRunId: string | null;
  /** Latest saved pipeline run document provenance (null if no run or legacy row). */
  pipelineIngestionSource: PipelineIngestionSource | null;
  /** GSC ingestion one-liner for the latest pipeline run at scoring time (null if none / mock). */
  pipelineGscDiagnosticsSummary: string | null;
  documentCount: number;
  triggerCount: number;
  clusterCount: number;
  trendDate: string | null;
  totalMentions: number;
  topBrand: string | null;
  topBrandMentions: number;
  brandName: string | null;
  connectorSignalCount: number;
  connectorSignalSource: 'cache' | 'live';
  /** When source is cache: why cached signals were used (TTL vs empty live fallback). */
  connectorSignalCacheKind: 'ttl' | 'stale_fallback' | null;
  connectorSignalsAsOf: string | null;
  /**
   * Share of voice (0–1) for the saved brand in the latest pipeline run’s document text (null if no run / no brand / no docs).
   * Supplemental signal from ingested page/query text (GSC or mock).
   */
  pipelineBrandShareOfVoice: number | null;
  /**
   * Recent stored LLM assistant answers (up to 50): mean brand mention share among answers that mention any tracked brand.
   * When present, this drives the mention-share and brand-alignment slices of the score instead of the trend snapshot.
   */
  llmAvgBrandShareOfMentions: number | null;
  /** Count of LLM answers in the rollup window that had ≥1 tracked-brand mention (denominator for the average). */
  llmShareSampleCount: number;
  /** Among those mention-bearing LLM answers, fraction where the workspace brand ties or leads on raw mention counts. */
  llmBrandTopOrTiedRate: number | null;
  /** How many LLM answer rows were read for the rollup (≤50). */
  llmAnswerSamplesScanned: number;
};

/** True when the visibility score uses LLM answer text for mention-share / alignment (not the mock trend snapshot). */
export function visibilityUsesLlmMentionSignal(inputs: VisibilityInputsV1): boolean {
  return (
    inputs.llmShareSampleCount > 0 &&
    inputs.llmAvgBrandShareOfMentions != null &&
    Number.isFinite(inputs.llmAvgBrandShareOfMentions)
  );
}

function normalizeInputsV1(inputs: VisibilityInputsV1): VisibilityInputsV1 {
  const cacheKind =
    inputs.connectorSignalCacheKind === 'ttl' || inputs.connectorSignalCacheKind === 'stale_fallback'
      ? inputs.connectorSignalCacheKind
      : null;
  const pipelineIngestionSource: PipelineIngestionSource | null =
    inputs.pipelineIngestionSource === 'live_gsc_queries' || inputs.pipelineIngestionSource === 'mock_ingestion'
      ? inputs.pipelineIngestionSource
      : null;
  const pipelineGscDiagnosticsSummary =
    typeof inputs.pipelineGscDiagnosticsSummary === 'string' && inputs.pipelineGscDiagnosticsSummary.trim().length > 0
      ? inputs.pipelineGscDiagnosticsSummary.trim()
      : null;
  const pipelineBrandShareOfVoice =
    typeof inputs.pipelineBrandShareOfVoice === 'number' &&
    Number.isFinite(inputs.pipelineBrandShareOfVoice) &&
    inputs.pipelineBrandShareOfVoice >= 0 &&
    inputs.pipelineBrandShareOfVoice <= 1
      ? inputs.pipelineBrandShareOfVoice
      : null;
  const llmShareSampleCount =
    typeof inputs.llmShareSampleCount === 'number' &&
    Number.isFinite(inputs.llmShareSampleCount) &&
    inputs.llmShareSampleCount >= 0
      ? Math.floor(inputs.llmShareSampleCount)
      : 0;
  const llmAnswerSamplesScanned =
    typeof inputs.llmAnswerSamplesScanned === 'number' &&
    Number.isFinite(inputs.llmAnswerSamplesScanned) &&
    inputs.llmAnswerSamplesScanned >= 0
      ? Math.floor(inputs.llmAnswerSamplesScanned)
      : 0;
  const llmAvgBrandShareOfMentions =
    typeof inputs.llmAvgBrandShareOfMentions === 'number' &&
    Number.isFinite(inputs.llmAvgBrandShareOfMentions) &&
    inputs.llmAvgBrandShareOfMentions >= 0 &&
    inputs.llmAvgBrandShareOfMentions <= 1
      ? inputs.llmAvgBrandShareOfMentions
      : null;
  const llmBrandTopOrTiedRate =
    typeof inputs.llmBrandTopOrTiedRate === 'number' &&
    Number.isFinite(inputs.llmBrandTopOrTiedRate) &&
    inputs.llmBrandTopOrTiedRate >= 0 &&
    inputs.llmBrandTopOrTiedRate <= 1
      ? inputs.llmBrandTopOrTiedRate
      : null;
  return {
    ...inputs,
    pipelineIngestionSource,
    pipelineGscDiagnosticsSummary,
    pipelineBrandShareOfVoice,
    llmShareSampleCount,
    llmAnswerSamplesScanned,
    llmAvgBrandShareOfMentions,
    llmBrandTopOrTiedRate,
    connectorSignalSource:
      inputs.connectorSignalSource === 'cache' || inputs.connectorSignalSource === 'live'
        ? inputs.connectorSignalSource
        : 'live',
    connectorSignalCacheKind: cacheKind,
    connectorSignalsAsOf: typeof inputs.connectorSignalsAsOf === 'string' ? inputs.connectorSignalsAsOf : null
  };
}

const SIGNAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

function brandMatchesTop(brandName: string | null, topBrand: string | null): boolean {
  const b = norm(brandName);
  const t = norm(topBrand);
  if (!b || !t) {
    return false;
  }
  return t.includes(b) || b.includes(t);
}

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

async function readSignalsForScoring(organizationId: string): Promise<{
  signals: VisibilitySignal[];
  source: 'cache' | 'live';
  cacheKind: 'ttl' | 'stale_fallback' | null;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      connectorSignalsFetchedAt: true,
      connectorSignalsJson: true
    }
  });
  const fetchedAtMs = org?.connectorSignalsFetchedAt?.getTime() ?? 0;
  const isFresh = fetchedAtMs > 0 && Date.now() - fetchedAtMs <= SIGNAL_CACHE_TTL_MS;
  const cached = parseCachedSignals(org?.connectorSignalsJson);
  if (isFresh && cached.length > 0) {
    return { signals: cached, source: 'cache', cacheKind: 'ttl' };
  }
  const live = await collectAllConnectorSignals({ organizationId });
  if (live.length > 0) {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        connectorSignalsFetchedAt: new Date(),
        connectorSignalsJson: JSON.stringify(live)
      }
    });
    return { signals: live, source: 'live', cacheKind: null };
  }
  // Fall back to the last cached snapshot when a refresh attempt yields no signals.
  // This avoids transient connector/API issues zeroing out score inputs.
  if (cached.length > 0) {
    return { signals: cached, source: 'cache', cacheKind: 'stale_fallback' };
  }
  return { signals: live, source: 'live', cacheKind: null };
}

function latestSignalAsOf(signals: VisibilitySignal[]): string | null {
  if (signals.length === 0) {
    return null;
  }
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const s of signals) {
    const ms = Date.parse(s.asOf);
    if (Number.isFinite(ms) && ms > latestMs) {
      latestMs = ms;
      latest = s.asOf;
    }
  }
  return latest;
}

/**
 * v1 heuristic score (0–100): mention share from recent LLM answers when available, else trend snapshot;
 * plus pipeline doc share, pipeline metadata, and connector signals.
 */
export function computeVisibilityScoreV1(inputs: VisibilityInputsV1): { score: number; breakdown: Record<string, number> } {
  const triggerPoints = Math.min(28, inputs.triggerCount * 2.5);
  const clusterPoints = Math.min(18, inputs.clusterCount * 2.2);
  const docPoints = Math.min(10, inputs.documentCount * 1.2);
  const usesLlm = visibilityUsesLlmMentionSignal(inputs);
  const trendShare =
    inputs.totalMentions > 0 ? inputs.topBrandMentions / inputs.totalMentions : 0;
  const mentionShareForPoints = usesLlm ? inputs.llmAvgBrandShareOfMentions! : trendShare;
  const mentionSharePoints = Math.min(24, mentionShareForPoints * 70);
  const brandAlignPoints = usesLlm
    ? inputs.llmBrandTopOrTiedRate != null && inputs.llmBrandTopOrTiedRate >= 0.5
      ? 10
      : 0
    : brandMatchesTop(inputs.brandName, inputs.topBrand)
      ? 10
      : 0;
  const connectorPoints = Math.min(10, inputs.connectorSignalCount * 3);
  const pipelineMentionPoints =
    inputs.pipelineBrandShareOfVoice != null
      ? Math.min(20, Math.round(inputs.pipelineBrandShareOfVoice * 55))
      : 0;

  const raw =
    10 +
    triggerPoints +
    clusterPoints +
    docPoints +
    mentionSharePoints +
    brandAlignPoints +
    connectorPoints +
    pipelineMentionPoints;
  const score = Math.round(Math.min(100, Math.max(0, raw)));

  return {
    score,
    breakdown: {
      base: 10,
      triggers: triggerPoints,
      clusters: clusterPoints,
      documents: docPoints,
      mentionShare: mentionSharePoints,
      brandAlignment: brandAlignPoints,
      connectors: connectorPoints,
      pipelineMentions: pipelineMentionPoints
    }
  };
}

function diffReason(
  label: string,
  prev: number,
  next: number,
  code: string,
  template: (d: number) => string
): VisibilityReasonV1 | null {
  if (prev === next) {
    return null;
  }
  const d = next - prev;
  return {
    code,
    message: template(d),
    deltaPoints: undefined
  };
}

export function buildWhyChanged(
  previous: { score: number; inputs: VisibilityInputsV1 } | null,
  nextScore: number,
  nextInputs: VisibilityInputsV1
): VisibilityReasonV1[] {
  if (!previous) {
    return [
      {
        code: 'BASELINE',
        message: `First visibility score recorded (${nextScore}/100). Recalculate after pipeline runs, trend jobs, or new LLM answer samples to see deltas.`
      }
    ];
  }

  const reasons: VisibilityReasonV1[] = [];
  const scoreDelta = nextScore - previous.score;
  reasons.push({
    code: 'SCORE_TOTAL',
    message:
      scoreDelta === 0
        ? `Overall score unchanged at ${nextScore}.`
        : `Overall score ${scoreDelta > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreDelta)} (now ${nextScore}).`,
    deltaPoints: scoreDelta
  });

  const p = previous.inputs;
  const n = nextInputs;

  const t = diffReason(
    'triggers',
    p.triggerCount,
    n.triggerCount,
    'PIPELINE_TRIGGERS',
    (d) => `Pipeline triggers ${d > 0 ? 'rose' : 'fell'} by ${Math.abs(d)} (now ${n.triggerCount}).`
  );
  if (t) {
    reasons.push(t);
  }

  const c = diffReason(
    'clusters',
    p.clusterCount,
    n.clusterCount,
    'PIPELINE_CLUSTERS',
    (d) => `Theme clusters ${d > 0 ? 'rose' : 'fell'} by ${Math.abs(d)} (now ${n.clusterCount}).`
  );
  if (c) {
    reasons.push(c);
  }

  const prevUsesLlm = visibilityUsesLlmMentionSignal(p);
  const nextUsesLlm = visibilityUsesLlmMentionSignal(n);

  if (prevUsesLlm !== nextUsesLlm) {
    reasons.push({
      code: 'MENTION_SIGNAL_SOURCE',
      message: nextUsesLlm
        ? `Mention share in this score now comes from recent LLM assistant answers (${n.llmAnswerSamplesScanned}-sample window, ${n.llmShareSampleCount} with tracked-brand mentions) instead of the trend snapshot.`
        : 'Mention share in this score now uses the trend snapshot again (no recent LLM answers mention tracked brands).'
    });
  }

  if (nextUsesLlm) {
    const prevAvg = prevUsesLlm ? p.llmAvgBrandShareOfMentions : null;
    const nextAvg = n.llmAvgBrandShareOfMentions;
    if (
      !prevUsesLlm ||
      prevAvg == null ||
      nextAvg == null ||
      Math.abs(nextAvg - prevAvg) > 0.02 ||
      p.llmShareSampleCount !== n.llmShareSampleCount
    ) {
      reasons.push({
        code: 'LLM_MENTION_SHARE',
        message: `LLM answers: average brand mention share is ${((nextAvg ?? 0) * 100).toFixed(1)}% across ${n.llmShareSampleCount} answer(s) with mentions (scanned ${n.llmAnswerSamplesScanned} recent samples).`
      });
    }
  } else {
    const prevShare = p.totalMentions > 0 ? p.topBrandMentions / p.totalMentions : 0;
    const nextShare = n.totalMentions > 0 ? n.topBrandMentions / n.totalMentions : 0;
    if (Math.abs(nextShare - prevShare) > 0.001 || p.topBrand !== n.topBrand) {
      reasons.push({
        code: 'TREND_TOP_BRAND',
        message: `Trend snapshot: top brand is now "${n.topBrand ?? '—'}" with ${(nextShare * 100).toFixed(1)}% share of mock mentions (was "${p.topBrand ?? '—'}" at ${(prevShare * 100).toFixed(1)}%).`
      });
    }
  }

  if (nextUsesLlm) {
    const prevRate = prevUsesLlm ? p.llmBrandTopOrTiedRate : null;
    const nextRate = n.llmBrandTopOrTiedRate;
    const prevAlign = Boolean(prevUsesLlm && prevRate != null && prevRate >= 0.5);
    const nextAlign = Boolean(nextRate != null && nextRate >= 0.5);
    if (prevAlign !== nextAlign) {
      reasons.push({
        code: 'BRAND_ALIGNMENT',
        message: nextAlign
          ? 'Your brand now leads or ties on mentions in a majority of recent LLM answers (+weight in score).'
          : 'Your brand no longer leads or ties on mentions in a majority of recent LLM answers (alignment weight removed).'
      });
    }
  } else {
    const prevAlign = brandMatchesTop(p.brandName, p.topBrand);
    const nextAlign = brandMatchesTop(n.brandName, n.topBrand);
    if (prevAlign !== nextAlign) {
      reasons.push({
        code: 'BRAND_ALIGNMENT',
        message: nextAlign
          ? 'Your saved brand now aligns with the top brand in the latest trend snapshot (+weight in score).'
          : 'Your saved brand no longer matches the top brand in the trend snapshot (alignment weight removed).'
      });
    }
  }

  if (p.connectorSignalCount !== n.connectorSignalCount) {
    reasons.push({
      code: 'CONNECTORS',
      message: `External connector signals changed (${p.connectorSignalCount} → ${n.connectorSignalCount}).`
    });
  }
  if (p.connectorSignalSource !== n.connectorSignalSource) {
    reasons.push({
      code: 'CONNECTOR_SIGNAL_SOURCE',
      message: `Connector signal source switched from ${p.connectorSignalSource} to ${n.connectorSignalSource}.`
    });
  }
  if (p.connectorSignalsAsOf !== n.connectorSignalsAsOf) {
    reasons.push({
      code: 'CONNECTOR_SIGNALS_AS_OF',
      message: `Connector signal recency changed (${p.connectorSignalsAsOf ?? 'none'} → ${n.connectorSignalsAsOf ?? 'none'}).`
    });
  }

  const connectorCacheLabel = (k: VisibilityInputsV1['connectorSignalCacheKind']): string => {
    if (k === 'ttl') {
      return 'cache (within TTL)';
    }
    if (k === 'stale_fallback') {
      return 'cache (fallback: live fetch returned no metrics)';
    }
    return 'live or none';
  };
  if (p.connectorSignalCacheKind !== n.connectorSignalCacheKind) {
    reasons.push({
      code: 'CONNECTOR_CACHE_KIND',
      message: `Connector scoring cache mode changed (${connectorCacheLabel(p.connectorSignalCacheKind)} → ${connectorCacheLabel(n.connectorSignalCacheKind)}).`
    });
  }

  const ingestionLabel = (s: PipelineIngestionSource | null): string => {
    if (s === 'live_gsc_queries') {
      return 'Search Console pipeline documents';
    }
    if (s === 'mock_ingestion') {
      return 'mock pipeline templates';
    }
    return 'not recorded / legacy';
  };
  if (p.pipelineIngestionSource !== n.pipelineIngestionSource) {
    reasons.push({
      code: 'PIPELINE_INGESTION_SOURCE',
      message: `Pipeline document source changed (${ingestionLabel(p.pipelineIngestionSource)} → ${ingestionLabel(n.pipelineIngestionSource)}).`
    });
  }

  const prevGsc = p.pipelineGscDiagnosticsSummary ?? null;
  const nextGsc = n.pipelineGscDiagnosticsSummary ?? null;
  if (prevGsc !== nextGsc) {
    reasons.push({
      code: 'PIPELINE_GSC_DIAGNOSTICS',
      message:
        prevGsc === null && nextGsc !== null
          ? 'Search Console ingestion diagnostics are now recorded for the pipeline run used in this score.'
          : nextGsc === null && prevGsc !== null
            ? 'Search Console ingestion diagnostics are no longer present on the latest pipeline run.'
            : 'Search Console ingestion diagnostics summary changed for the latest pipeline run.'
    });
  }

  const prevPso = p.pipelineBrandShareOfVoice;
  const nextPso = n.pipelineBrandShareOfVoice;
  if (prevPso == null && nextPso != null) {
    reasons.push({
      code: 'PIPELINE_BRAND_SHARE',
      message: `Pipeline document mention share for your brand is now ${(nextPso * 100).toFixed(1)}%.`
    });
  } else if (prevPso != null && nextPso == null) {
    reasons.push({
      code: 'PIPELINE_BRAND_SHARE',
      message: 'Pipeline document mention share is no longer available (no ingested text for the latest run).'
    });
  } else if (
    prevPso != null &&
    nextPso != null &&
    Math.abs(nextPso - prevPso) > 0.02
  ) {
    reasons.push({
      code: 'PIPELINE_BRAND_SHARE',
      message: `Pipeline document mention share moved from ${(prevPso * 100).toFixed(1)}% to ${(nextPso * 100).toFixed(1)}%.`
    });
  }

  return reasons;
}

export async function buildInputsForOrg(organizationId: string): Promise<VisibilityInputsV1> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      brandName: true,
      category: true,
      competitorA: true,
      competitorB: true,
      competitorC: true
    }
  });
  const orgFields = org
    ? {
        brandName: org.brandName,
        category: org.category,
        competitorA: org.competitorA,
        competitorB: org.competitorB,
        competitorC: org.competitorC
      }
    : {};

  const [latestRun, latestTrend, signalState, llmRollup] = await Promise.all([
    readLatestPipelineRun(organizationId),
    readLatestTrendSnapshot(organizationId),
    readSignalsForScoring(organizationId),
    loadLlmRollupForScoring(organizationId, orgFields)
  ]);
  const signals = signalState.signals;

  return {
    pipelineRunId: latestRun?.id ?? null,
    pipelineIngestionSource: latestRun?.ingestionSource ?? null,
    pipelineGscDiagnosticsSummary: latestRun?.gscIngestionDiagnostics
      ? formatGscIngestionDiagnosticsSummary(latestRun.gscIngestionDiagnostics)
      : null,
    documentCount: latestRun?.documentCount ?? 0,
    triggerCount: latestRun?.triggerCount ?? 0,
    clusterCount: latestRun?.clusterCount ?? 0,
    trendDate: latestTrend?.date ?? null,
    totalMentions: latestTrend?.totalMentions ?? 0,
    topBrand: latestTrend?.topBrand ?? null,
    topBrandMentions: latestTrend?.topBrandMentions ?? 0,
    brandName: org?.brandName ?? null,
    connectorSignalCount: signals.length,
    connectorSignalSource: signalState.source,
    connectorSignalCacheKind: signalState.cacheKind,
    connectorSignalsAsOf: latestSignalAsOf(signals),
    pipelineBrandShareOfVoice: savedBrandShareFromPipelineDocs(orgFields, latestRun),
    llmAvgBrandShareOfMentions: llmRollup.avgBrandShareOfMentions,
    llmShareSampleCount: llmRollup.shareSampleCount,
    llmBrandTopOrTiedRate: llmRollup.brandTopOrTiedRate,
    llmAnswerSamplesScanned: llmRollup.answerSamplesScanned
  };
}

export async function computeAndPersistVisibilityScoreV1(organizationId: string): Promise<{
  score: number;
  reasons: VisibilityReasonV1[];
  inputs: VisibilityInputsV1;
}> {
  const inputs = await buildInputsForOrg(organizationId);
  const { score } = computeVisibilityScoreV1(inputs);

  const prevRow = await prisma.visibilityScoreSnapshot.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' }
  });
  let previous: { score: number; inputs: VisibilityInputsV1 } | null = null;
  if (prevRow) {
    try {
      previous = {
        score: prevRow.score,
        inputs: normalizeInputsV1(JSON.parse(prevRow.inputsJson) as VisibilityInputsV1)
      };
    } catch {
      previous = null;
    }
  }

  const reasons = buildWhyChanged(previous, score, inputs);

  await prisma.visibilityScoreSnapshot.create({
    data: {
      organizationId,
      score,
      reasonsJson: JSON.stringify(reasons),
      inputsJson: JSON.stringify(inputs)
    }
  });

  const stale = await prisma.visibilityScoreSnapshot.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    skip: 60,
    select: { id: true }
  });
  if (stale.length > 0) {
    await prisma.visibilityScoreSnapshot.deleteMany({
      where: { id: { in: stale.map((r) => r.id) } }
    });
  }

  return { score, reasons, inputs };
}

export async function getLatestVisibilityScore(organizationId: string): Promise<{
  score: number;
  reasons: VisibilityReasonV1[];
  inputs: VisibilityInputsV1;
  createdAt: string;
} | null> {
  const row = await prisma.visibilityScoreSnapshot.findFirst({
    where: { organizationId },
    orderBy: { createdAt: 'desc' }
  });
  if (!row) {
    return null;
  }
  try {
    return {
      score: row.score,
      reasons: JSON.parse(row.reasonsJson) as VisibilityReasonV1[],
      inputs: normalizeInputsV1(JSON.parse(row.inputsJson) as VisibilityInputsV1),
      createdAt: row.createdAt.toISOString()
    };
  } catch {
    return null;
  }
}
