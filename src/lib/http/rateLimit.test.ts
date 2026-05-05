import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { rateLimitFixedWindow, resetFixedWindowStoreForTests } from './rateLimit';

describe('rateLimitFixedWindow', () => {
  beforeEach(() => {
    resetFixedWindowStoreForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetFixedWindowStoreForTests();
  });

  it('allows requests up to max within the window', () => {
    for (let i = 0; i < 5; i++) {
      expect(rateLimitFixedWindow('k1', 5, 60_000).ok).toBe(true);
    }
    const blocked = rateLimitFixedWindow('k1', 5, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it('resets after the window elapses', () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimitFixedWindow('k2', 3, 10_000).ok).toBe(true);
    }
    expect(rateLimitFixedWindow('k2', 3, 10_000).ok).toBe(false);

    vi.advanceTimersByTime(10_001);
    expect(rateLimitFixedWindow('k2', 3, 10_000).ok).toBe(true);
  });

  it('treats max <= 0 as unlimited', () => {
    for (let i = 0; i < 20; i++) {
      expect(rateLimitFixedWindow('k3', 0, 60_000).ok).toBe(true);
    }
  });
});
