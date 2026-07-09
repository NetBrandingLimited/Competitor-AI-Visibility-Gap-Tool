/**
 * Google Generative Language API — maps surface `google_gemini` to Gemini (not the Gemini app UI).
 */
export async function fetchGeminiGenerateContent(args: {
  apiKey: string;
  model: string;
  userPrompt: string;
}): Promise<{ text: string; model: string }> {
  const model = args.model.replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': args.apiKey
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: args.userPrompt }] }],
      generationConfig: { temperature: 0.2 }
    })
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}: ${raw.slice(0, 800)}`);
  }

  const data = JSON.parse(raw) as {
    modelVersion?: string;
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  let text = '';
  for (const part of data.candidates?.[0]?.content?.parts ?? []) {
    if (part.text) {
      text += part.text;
    }
  }

  return { text: text.trim(), model: data.modelVersion ?? model };
}
