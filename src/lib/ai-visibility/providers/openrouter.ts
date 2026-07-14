import { fetchOpenAiCompatibleChatCompletion } from './openai';

/**
 * OpenRouter OpenAI-compatible Chat Completions — surface `openrouter`.
 * @see https://openrouter.ai/docs/api-reference/chat-completion
 */
export async function fetchOpenRouterChatCompletion(args: {
  apiKey: string;
  model: string;
  userPrompt: string;
}): Promise<{ text: string; model: string }> {
  const referer =
    process.env.OPENROUTER_HTTP_REFERER?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://competitor-ai-visibility-gap.netbranding.co.nz';
  const title = process.env.OPENROUTER_APP_TITLE?.trim() || 'Competitor AI Visibility Gap Tool';

  return fetchOpenAiCompatibleChatCompletion({
    ...args,
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    providerLabel: 'OpenRouter',
    extraHeaders: {
      'HTTP-Referer': referer,
      'X-Title': title
    }
  });
}
