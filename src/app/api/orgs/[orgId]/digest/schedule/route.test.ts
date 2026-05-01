import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET, PATCH } from './route';

const ctx = { params: Promise.resolve({ orgId: 'org-1' }) };

describe('/api/orgs/[orgId]/digest/schedule', () => {
  it('GET returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/digest/schedule');
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });

  it('PATCH returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/digest/schedule', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });
});
