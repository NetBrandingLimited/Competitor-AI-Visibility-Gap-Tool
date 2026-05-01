import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { PATCH } from './route';

describe('PATCH /api/orgs/[orgId]/brand', () => {
  it('returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/brand', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: '{}'
    });
    const res = await PATCH(req, { params: Promise.resolve({ orgId: 'org-1' }) });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });
});
