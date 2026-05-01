import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { DELETE, POST } from './route';

const ctx = { params: Promise.resolve({ orgId: 'org-1' }) };

describe('/api/orgs/[orgId]/connectors/signals', () => {
  it('POST returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/connectors/signals', {
      method: 'POST'
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });

  it('DELETE returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/connectors/signals', {
      method: 'DELETE'
    });
    const res = await DELETE(req, ctx);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });
});
