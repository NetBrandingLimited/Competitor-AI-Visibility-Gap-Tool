import type { QuestionTrigger, ThemeCluster } from './types';

type CategoryLabel = Record<QuestionTrigger['category'], string>;

const CATEGORY_LABEL: CategoryLabel = {
  comparison: 'Comparison Queries',
  recommendation: 'Recommendation Queries',
  pricing: 'Pricing Questions',
  alternatives: 'Alternative Discovery',
  feature: 'Feature Evaluation',
  other: 'Other'
};

/**
 * Baseline clustering stub:
 * groups trigger phrases by category and returns cluster metadata.
 */
export function clusterThemes(triggers: QuestionTrigger[]): ThemeCluster[] {
  const buckets = new Map<QuestionTrigger['category'], string[]>();

  for (const trigger of triggers) {
    const existing = buckets.get(trigger.category) ?? [];
    existing.push(trigger.phrase);
    buckets.set(trigger.category, existing);
  }

  return [...buckets.entries()].map(([category, phrases]) => {
    const uniqueKeywords = [...new Set(phrases)];
    return {
      id: `cluster-${category}`,
      label: CATEGORY_LABEL[category],
      keywords: uniqueKeywords,
      itemCount: phrases.length
    };
  });
}
