import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatGscDateUtc, rollingGscWindowDays } from './gsc-date-range';

describe('formatGscDateUtc', () => {
  it('returns YYYY-MM-DD in UTC from ISO timestamps', () => {
    expect(formatGscDateUtc(new Date('2026-07-15T18:30:00.000Z'))).toBe('2026-07-15');
  });
});

describe('rollingGscWindowDays', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns an inclusive window ending today UTC (28 calendar days)', () => {
    const w = rollingGscWindowDays(28);
    expect(w.endDate).toBe('2026-07-15');
    expect(w.asOf).toBe('2026-07-15');
    expect(w.startDate).toBe('2026-06-18');
  });

  it('returns the same start and end for a one-day window', () => {
    const w = rollingGscWindowDays(1);
    expect(w.startDate).toBe('2026-07-15');
    expect(w.endDate).toBe('2026-07-15');
    expect(w.asOf).toBe('2026-07-15');
  });
});
