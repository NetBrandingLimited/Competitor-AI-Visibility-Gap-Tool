/**
 * OpenAI-compatible Chat Completions (OpenAI, Groq, OpenRouter, etc.).
 */
export async function fetchOpenAiCompatibleChatCompletion(args: {
  apiKey: string;
  model: string;
  userPrompt: string;
  /** Default: https://api.openai.com/v1/chat/completions */
  endpoint?: string;
  /** Extra headers (e.g. OpenRouter HTTP-Referer). */
  extraHeaders?: Record<string, string>;
  /** Shown in error messages. */
  providerLabel?: string;
}): Promise<{ text: string; model: string }> {
  const endpoint = args.endpoint ?? 'https://api.openai.com/v1/chat/completions';
  const label = args.providerLabel ?? 'OpenAI';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${args.apiKey}`,
      ...(args.extraHeaders ?? {})
    },
    body: JSON.stringify({
      model: args.model,
      messages: [{ role: 'user', content: args.userPrompt }],
      temperature: 0.2
    })
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`${label} HTTP ${res.status}: ${raw.slice(0, 800)}`);
  }
  const data = JSON.parse(raw) as {
    model?: string;
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = (data.choices?.[0]?.message?.content ?? '').trim();
  return { text, model: data.model ?? args.model };
}

/**
 * OpenAI Chat Completions — maps product surface `openai_chatgpt` to the OpenAI API (not the public ChatGPT website).
 */
export async function fetchOpenAiChatCompletion(args: {
  apiKey: string;
  model: string;
  userPrompt: string;
}): Promise<{ text: string; model: string }> {
  return fetchOpenAiCompatibleChatCompletion({
    ...args,
    providerLabel: 'OpenAI'
  });
}
