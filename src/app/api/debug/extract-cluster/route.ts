import { NextResponse, type NextRequest } from 'next/server';

import { resolveActiveOrgSessionForRequest } from '@/lib/active-org';
import { clusterThemes } from '@/lib/analysis/clusterThemes';
import { extractQuestionTriggers } from '@/lib/analysis/extractTriggers';

const DEFAULT_TEXT =
  'Best AI visibility tool vs competitor platforms, compare pricing and features, and show alternatives.';

export async function GET(request: NextRequest) {
  const active = await resolveActiveOrgSessionForRequest(request);
  if (!active) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const text = request.nextUrl.searchParams.get('text') ?? DEFAULT_TEXT;
  const triggers = extractQuestionTriggers(text);
  const clusters = clusterThemes(triggers);

  return NextResponse.json({
    inputText: text,
    triggers,
    clusters
  });
}
