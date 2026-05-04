import { afterEach, describe, expect, it, vi } from 'vitest';

import { sessionCookieBase } from './session';

describe('sessionCookieBase', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sets secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(sessionCookieBase().secure).toBe(true);
  });

  it('does not set secure in non-production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(sessionCookieBase().secure).toBe(false);
  });

  it('returns httpOnly lax path defaults', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const base = sessionCookieBase();
    expect(base.httpOnly).toBe(true);
    expect(base.sameSite).toBe('lax');
    expect(base.path).toBe('/');
  });
});
