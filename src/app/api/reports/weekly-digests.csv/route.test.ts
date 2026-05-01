import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/reports/weekly-digests.csv', () => {
  it('returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/reports/weekly-digests.csv');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
