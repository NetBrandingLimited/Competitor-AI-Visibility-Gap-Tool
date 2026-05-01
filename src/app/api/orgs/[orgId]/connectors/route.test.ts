import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET, PATCH, POST } from './route';

const ctx = { params: Promise.resolve({ orgId: 'org-1' }) };

describe('/api/orgs/[orgId]/connectors', () => {
  it('GET returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/connectors');
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });

  it('PATCH returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/connectors', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });

  it('POST returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/connectors', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });
});
