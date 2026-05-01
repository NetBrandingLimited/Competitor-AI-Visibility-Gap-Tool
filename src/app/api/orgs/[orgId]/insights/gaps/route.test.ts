import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/orgs/[orgId]/insights/gaps', () => {
  it('returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/orgs/org-1/insights/gaps');
    const res = await GET(req, { params: Promise.resolve({ orgId: 'org-1' }) });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });
});
