import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { POST } from './route';

function postJson(body: unknown) {
  return new NextRequest('http://localhost/api/auth/active-org', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('POST /api/auth/active-org', () => {
  it('returns 400 when organizationId is missing', async () => {
    const res = await POST(postJson({}));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('organization_id_required');
  });

  it('returns 401 when not signed in', async () => {
    const res = await POST(postJson({ organizationId: 'org-1' }));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toBe('unauthorized');
  });
});
