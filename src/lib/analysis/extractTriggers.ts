import type { QuestionTrigger } from './types';

type Heuristic = {
  phrase: string;
  category: QuestionTrigger['category'];
  score: number;
};

const HEURISTICS: Heuristic[] = [
  { phrase: 'best', category: 'recommendation', score: 0.85 },
  { phrase: 'top', category: 'recommendation', score: 0.8 },
  { phrase: 'vs', category: 'comparison', score: 0.9 },
  { phrase: 'compare', category: 'comparison', score: 0.88 },
  { phrase: 'alternative', category: 'alternatives', score: 0.84 },
  { phrase: 'alternatives', category: 'alternatives', score: 0.84 },
  { phrase: 'pricing', category: 'pricing', score: 0.82 },
  { phrase: 'cost', category: 'pricing', score: 0.78 },
  { phrase: 'feature', category: 'feature', score: 0.72 },
  { phrase: 'features', category: 'feature', score: 0.72 }
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function extractQuestionTriggers(text: string): QuestionTrigger[] {
  const normalized = text.toLowerCase();
  const tokens = tokenize(text);
  const found: QuestionTrigger[] = [];

  for (const heuristic of HEURISTICS) {
    const phraseFound = normalized.includes(heuristic.phrase);
    if (!phraseFound) {
      continue;
    }

    const evidenceToken = tokens.find((token) => token === heuristic.phrase) ?? heuristic.phrase;
    found.push({
      phrase: heuristic.phrase,
      category: heuristic.category,
      score: heuristic.score,
      evidence: evidenceToken
    });
  }

  // Deduplicate repeated heuristics while keeping highest score.
  const byPhrase = new Map<string, QuestionTrigger>();
  for (const trigger of found) {
    const existing = byPhrase.get(trigger.phrase);
    if (!existing || trigger.score > existing.score) {
      byPhrase.set(trigger.phrase, trigger);
    }
  }
  return [...byPhrase.values()].sort((a, b) => b.score - a.score);
}
