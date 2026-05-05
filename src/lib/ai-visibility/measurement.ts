/**
 * Measurement unit for the AI-answer visibility vision:
 * one row = **what we ask** (prompt text + metadata) × **where we plan to ask it** (target surfaces).
 * Scheduler / LLM connectors will later execute `(prompt × surface)` runs on a cadence.
 */

/** Named product surfaces where the same prompt may be executed (API or UI automation TBD). */
export const PROMPT_SURFACE_IDS = [
  'openai_chatgpt',
  'anthropic_claude',
  'google_gemini',
  'perplexity',
  'microsoft_copilot',
  'meta_ai',
  'other'
] as const;

export type PromptSurfaceId = (typeof PROMPT_SURFACE_IDS)[number];

/** Short UI labels for settings checkboxes. */
export const PROMPT_SURFACE_LABELS: Record<PromptSurfaceId, string> = {
  openai_chatgpt: 'OpenAI ChatGPT',
  anthropic_claude: 'Anthropic Claude',
  google_gemini: 'Google Gemini',
  perplexity: 'Perplexity',
  microsoft_copilot: 'Microsoft Copilot',
  meta_ai: 'Meta AI',
  other: 'Other'
};

const SURFACE_SET = new Set<string>(PROMPT_SURFACE_IDS);

export function isPromptSurfaceId(s: string): s is PromptSurfaceId {
  return SURFACE_SET.has(s);
}

/** Dedupe, filter unknown ids, preserve order. */
export function normalizeTargetSurfaces(raw: unknown): PromptSurfaceId[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: PromptSurfaceId[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    if (typeof x !== 'string' || !isPromptSurfaceId(x) || seen.has(x)) {
      continue;
    }
    seen.add(x);
    out.push(x);
  }
  return out;
}

export const TRACKED_PROMPT_TEXT_MAX = 8000;
export const TRACKED_PROMPTS_MAX_PER_ORG = 50;

export type TrackedPromptDTO = {
  id: string;
  text: string;
  label: string | null;
  category: string | null;
  isActive: boolean;
  sortOrder: number;
  targetSurfaces: PromptSurfaceId[];
  createdAt: string;
  updatedAt: string;
};
