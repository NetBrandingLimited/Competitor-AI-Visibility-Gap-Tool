import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn()
  }
}));

import { prisma } from '@/lib/prisma';

import { GET } from './route';

describe('GET /api/health/ready', () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 200 when the database probe succeeds', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ '?column?': 1 }] as never);
    const res = await GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      service: string;
      checks: { database: string };
      latencyMs: number;
      ts: string;
    };
    expect(body.ok).toBe(true);
    expect(body.service).toBe('ready');
    expect(body.checks.database).toBe('ok');
    expect(body.latencyMs).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(new Date(body.ts).getTime())).toBe(false);
  });

  it('returns 503 when the database probe fails', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('connection refused'));
    const res = await GET();
    expect(res.status).toBe(503);
    const body = (await res.json()) as { ok: boolean; checks: { database: string } };
    expect(body.ok).toBe(false);
    expect(body.checks.database).toBe('error');
  });

  it('returns 503 when the database probe times out', async () => {
    vi.useFakeTimers();
    vi.mocked(prisma.$queryRaw).mockImplementation(
      () => new Promise(() => {
        /* never resolves */
      }) as never
    );
    const pending = GET();
    await vi.advanceTimersByTimeAsync(10_000);
    const res = await pending;
    expect(res.status).toBe(503);
    const body = (await res.json()) as { ok: boolean; checks: { database: string } };
    expect(body.ok).toBe(false);
    expect(body.checks.database).toBe('error');
  });
});
