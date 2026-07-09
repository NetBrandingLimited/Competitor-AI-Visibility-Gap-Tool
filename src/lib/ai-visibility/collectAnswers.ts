import { normalizeTargetSurfaces, type PromptSurfaceId } from '@/lib/ai-visibility/measurement';
import { prisma } from '@/lib/prisma';
import type { AiAnswerSamplePrismaDelegate } from '@/lib/prisma/aiAnswerSampleDelegate';
import { getAiAnswerSampleDelegate } from '@/lib/prisma/aiAnswerSampleDelegate';
import { fetchAnthropicMessage } from '@/lib/ai-visibility/providers/anthropic';
import { fetchGeminiGenerateContent } from '@/lib/ai-visibility/providers/gemini';
import { fetchOpenAiChatCompletion } from '@/lib/ai-visibility/providers/openai';

export type CollectAnswersSummary = {
  attempted: number;
  persisted: number;
  skippedNoCredentials: { surface: PromptSurfaceId; reason: string }[];
  failures: { trackedPromptId: string; surface: string; message: string }[];
};

function openAiModel(): string {
  return process.env.OPENAI_ANSWER_MODEL?.trim() || 'gpt-4o-mini';
}

function anthropicModel(): string {
  return process.env.ANTHROPIC_ANSWER_MODEL?.trim() || 'claude-3-5-sonnet-20241022';
}

function geminiModel(): string {
  return (
    process.env.GOOGLE_GENERATIVE_AI_ANSWER_MODEL?.trim() ||
    process.env.GEMINI_ANSWER_MODEL?.trim() ||
    'gemini-2.0-flash'
  );
}

export function resolveGeminiApiKey(): string {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    ''
  );
}

function providerForSurface(surface: PromptSurfaceId): string {
  if (surface === 'openai_chatgpt') return 'openai';
  if (surface === 'anthropic_claude') return 'anthropic';
  if (surface === 'google_gemini') return 'google';
  return 'unknown';
}

function modelForSurface(surface: PromptSurfaceId): string {
  if (surface === 'openai_chatgpt') return openAiModel();
  if (surface === 'anthropic_claude') return anthropicModel();
  if (surface === 'google_gemini') return geminiModel();
  return '—';
}

