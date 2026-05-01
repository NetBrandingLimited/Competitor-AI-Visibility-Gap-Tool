import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/auth/session', () => {
  it('returns empty payload when unauthenticated', async () => {
    const req = new NextRequest('http://localhost/api/auth/session');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: unknown; organizations: unknown };
    expect(body).toEqual({ user: null, organizations: [] });
  });
});
