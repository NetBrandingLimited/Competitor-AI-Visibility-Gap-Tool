import { fetchOpenAiCompatibleChatCompletion } from './openai';

/**
 * Groq OpenAI-compatible Chat Completions — surface `groq`.
 * @see https://console.groq.com/docs/openai
 */
export async function fetchGroqChatCompletion(args: {
  apiKey: string;
  model: string;
  userPrompt: string;
}): Promise<{ text: string; model: string }> {
  return fetchOpenAiCompatibleChatCompletion({
    ...args,
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    providerLabel: 'Groq'
  });
}
