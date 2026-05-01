import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET, POST } from './route';

describe('/api/debug/trends/run', () => {
  it('GET returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/debug/trends/run');
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });

  it('POST returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/debug/trends/run', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });
});
