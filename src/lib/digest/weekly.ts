import { prisma } from '@/lib/prisma';
import type { GapOpportunity, TopicGap } from '@/lib/insights/gap';
import { buildGapInsightsFromLatestData, readGapLatestDataForOrg } from '@/lib/insights/gap';
import { formatGscIngestionDiagnosticsSummary } from '@/lib/ingestion/gscDiagnostics';
import { pipelineIngestionProvenanceLabel } from '@/lib/ingestion/sourceDisplayLabel';
import type { PipelineIngestionSource } from '@/lib/pipeline/types';
import { sendWeeklyDigestEmail } from '@/lib/email/weeklyDigestEmail';

export type WeeklyDigestSummary = {
  score: number | null;
  signalSource: 'cache' | 'live' | null;
  pipelineIngestionSource?: PipelineIngestionSource | null;
  /** Same string as pipeline CSV `gscDiagnosticsSummary` when the latest run had GSC diagnostics. */
  pipelineGscDiagnosticsSummary?: string | null;
  /** When signalSource is cache: matches visibility scoring (TTL vs stale fallback). */
  connectorSignalCacheKind?: 'ttl' | 'stale_fallback' | null;
  topOpportunities: string[];
  opportunities?: GapOpportunity[];
  topics?: TopicGap[];
  insightsGeneratedAt?: string;
};

/** Human-readable connector line for digest UI and markdown export. */
export function weeklyDigestSignalsLabel(
  summary: Pick<WeeklyDigestSummary, 'signalSource' | 'connectorSignalCacheKind'>
): string {
  if (!summary.signalSource) {
    return '—';
  }
  if (summary.signalSource === 'live') {
    return 'live';
  }
  if (summary.connectorSignalCacheKind === 'stale_fallback') {
    return 'cache (fallback: live fetch had no metrics)';
  }
  if (summary.connectorSignalCacheKind === 'ttl') {
    return 'cache (within TTL)';
  }
  return 'cache';
}

export function weeklyDigestPipelineLabel(
  summary: Pick<WeeklyDigestSummary, 'pipelineIngestionSource'>
): string {
  return pipelineIngestionProvenanceLabel(summary.pipelineIngestionSource ?? null);
}

export type WeeklyDigest = {
  id: string;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
  summary: WeeklyDigestSummary;
};

function isPriority(v: unknown): v is GapOpportunity['priority'] {
  return v === 'high' || v === 'medium' || v === 'low';
}

function parseOpportunity(raw: unknown): GapOpportunity | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  const title = typeof o.title === 'string' ? o.title : '';
  const detail = typeof o.detail === 'string' ? o.detail : '';
  if (!id || !title) {
    return null;
  }
  const priority = isPriority(o.priority) ? o.priority : 'medium';
  return { id, title, detail, priority };
}

function parseTopic(raw: unknown): TopicGap | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const topic = typeof o.topic === 'string' ? o.topic : '';
  if (!topic) {
    return null;
  }
  const triggerCount = typeof o.triggerCount === 'number' ? o.triggerCount : 0;
  const clusterWeight = typeof o.clusterWeight === 'number' ? o.clusterWeight : 0;
  const gapScore = typeof o.gapScore === 'number' ? o.gapScore : 0;
  const recommendation = typeof o.recommendation === 'string' ? o.recommendation : '';
  return { topic, triggerCount, clusterWeight, gapScore, recommendation };
}

