import type { IngestionBrandContext, SourceDocument } from '@/lib/ingestion/types';

export type OrgBrandFields = IngestionBrandContext;

export type LeaderboardRow = {
  brand: string;
  mentions: number;
  shareOfVoice: number;
  delta7d: number;
};

export type RecentAnswerRow = {
  source: string;
  query: string;
  topBrand: string;
  publishedAt: string;
};

export type DashboardSnapshot = {
  generatedAt: string;
  leaderboard: LeaderboardRow[];
  recent: RecentAnswerRow[];
};

/** Deterministic hash for mock variation (e.g. per pipeline run). */
export function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Default search query for mock ingestion when none is passed in the URL. */
export function defaultPipelineQueryFromOrg(f: OrgBrandFields): string {
  const tokens = [f.brandName, f.category, f.competitorA, f.competitorB, f.competitorC]
    .map((x) => x?.trim())
    .filter((x): x is string => Boolean(x && x.length > 0));
  if (tokens.length === 0) {
    return 'ai visibility competitor comparison';
  }
  return `${tokens.join(' ')} alternatives reviews`.slice(0, 220);
}

/** Leaderboard + recent answers derived from org brand / category / competitors (mock, deterministic). */
export function getDashboardSnapshotForOrganization(
  f: OrgBrandFields,
  now = new Date()
): DashboardSnapshot {
  const brand = f.brandName?.trim() || 'Your brand (set in Brand settings)';
  const cat = f.category?.trim() || 'your category';
  const c1 = f.competitorA?.trim() || 'Competitor A (set in Brand settings)';
  const c2 = f.competitorB?.trim() || 'Competitor B (set in Brand settings)';
  const c3 = f.competitorC?.trim() || 'Competitor C (set in Brand settings)';
  const seed = simpleHash(`${brand}|${c1}|${c2}|${c3}`);
  const minuteTick = Math.floor(now.getTime() / 60_000) % 3;

  const baseMentions = [34, 29, 24, 15, 8];
  const leaderboard: LeaderboardRow[] = [brand, c1, c2, c3, 'Other'].map((name, index) => {
    const mentions =
      baseMentions[index] +
      ((seed + index + minuteTick) % 4) -
      (index === 4 ? 0 : ((seed >> (index * 3)) % 3) & 0xff);
    return {
      brand: name,
      mentions: Math.max(3, mentions),
      shareOfVoice: 0,
      delta7d: (((seed >> index) % 7) - 3) / 100
    };
  });

  const total = leaderboard.reduce((sum, r) => sum + r.mentions, 0);
  for (const row of leaderboard) {
    row.shareOfVoice = total > 0 ? row.mentions / total : 0;
  }

  const recent: RecentAnswerRow[] = [
    {
      source: 'reddit-mock',
      query: `best ${cat} for teams comparing ${brand}`,
      topBrand: brand,
      publishedAt: new Date(now.getTime() - 15 * 60_000).toISOString()
    },
    {
      source: 'hn-mock',
      query: `${brand} vs ${c1} pricing and features`,
      topBrand: c1,
      publishedAt: new Date(now.getTime() - 38 * 60_000).toISOString()
    },
    {
      source: 'reddit-mock',
      query: `alternatives to ${c2} in ${cat}`,
      topBrand: brand,
      publishedAt: new Date(now.getTime() - 56 * 60_000).toISOString()
    },
    {
      source: 'hn-mock',
      query: `${c3} or ${brand} for enterprise`,
      topBrand: c3,
      publishedAt: new Date(now.getTime() - 85 * 60_000).toISOString()
    }
  ];

  return {
    generatedAt: now.toISOString(),
    leaderboard,
    recent
  };
}

export function getDashboardSnapshot(): DashboardSnapshot {
  return getDashboardSnapshotForOrganization({});
}

/** Append org-specific wording so trigger extraction reflects this workspace. */
export function enrichDocumentsWithOrgContext(
  documents: SourceDocument[],
  ctx: OrgBrandFields
): SourceDocument[] {
  const brand = ctx.brandName?.trim();
  const cat = ctx.category?.trim();
  const rivals = [ctx.competitorA, ctx.competitorB, ctx.competitorC]
    .map((x) => x?.trim())
    .filter((x): x is string => Boolean(x));
  if (!brand && !cat && rivals.length === 0) {
    return documents;
  }
  const rivalLine =
    rivals.length > 0
      ? `Discussion compares ${brand ?? 'the brand'} with ${rivals.join(', ')}.`
      : `Discussion focuses on ${brand ?? 'the brand'}.`;
  const catLine = cat ? `Category context: ${cat}.` : '';
  const suffix = `${rivalLine} ${catLine} Which option has better AI visibility and trust?`.trim();

  return documents.map((d) => ({
    ...d,
    content: `${d.content}\n\n${suffix}`
  }));
}
