/**
 * Anthropic Messages API — maps surface `anthropic_claude` to Claude (not browser automation).
 */
export async function fetchAnthropicMessage(args: {
  apiKey: string;
  model: string;
  userPrompt: string;
}): Promise<{ text: string; model: string }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: args.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: args.userPrompt }]
    })
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Anthropic HTTP ${res.status}: ${raw.slice(0, 800)}`);
  }
  const data = JSON.parse(raw) as {
    model?: string;
    content?: Array<{ type: string; text?: string }>;
  };
  let text = '';
  for (const block of data.content ?? []) {
    if (block.type === 'text' && block.text) {
      text += block.text;
    }
  }
  return { text: text.trim(), model: data.model ?? args.model };
}
