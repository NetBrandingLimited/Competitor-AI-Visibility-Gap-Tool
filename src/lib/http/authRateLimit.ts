import type { NextRequest } from 'next/server';

import { rateLimitFixedWindow } from '@/lib/http/rateLimit';

/** Best-effort client IP (trust your reverse proxy to set X-Forwarded-For correctly). */
export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }
  const cf = request.headers.get('cf-connecting-ip')?.trim();
  if (cf) {
    return cf;
  }
  return 'unknown';
}

function rateLimitDisabled(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.AUTH_RATE_LIMIT_DISABLED === 'true' ||
    process.env.AUTH_RATE_LIMIT_DISABLED === '1'
  );
}

function isLoopbackIp(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('::ffff:127.0.0.1')
  );
}

function scaleMaxForLocalDev(ip: string, baseMax: number): number {
  if (isLoopbackIp(ip)) {
    return Math.max(baseMax * 25, 200);
  }
  return baseMax;
}

function consume(
  prefix: string,
  request: NextRequest,
  baseMax: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  if (rateLimitDisabled()) {
    return { ok: true };
  }

  const ip = getClientIp(request);
  const max = scaleMaxForLocalDev(ip, baseMax);
  const key = `${prefix}:${ip}`;
  const result = rateLimitFixedWindow(key, max, windowMs);

  if (result.ok) {
    return { ok: true };
  }

  const retryAfterSec = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  return { ok: false, retryAfterSec };
}

/** Brute-force protection for POST /api/auth/login */
export function consumeAuthLoginSlot(
  request: NextRequest
): { ok: true } | { ok: false; retryAfterSec: number } {
  const windowMs = parseInt(process.env.AUTH_LOGIN_RATE_WINDOW_MS ?? `${15 * 60 * 1000}`, 10);
  const baseMax = parseInt(process.env.AUTH_LOGIN_RATE_MAX ?? '25', 10);
  return consume('auth-login', request, baseMax, windowMs);
}

/** Abuse protection for POST /api/auth/register */
export function consumeAuthRegisterSlot(
  request: NextRequest
): { ok: true } | { ok: false; retryAfterSec: number } {
  const windowMs = parseInt(process.env.AUTH_REGISTER_RATE_WINDOW_MS ?? `${60 * 60 * 1000}`, 10);
  const baseMax = parseInt(process.env.AUTH_REGISTER_RATE_MAX ?? '8', 10);
  return consume('auth-register', request, baseMax, windowMs);
}