async function collectOne(args: {
  organizationId: string;
  trackedPromptId: string;
  promptText: string;
  surface: PromptSurfaceId;
  aiAnswerSample: AiAnswerSamplePrismaDelegate;
}): Promise<{ persisted: boolean; failureMessage?: string }> {
  const { aiAnswerSample } = args;
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const geminiKey = resolveGeminiApiKey();

  try {
    if (args.surface === 'openai_chatgpt') {
      if (!openaiKey) {
        return { persisted: false, failureMessage: 'OPENAI_API_KEY is not set' };
      }
      const { text, model } = await fetchOpenAiChatCompletion({
        apiKey: openaiKey,
        model: openAiModel(),
        userPrompt: args.promptText
      });
      await aiAnswerSample.create({
        data: {
          organizationId: args.organizationId,
          trackedPromptId: args.trackedPromptId,
          surface: args.surface,
          provider: 'openai',
          model,
          answerText: text,
          error: null
        }
      });
      return { persisted: true };
    }

    if (args.surface === 'anthropic_claude') {
      if (!anthropicKey) {
        return { persisted: false, failureMessage: 'ANTHROPIC_API_KEY is not set' };
      }
      const { text, model } = await fetchAnthropicMessage({
        apiKey: anthropicKey,
        model: anthropicModel(),
        userPrompt: args.promptText
      });
      await aiAnswerSample.create({
        data: {
          organizationId: args.organizationId,
          trackedPromptId: args.trackedPromptId,
          surface: args.surface,
          provider: 'anthropic',
          model,
          answerText: text,
          error: null
        }
      });
      return { persisted: true };
    }

    if (args.surface === 'google_gemini') {
      if (!geminiKey) {
        return {
          persisted: false,
          failureMessage: 'GOOGLE_GENERATIVE_AI_API_KEY (or GEMINI_API_KEY) is not set'
        };
      }
      const { text, model } = await fetchGeminiGenerateContent({
        apiKey: geminiKey,
        model: geminiModel(),
        userPrompt: args.promptText
      });
      await aiAnswerSample.create({
        data: {
          organizationId: args.organizationId,
          trackedPromptId: args.trackedPromptId,
          surface: args.surface,
          provider: 'google',
          model,
          answerText: text,
          error: null
        }
      });
      return { persisted: true };
    }

    return {
      persisted: false,
      failureMessage: `No API collector implemented for surface "${args.surface}" yet`
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    await aiAnswerSample.create({
      data: {
        organizationId: args.organizationId,
        trackedPromptId: args.trackedPromptId,
        surface: args.surface,
        provider: providerForSurface(args.surface),
        model: modelForSurface(args.surface),
        answerText: '',
        error: message.slice(0, 4000)
      }
    });
    return { persisted: true, failureMessage: message };
  }
}

/**
 * For each active tracked prompt, call LLM APIs for each target surface that has a collector.
 * Does not use Search Console or pipeline documents — stored rows are API model outputs (or API error captures).
 */
export async function collectAiAnswersForOrganization(args: {
  organizationId: string;
  promptIds?: string[];
}): Promise<CollectAnswersSummary> {
  const summary: CollectAnswersSummary = {
    attempted: 0,
    persisted: 0,
    skippedNoCredentials: [],
    failures: []
  };

  const aiAnswerSample = getAiAnswerSampleDelegate();
  if (!aiAnswerSample) {
    summary.failures.push({
      trackedPromptId: '—',
      surface: '—',
      message:
        'Prisma client has no AiAnswerSample model. Run `npx prisma generate`, apply migrations, and restart the server.'
    });
    return summary;
  }

  const where: { organizationId: string; isActive: boolean; id?: { in: string[] } } = {
    organizationId: args.organizationId,
    isActive: true
  };
  if (args.promptIds && args.promptIds.length > 0) {
    where.id = { in: args.promptIds };
  }

  const prompts = await prisma.trackedPrompt.findMany({
    where,
    orderBy: { sortOrder: 'asc' }
  });

  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const geminiKey = resolveGeminiApiKey();

  const implementedSurfaces = new Set<PromptSurfaceId>([
    'openai_chatgpt',
    'anthropic_claude',
    'google_gemini'
  ]);

  for (const p of prompts) {
    let surfaces: PromptSurfaceId[];
    try {
      surfaces = normalizeTargetSurfaces(JSON.parse(p.targetSurfacesJson || '[]'));
    } catch {
      surfaces = [];
    }
    for (const surface of surfaces) {
      summary.attempted += 1;

      if (surface === 'openai_chatgpt' && !openaiKey) {
        summary.skippedNoCredentials.push({ surface, reason: 'OPENAI_API_KEY' });
        continue;
      }
      if (surface === 'anthropic_claude' && !anthropicKey) {
        summary.skippedNoCredentials.push({ surface, reason: 'ANTHROPIC_API_KEY' });
        continue;
      }
      if (surface === 'google_gemini' && !geminiKey) {
        summary.skippedNoCredentials.push({
          surface,
          reason: 'GOOGLE_GENERATIVE_AI_API_KEY'
        });
        continue;
      }
      if (!implementedSurfaces.has(surface)) {
        summary.skippedNoCredentials.push({ surface, reason: 'no_provider_implemented' });
        continue;
      }

      const result = await collectOne({
        organizationId: args.organizationId,
        trackedPromptId: p.id,
        promptText: p.text,
        surface,
        aiAnswerSample
      });
      if (result.persisted) {
        summary.persisted += 1;
      }
      if (result.failureMessage) {
        summary.failures.push({
          trackedPromptId: p.id,
          surface,
          message: result.failureMessage
        });
      }
    }
  }

  return summary;
}
