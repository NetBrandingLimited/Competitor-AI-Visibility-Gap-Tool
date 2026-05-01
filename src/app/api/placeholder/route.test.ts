import { describe, expect, it } from 'vitest';

import { GET } from './route';

describe('GET /api/placeholder', () => {
  it('returns ok payload', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; message?: string };
    expect(body.ok).toBe(true);
    expect(body.message).toBe('placeholder');
  });
});
