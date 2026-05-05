import { countLabelMentions } from '@/lib/dashboard/pipelineSnapshot';
import type { OrgBrandFields } from '@/lib/org-visibility-mock';

function trackedBrandNames(org: OrgBrandFields): string[] {
  const names = [org.brandName, org.competitorA, org.competitorB, org.competitorC]
    .map((x) => x?.trim())
    .filter((x): x is string => Boolean(x && x.length > 0));
  return Array.from(new Set(names));
}

export type LlmAnswerAnalytics = {
  trackedBrands: string[];
  mentionsByBrand: Record<string, number>;
  totalMentions: number;
  /** Workspace brand’s share of mention counts across tracked brands (null if no brand or no mentions). */
  brandShareOfMentions: number | null;
  topBrandByMentions: string | null;
  brandIsTopOrTied: boolean;
};

/**
 * Heuristic analytics on raw LLM output: same whole-word / phrase rules as pipeline leaderboard (`countLabelMentions`).
 */
export function analyzeLlmOutput(answerText: string, org: OrgBrandFields | null): LlmAnswerAnalytics | null {
  const text = typeof answerText === 'string' ? answerText.trim() : '';
  if (!text) {
    return null;
  }
  const brands = trackedBrandNames(org ?? {});
  if (brands.length === 0) {
    return null;
  }

  const mentionsByBrand: Record<string, number> = {};
  let totalMentions = 0;
  for (const b of brands) {
    const c = countLabelMentions(text, b);
    mentionsByBrand[b] = c;
    totalMentions += c;
  }

  const brandRaw = org?.brandName?.trim();
  const brandShareOfMentions =
    brandRaw && totalMentions > 0 ? (mentionsByBrand[brandRaw] ?? 0) / totalMentions : null;

  let topBrandByMentions: string | null = null;
  let topCount = -1;
  for (const b of brands) {
    const c = mentionsByBrand[b] ?? 0;
    if (c > topCount) {
      topCount = c;
      topBrandByMentions = b;
    }
  }
  if (topCount <= 0) {
    topBrandByMentions = null;
  }

  const brandCount = brandRaw ? (mentionsByBrand[brandRaw] ?? 0) : 0;
  /** Workspace brand is tied for or sole leader in raw mention counts. */
  const brandIsTopOrTied = Boolean(brandRaw) && topCount > 0 && brandCount === topCount;

  return {
    trackedBrands: brands,
    mentionsByBrand,
    totalMentions,
    brandShareOfMentions,
    topBrandByMentions,
    brandIsTopOrTied
  };
}
