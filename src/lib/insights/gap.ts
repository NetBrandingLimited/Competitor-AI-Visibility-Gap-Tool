import { prisma } from '@/lib/prisma';
import { readLatestPipelineRun } from '@/lib/pipeline/store';
import type { UnifiedPipelineRun } from '@/lib/pipeline/types';
import { readLatestTrendSnapshot } from '@/lib/trends/store';
import type { TrendSnapshot } from '@/lib/trends/store';
import { getLatestVisibilityScore } from '@/lib/visibility/scoreV1';

export type GapOpportunity = {
  id: string;
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
};

export type TopicGap = {
  topic: string;
  triggerCount: number;
  clusterWeight: number;
  gapScore: number;
  recommendation: string;
};

export type GapInsights = {
  generatedAt: string;
  upstreamAsOf: string | null;
  opportunities: GapOpportunity[];
  topics: TopicGap[];
};

type GapOrgFields = {
  brandName: string | null;
  competitorA: string | null;
  competitorB: string | null;
  competitorC: string | null;
};

type GapVisibilityInput = {
  score: number;
  createdAt: string;
  inputs?: {
    connectorSignalSource: 'cache' | 'live';
    connectorSignalCacheKind?: 'ttl' | 'stale_fallback' | null;
  };
} | null;

export type GapLatestData = {
  org: GapOrgFields | null;
  latestRun: UnifiedPipelineRun | null;
  latestTrend: TrendSnapshot | null;
  visibility: GapVisibilityInput;
};

function norm(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export async function readGapLatestDataForOrg(organizationId: string): Promise<GapLatestData> {
  const [org, latestRun, latestTrend, visibility] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        brandName: true,
        competitorA: true,
        competitorB: true,
        competitorC: true
      }
    }),
    readLatestPipelineRun(organizationId),
    readLatestTrendSnapshot(organizationId),
    getLatestVisibilityScore(organizationId)
  ]);
  return {
    org,
    latestRun,
    latestTrend,
    visibility
  };
}

export function buildGapInsightsFromLatestData(
  org: GapOrgFields | null,
  latestRun: UnifiedPipelineRun | null,
  latestTrend: TrendSnapshot | null,
  visibility: GapVisibilityInput
): GapInsights {
  const opportunities: GapOpportunity[] = [];
  const brandName = org?.brandName?.trim() || 'your brand';
  const competitors = [org?.competitorA, org?.competitorB, org?.competitorC]
    .map((x) => x?.trim())
    .filter((x): x is string => Boolean(x));

  const upstreamTimes = [latestRun?.createdAt, latestTrend?.generatedAt, visibility?.createdAt].filter(
    (iso): iso is string => Boolean(iso)
  );
  const upstreamAsOf =
    upstreamTimes.length > 0
      ? new Date(Math.max(...upstreamTimes.map((iso) => new Date(iso).getTime()))).toISOString()
      : null;
  if (latestTrend) {
    const top = norm(latestTrend.topBrand);
    const brand = norm(brandName);
    if (brand && top && !top.includes(brand) && !brand.includes(top)) {
      opportunities.push({
        id: 'trend-leader-gap',
        title: 'Top-of-mentions leadership gap',
        detail: `${latestTrend.topBrand} is currently leading in mentions. Prioritize comparison/replacement content focused on ${brandName} vs top rival claims.`,
        priority: 'high'
      });
    }
  }

  if (visibility && visibility.score < 55) {
    opportunities.push({
      id: 'score-under-threshold',
      title: 'Visibility score below target',
      detail: `Current score is ${Math.round(visibility.score)}. Focus on high-intent triggers and coverage depth in weak topics to move above 60.`,
      priority: 'high'
    });
  }

  if (latestRun && latestRun.triggers.length > 0) {
    const byCategory = new Map<string, number>();
    for (const t of latestRun.triggers) {
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + 1);
    }
    const sparse = ['comparison', 'alternatives', 'pricing'].filter((k) => (byCategory.get(k) ?? 0) < 2);
    if (sparse.length > 0) {
      opportunities.push({
        id: 'trigger-coverage-gap',
        title: 'High-intent trigger coverage gap',
        detail: `Low trigger depth in ${sparse.join(', ')}. Add pages/FAQ blocks targeting these query intents versus ${competitors.join(', ') || 'competitors'}.`,
        priority: 'medium'
      });
    }
  }

  if (opportunities.length === 0) {
    opportunities.push({
      id: 'baseline-maintain',
      title: 'Maintain momentum',
      detail: 'No severe gaps detected in current mock signals. Continue publishing comparative and alternatives content to keep share.',
      priority: 'low'
    });
  }

  const topics: TopicGap[] = [];
  if (latestRun) {
    const triggerHits = new Map<string, number>();
    for (const t of latestRun.triggers) {
      const p = norm(t.phrase);
      for (const cluster of latestRun.clusters) {
        if (cluster.keywords.some((k) => p.includes(norm(k)))) {
          triggerHits.set(cluster.id, (triggerHits.get(cluster.id) ?? 0) + 1);
        }
      }
    }
    for (const cluster of latestRun.clusters) {
      const count = triggerHits.get(cluster.id) ?? 0;
      const weight = Math.max(1, cluster.itemCount);
      const gapScore = Math.max(0, Math.round(weight * 1.8 - count * 2));
      topics.push({
        topic: cluster.label,
        triggerCount: count,
        clusterWeight: weight,
        gapScore,
        recommendation:
          gapScore >= 8
            ? `Create focused ${cluster.label} comparison content and strengthen FAQ snippets.`
            : `Keep monitoring ${cluster.label}; add incremental examples and proof points.`
      });
    }
    topics.sort((a, b) => b.gapScore - a.gapScore);
  }

  return {
    generatedAt: new Date().toISOString(),
    upstreamAsOf,
    opportunities,
    topics: topics.slice(0, 8)
  };
}

export async function buildGapInsightsForOrg(organizationId: string): Promise<GapInsights> {
  const { org, latestRun, latestTrend, visibility } = await readGapLatestDataForOrg(organizationId);
  return buildGapInsightsFromLatestData(org, latestRun, latestTrend, visibility);
}
