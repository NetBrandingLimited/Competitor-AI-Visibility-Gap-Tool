/** Resolve Postgres URL from Vercel manual vars or Supabase integration vars. */
export function resolveDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    ''
  );
}

export function postgresEnvPresence() {
  return {
    DATABASE_URL: Boolean(process.env.DATABASE_URL?.trim()),
    DIRECT_URL: Boolean(process.env.DIRECT_URL?.trim()),
    POSTGRES_PRISMA_URL: Boolean(process.env.POSTGRES_PRISMA_URL?.trim()),
    POSTGRES_URL: Boolean(process.env.POSTGRES_URL?.trim()),
    POSTGRES_URL_NON_POOLING: Boolean(process.env.POSTGRES_URL_NON_POOLING?.trim())
  };
}
