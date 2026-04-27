import type { SourceDocument } from '@/lib/ingestion/types';
import type { LeaderboardRow, OrgBrandFields, RecentAnswerRow } from '@/lib/org-visibility-mock';
import type { UnifiedPipelineRun } from '@/lib/pipeline/types';

export type PipelineDashboardSnapshot = {
  generatedAt: string;
  leaderboard: LeaderboardRow[];
  recent: RecentAnswerRow[];
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Count how often `label` appears in `text` (case-insensitive). */
export function countLabelMentions(text: string, label: string): number {
  const needle = label.trim();
  if (needle.length < 2) {
    return 0;
  }
  const t = text.toLowerCase();
  const l = needle.toLowerCase();
  if (l.includes(' ')) {
    let count = 0;
    let i = 0;
    while (i <= t.length) {
      const j = t.indexOf(l, i);
      if (j === -1) {
        break;
      }
      count += 1;
      i = j + l.length;
    }
    return count;
  }
  const re = new RegExp(`\\b${escapeRegExp(l)}\\b`, 'gi');
  const m = t.match(re);
  return m ? m.length : 0;
}

function trackedBrandNames(org: OrgBrandFields): string[] {
  const names = [org.brandName, org.competitorA, org.competitorB, org.competitorC]
    .map((x) => x?.trim())
    .filter((x): x is string => Boolean(x && x.length > 0));
  return Array.from(new Set(names));
}

function documentText(doc: SourceDocument): string {
  return `${doc.title}\n${doc.content}`;
}

function mentionTotalsForDocuments(
  documents: SourceDocument[],
  brands: string[]
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const b of brands) {
    totals.set(b, 0);
  }
  for (const doc of documents) {
    const blob = documentText(doc);
    for (const b of brands) {
      totals.set(b, (totals.get(b) ?? 0) + countLabelMentions(blob, b));
    }
  }
  return totals;
}

function leaderboardFromTotals(
  brands: string[],
  totals: Map<string, number>,
  prevShare: Map<string, number> | null
): LeaderboardRow[] {
  const rows: LeaderboardRow[] = brands.map((brand) => ({
    brand,
    mentions: totals.get(brand) ?? 0,
    shareOfVoice: 0,
    delta7d: 0
  }));
  const sum = rows.reduce((acc, r) => acc + r.mentions, 0);
  for (const row of rows) {
    row.shareOfVoice = sum > 0 ? row.mentions / sum : 0;
    if (prevShare) {
      const was = prevShare.get(row.brand) ?? 0;
      row.delta7d = row.shareOfVoice - was;
    }
  }
  return rows.sort((a, b) => b.mentions - a.mentions);
}

function topBrandInDoc(doc: SourceDocument, brands: string[]): string {
  const blob = documentText(doc);
  let best = brands[0] ?? '—';
  let bestCount = -1;
  for (const b of brands) {
    const c = countLabelMentions(blob, b);
    if (c > bestCount) {
      bestCount = c;
      best = b;
    }
  }
  return bestCount <= 0 ? '—' : best;
}

function recentFromDocuments(
  documents: SourceDocument[],
  brands: string[],
  fallbackQuery: string
): RecentAnswerRow[] {
  const sorted = [...documents].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  return sorted.slice(0, 12).map((doc) => ({
    source: doc.source,
    query: doc.title?.trim() || fallbackQuery,
    topBrand: topBrandInDoc(doc, brands),
    publishedAt: doc.publishedAt
  }));
}

/**
 * Build leaderboard + recent tables from ingested documents in a pipeline run.
 * `previousRun` optional: when present, `delta7d` is change in share-of-voice vs that run.
 */
export function buildPipelineDashboardSnapshot(
  org: OrgBrandFields,
  run: UnifiedPipelineRun,
  previousRun: UnifiedPipelineRun | null
): PipelineDashboardSnapshot | null {
  const brands = trackedBrandNames(org);
  if (brands.length === 0 || run.documents.length === 0) {
    return null;
  }

  const totals = mentionTotalsForDocuments(run.documents, brands);
  let prevShare: Map<string, number> | null = null;
  if (previousRun && previousRun.documents.length > 0) {
    const prevTotals = mentionTotalsForDocuments(previousRun.documents, brands);
    const prevRows = leaderboardFromTotals(brands, prevTotals, null);
    prevShare = new Map(prevRows.map((r) => [r.brand, r.shareOfVoice]));
  }

  const leaderboard = leaderboardFromTotals(brands, totals, prevShare);
  const recent = recentFromDocuments(run.documents, brands, run.query);

  return {
    generatedAt: run.createdAt,
    leaderboard,
    recent
  };
}
