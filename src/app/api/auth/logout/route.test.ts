import { describe, expect, it } from 'vitest';

import { POST } from './route';

describe('POST /api/auth/logout', () => {
  it('returns ok and clears session cookies', async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean };
    expect(body.ok).toBe(true);
    const setCookies = res.cookies.getAll();
    expect(setCookies.length).toBeGreaterThanOrEqual(3);
    for (const c of setCookies) {
      expect(c.maxAge).toBe(0);
    }
  });
});
