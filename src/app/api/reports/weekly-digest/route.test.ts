import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { POST } from './route';

describe('POST /api/reports/weekly-digest', () => {
  it('returns 401 when not signed in', async () => {
    const req = new NextRequest('http://localhost/api/reports/weekly-digest', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
  });
});
