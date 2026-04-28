import { prisma } from '@/lib/prisma';
import type { GapOpportunity, TopicGap } from '@/lib/insights/gap';
import { buildGapInsightsForOrg } from '@/lib/insights/gap';
import { getLatestVisibilityScore } from '@/lib/visibility/scoreV1';
import { sendWeeklyDigestEmail } from '@/lib/email/weeklyDigestEmail';

export type WeeklyDigestSummary = {
  score: number | null;
  signalSource: 'cache' | 'live' | null;
  topOpportunities: string[];
  opportunities?: GapOpportunity[];
  topics?: TopicGap[];
  insightsGeneratedAt?: string;
};

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
    topOpportunities: []
  };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const score = typeof parsed.score === 'number' ? parsed.score : null;
    const signalSource =
      parsed.signalSource === 'cache' || parsed.signalSource === 'live' ? parsed.signalSource : null;
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
    return {
      score,
      signalSource,
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
    select: { name: true, weeklyDigestNotifyEmail: true }
  });

  const now = new Date();
  const periodEnd = isoDate(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - 6);
  const periodStart = isoDate(start);

  const [insights, latestVisibility] = await Promise.all([
    buildGapInsightsForOrg(organizationId),
    getLatestVisibilityScore(organizationId)
  ]);

  const summary: WeeklyDigestSummary = {
    score: latestVisibility ? Math.round(latestVisibility.score) : null,
    signalSource: latestVisibility?.inputs.connectorSignalSource ?? null,
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
