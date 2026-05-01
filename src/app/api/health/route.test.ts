import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/health', () => {
  it('returns 200 with ok payload', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string; ts: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe('health');
    expect(() => new Date(body.ts)).not.toThrow();
    expect(Number.isNaN(new Date(body.ts).getTime())).toBe(false);
  });
});
