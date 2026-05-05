import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

/** Max wait for the DB probe (load balancers often use ~1–5s readiness budgets). */
export const HEALTH_READY_DB_TIMEOUT_MS = Math.min(
  8000,
  Math.max(1000, Number(process.env.HEALTH_READY_DB_TIMEOUT_MS) || 5000)
);

/**
 * Readiness: process is up **and** the database answers. Use for orchestrator readiness probes.
 * Liveness stays on `GET /api/health` (no DB).
 */
export async function GET() {
  const started = Date.now();
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('database_timeout')), HEALTH_READY_DB_TIMEOUT_MS);
      })
    ]);
    return NextResponse.json({
      ok: true,
      service: 'ready',
      checks: { database: 'ok' },
      latencyMs: Date.now() - started,
      ts: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: 'ready',
        checks: { database: 'error' },
        ts: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
