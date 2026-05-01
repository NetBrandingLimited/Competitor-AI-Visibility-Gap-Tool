import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET, POST } from './route';

function withCronEnv<T>(fn: () => Promise<T>): Promise<T> {
  const prev = process.env.CRON_SECRET;
  return (async () => {
    try {
      return await fn();
    } finally {
      if (prev === undefined) {
        delete process.env.CRON_SECRET;
      } else {
        process.env.CRON_SECRET = prev;
      }
    }
  })();
}

describe('/api/cron/weekly-scheduler', () => {
  it('GET returns 401 when CRON_SECRET is not set', async () => {
    await withCronEnv(async () => {
      delete process.env.CRON_SECRET;
      const req = new NextRequest('http://localhost/api/cron/weekly-scheduler');
      const res = await GET(req);
      expect(res.status).toBe(401);
      expect(((await res.json()) as { error?: string }).error).toBe('unauthorized');
    });
  });

  it('GET returns 401 when Bearer token does not match', async () => {
    await withCronEnv(async () => {
      process.env.CRON_SECRET = 'cron-test-secret';
      const req = new NextRequest('http://localhost/api/cron/weekly-scheduler', {
        headers: { authorization: 'Bearer wrong' }
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  it('GET returns 401 when query secret does not match', async () => {
    await withCronEnv(async () => {
      process.env.CRON_SECRET = 'cron-test-secret';
      const req = new NextRequest('http://localhost/api/cron/weekly-scheduler?secret=nope');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  it('POST requires authorization', async () => {
    await withCronEnv(async () => {
      process.env.CRON_SECRET = 'cron-test-secret';
      const req = new NextRequest('http://localhost/api/cron/weekly-scheduler', { method: 'POST' });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });
  });
});
