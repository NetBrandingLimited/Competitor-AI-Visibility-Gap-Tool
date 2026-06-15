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
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? '';
  const directUrl = process.env.DIRECT_URL?.trim() ?? '';
  const config = {
    databaseUrlSet: databaseUrl.length > 0,
    directUrlSet: directUrl.length > 0,
    databaseUrlIsPostgres: databaseUrl.startsWith('postgresql://')
  };

  if (!config.databaseUrlSet) {
    return NextResponse.json(
      {
        ok: false,
        service: 'ready',
        checks: { database: 'error', ...config },
        hint: 'Set DATABASE_URL in Vercel (Supabase → Connect → Prisma → Transaction pooler, port 6543).',
        ts: new Date().toISOString()
      },
      { status: 503 }
    );
  }

  if (!config.databaseUrlIsPostgres) {
    return NextResponse.json(
      {
        ok: false,
        service: 'ready',
        checks: { database: 'error', ...config },
        hint: 'DATABASE_URL must be a postgresql:// URI (not SQLite file:). Use the Supabase pooler string.',
        ts: new Date().toISOString()
      },
      { status: 503 }
    );
  }

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
      checks: { database: 'ok', ...config },
      latencyMs: Date.now() - started,
      ts: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        service: 'ready',
        checks: { database: 'error', ...config },
        hint:
          'DATABASE_URL is set but the DB did not answer. In Supabase → Connect → Prisma, use Transaction pooler (6543) for DATABASE_URL, run prisma/supabase-init.sql, then redeploy.',
        ts: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
