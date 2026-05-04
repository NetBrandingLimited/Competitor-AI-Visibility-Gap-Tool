import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatAge } from './age';

describe('formatAge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns no data for null', () => {
    expect(formatAge(null)).toBe('no data');
  });

  it('returns just now for invalid timestamps', () => {
    expect(formatAge('not-a-date')).toBe('just now');
  });

  it('returns just now for future timestamps', () => {
    expect(formatAge('2030-01-01T00:00:00.000Z')).toBe('just now');
  });

  it('returns just now when under one minute', () => {
    expect(formatAge('2026-06-01T11:59:30.000Z')).toBe('just now');
  });

  it('returns minutes ago below one hour', () => {
    expect(formatAge('2026-06-01T11:30:00.000Z')).toBe('30m ago');
  });

  it('returns hours ago below one day', () => {
    expect(formatAge('2026-06-01T06:00:00.000Z')).toBe('6h ago');
  });

  it('returns days ago for older timestamps', () => {
    expect(formatAge('2026-05-25T12:00:00.000Z')).toBe('7d ago');
  });
});