export function parseWeeklyDigestSummaryJson(raw: string): WeeklyDigestSummary {
  const empty: WeeklyDigestSummary = {
    score: null,
    signalSource: null,
    pipelineIngestionSource: null,
    pipelineGscDiagnosticsSummary: null,
    topOpportunities: []
  };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const score = typeof parsed.score === 'number' ? parsed.score : null;
    const signalSource =
      parsed.signalSource === 'cache' || parsed.signalSource === 'live' ? parsed.signalSource : null;
    const pipelineIngestionSource =
      parsed.pipelineIngestionSource === 'live_gsc_queries' || parsed.pipelineIngestionSource === 'mock_ingestion'
        ? parsed.pipelineIngestionSource
        : null;
    const topOpportunities = Array.isArray(parsed.topOpportunities)
      ? parsed.topOpportunities.filter((x): x is string => typeof x === 'string')
      : [];
    let opportunities: GapOpportunity[] | undefined;
    if (Array.isArray(parsed.opportunities)) {
      const list = parsed.opportunities.map(parseOpportunity).filter((x): x is GapOpportunity => x !== null);
      if (list.length > 0) {
        opportunities = list;
      }
    }
    let topics: TopicGap[] | undefined;
    if (Array.isArray(parsed.topics)) {
      const list = parsed.topics.map(parseTopic).filter((x): x is TopicGap => x !== null);
      if (list.length > 0) {
        topics = list;
      }
    }
    const insightsGeneratedAt =
      typeof parsed.insightsGeneratedAt === 'string' ? parsed.insightsGeneratedAt : undefined;
    const connectorSignalCacheKind =
      parsed.connectorSignalCacheKind === 'ttl' || parsed.connectorSignalCacheKind === 'stale_fallback'
        ? parsed.connectorSignalCacheKind
        : null;
    const pipelineGscDiagnosticsSummary =
      typeof parsed.pipelineGscDiagnosticsSummary === 'string' && parsed.pipelineGscDiagnosticsSummary.trim().length > 0
        ? parsed.pipelineGscDiagnosticsSummary.trim()
        : null;
    return {
      score,
      signalSource,
      pipelineIngestionSource,
      pipelineGscDiagnosticsSummary,
      connectorSignalCacheKind,
      topOpportunities,
      opportunities,
      topics,
      insightsGeneratedAt
    };
  } catch {
    return empty;
  }
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function generateWeeklyDigest(organizationId: string): Promise<WeeklyDigest> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      name: true,
      weeklyDigestNotifyEmail: true,
      brandName: true,
      competitorA: true,
      competitorB: true,
      competitorC: true
    }
  });

  const now = new Date();
  const periodEnd = isoDate(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 6);
  const periodStart = isoDate(start);

  const gapLatest = await readGapLatestDataForOrg(organizationId);
  const insights = buildGapInsightsFromLatestData(
    org,
    gapLatest.latestRun,
    gapLatest.latestTrend,
    gapLatest.visibility
  );

  const summary: WeeklyDigestSummary = {
    score: gapLatest.visibility ? Math.round(gapLatest.visibility.score) : null,
    signalSource: gapLatest.visibility?.inputs?.connectorSignalSource ?? null,
    pipelineIngestionSource: gapLatest.latestRun?.ingestionSource ?? null,
    pipelineGscDiagnosticsSummary: gapLatest.latestRun?.gscIngestionDiagnostics
      ? formatGscIngestionDiagnosticsSummary(gapLatest.latestRun.gscIngestionDiagnostics)
      : null,
    connectorSignalCacheKind: gapLatest.visibility?.inputs?.connectorSignalCacheKind ?? null,
    topOpportunities: insights.opportunities.slice(0, 3).map((o) => o.title),
    opportunities: insights.opportunities,
    topics: insights.topics,
    insightsGeneratedAt: insights.generatedAt
  };

  const row = await prisma.weeklyDigest.create({
    data: {
      organizationId,
      periodStart,
      periodEnd,
      summaryJson: JSON.stringify(summary)
    }
  });

  const stale = await prisma.weeklyDigest.findMany({
    where: { organizationId },
    orderBy: { generatedAt: 'desc' },
    skip: 16,
    select: { id: true }
  });
  if (stale.length > 0) {
    await prisma.weeklyDigest.deleteMany({
      where: { id: { in: stale.map((s) => s.id) } }
    });
  }

  const digest: WeeklyDigest = {
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    generatedAt: row.generatedAt.toISOString(),
    summary
  };

  const orgName = org?.name?.trim() || 'Organization';
  const emailResult = await sendWeeklyDigestEmail({
    to: org?.weeklyDigestNotifyEmail,
    orgName,
    periodStart,
    periodEnd,
    generatedAt: digest.generatedAt,
    summary
  });

  if (
    process.env.NODE_ENV === 'development' &&
    !emailResult.sent &&
    emailResult.reason === 'no_provider_config' &&
    org?.weeklyDigestNotifyEmail?.trim()
  ) {
    console.warn(
      '[weeklyDigest] Brand notify email is set but neither RESEND_API_KEY+RESEND_FROM_EMAIL nor SMTP_URL+SMTP_FROM is configured'
    );
  }
  if (!emailResult.sent && emailResult.reason === 'error') {
    console.error('[weeklyDigest] email delivery failed:', emailResult.detail);
  }

  return digest;
}

export async function getWeeklyDigestForOrg(
  organizationId: string,
  digestId: string
): Promise<WeeklyDigest | null> {
  const row = await prisma.weeklyDigest.findFirst({
    where: { id: digestId, organizationId }
  });
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    generatedAt: row.generatedAt.toISOString(),
    summary: parseWeeklyDigestSummaryJson(row.summaryJson)
  };
}

export async function listWeeklyDigests(organizationId: string): Promise<WeeklyDigest[]> {
  const rows = await prisma.weeklyDigest.findMany({
    where: { organizationId },
    orderBy: { generatedAt: 'desc' }
  });
  return rows.map((row) => ({
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    generatedAt: row.generatedAt.toISOString(),
    summary: parseWeeklyDigestSummaryJson(row.summaryJson)
  }));
}

export async function readLatestWeeklyDigest(organizationId: string): Promise<WeeklyDigest | null> {
  const row = await prisma.weeklyDigest.findFirst({
    where: { organizationId },
    orderBy: { generatedAt: 'desc' }
  });
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    generatedAt: row.generatedAt.toISOString(),
    summary: parseWeeklyDigestSummaryJson(row.summaryJson)
  };
}
