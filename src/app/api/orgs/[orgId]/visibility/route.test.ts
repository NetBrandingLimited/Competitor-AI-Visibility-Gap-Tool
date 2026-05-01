import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET, POST } from './route';

const ctx = { params: Promise.resolve({ orgId: 'org-1' }) };

describe('/api/orgs/[orgId]/visibility', () => {
  it('GET returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/visibility');
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });

  it('POST returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/visibility', { method: 'POST' });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });
});
