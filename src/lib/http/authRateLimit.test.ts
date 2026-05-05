import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetFixedWindowStoreForTests } from '@/lib/http/rateLimit';

import { consumeAuthLoginSlot, consumeAuthRegisterSlot, getClientIp } from './authRateLimit';

describe('getClientIp', () => {
  it('uses the first x-forwarded-for address', () => {
    const req = new NextRequest('http://example.com/api', {
      headers: { 'x-forwarded-for': '198.51.100.2, 10.0.0.1' }
    });
    expect(getClientIp(req)).toBe('198.51.100.2');
  });

  it('falls back to x-real-ip then cf-connecting-ip', () => {
    const a = new NextRequest('http://example.com/api', {
      headers: { 'x-real-ip': ' 203.0.113.1 ' }
    });
    expect(getClientIp(a)).toBe('203.0.113.1');

    const b = new NextRequest('http://example.com/api', {
      headers: { 'cf-connecting-ip': '198.18.0.1' }
    });
    expect(getClientIp(b)).toBe('198.18.0.1');
  });

  it('returns unknown when no proxy headers are present', () => {
    const req = new NextRequest('http://example.com/api');
    expect(getClientIp(req)).toBe('unknown');
  });
});

describe('consumeAuthLoginSlot (rate limit enforced)', () => {
  beforeEach(() => {
    resetFixedWindowStoreForTests();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AUTH_RATE_LIMIT_DISABLED', '');
    vi.stubEnv('AUTH_LOGIN_RATE_MAX', '5');
    vi.stubEnv('AUTH_LOGIN_RATE_WINDOW_MS', '60000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetFixedWindowStoreForTests();
  });

  it('blocks after AUTH_LOGIN_RATE_MAX requests for the same forwarded IP', () => {
    const mk = () =>
      new NextRequest('http://localhost/api/auth/login', {
        headers: { 'x-forwarded-for': '198.51.100.50' }
      });
    for (let i = 0; i < 5; i++) {
      expect(consumeAuthLoginSlot(mk()).ok).toBe(true);
    }
    const out = consumeAuthLoginSlot(mk());
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.retryAfterSec).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('consumeAuthRegisterSlot (rate limit enforced)', () => {
  beforeEach(() => {
    resetFixedWindowStoreForTests();
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('AUTH_RATE_LIMIT_DISABLED', '');
    vi.stubEnv('AUTH_REGISTER_RATE_MAX', '3');
    vi.stubEnv('AUTH_REGISTER_RATE_WINDOW_MS', '3600000');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetFixedWindowStoreForTests();
  });

  it('blocks after AUTH_REGISTER_RATE_MAX requests for the same forwarded IP', () => {
    const mk = () =>
      new NextRequest('http://localhost/api/auth/register', {
        headers: { 'x-forwarded-for': '198.51.100.51' }
      });
    for (let i = 0; i < 3; i++) {
      expect(consumeAuthRegisterSlot(mk()).ok).toBe(true);
    }
    expect(consumeAuthRegisterSlot(mk()).ok).toBe(false);
  });
});
