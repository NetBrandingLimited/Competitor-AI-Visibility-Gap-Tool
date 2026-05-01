import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/debug/pipeline/[runId]', () => {
  it('returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/debug/pipeline/run-1');
    const res = await GET(req, { params: Promise.resolve({ runId: 'run-1' }) });
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });
});
