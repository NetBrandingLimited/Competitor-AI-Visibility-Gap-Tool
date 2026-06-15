import { NextResponse } from 'next/server';

import { postgresEnvPresence, resolveDatabaseUrl } from '@/lib/dbEnv';
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
  const databaseUrl = resolveDatabaseUrl();
  const env = postgresEnvPresence();
  const config = {
    databaseUrlSet: databaseUrl.length > 0,
    directUrlSet: Boolean(process.env.DIRECT_URL?.trim()),
    databaseUrlIsPostgres: databaseUrl.startsWith('postgresql://'),
    env
  };

  if (!config.databaseUrlSet) {
    return NextResponse.json(
      {
        ok: false,
        service: 'ready',
        checks: { database: 'error', ...config },
        hint:
          'No Postgres URL in this deployment. In Vercel → Settings → Environment Variables → Production, add DATABASE_URL (pooler :6543) and DIRECT_URL (pooler :5432), then Redeploy. Or connect the Supabase Vercel integration (sets POSTGRES_PRISMA_URL).',
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
        hint: 'Database URL must start with postgresql:// (Supabase pooler URI, not SQLite file:).',
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
          'Postgres URL is set but the DB did not answer. Use aws-1-ap-southeast-2 pooler host, confirm password, ensure tables exist (prisma/supabase-init.sql), then redeploy.',
        ts: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
