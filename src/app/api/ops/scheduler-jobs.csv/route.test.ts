import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/ops/scheduler-jobs.csv', () => {
  it('returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/ops/scheduler-jobs.csv');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
