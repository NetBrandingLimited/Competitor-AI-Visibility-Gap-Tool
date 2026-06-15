function stripEnvQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const cleaned = stripEnvQuotes(value ?? '');
    if (cleaned.length > 0) {
      return cleaned;
    }
  }
  return '';
}

/** Resolve Postgres URL from Vercel manual vars or Supabase integration vars. */
export function resolveDatabaseUrl(): string {
  return firstNonEmpty(
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL
  );
}

export function isPostgresDatabaseUrl(url: string): boolean {
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

/** Safe hint for misconfigured env (scheme only, no credentials). */
export function databaseUrlSchemeHint(url: string): string | null {
  if (!url) {
    return null;
  }
  const match = url.match(/^([a-z][a-z0-9+.-]*):/i);
  return match?.[1] ?? 'unknown';
}

export function postgresEnvPresence() {
  return {
    DATABASE_URL: Boolean(stripEnvQuotes(process.env.DATABASE_URL ?? '')),
    DIRECT_URL: Boolean(stripEnvQuotes(process.env.DIRECT_URL ?? '')),
    POSTGRES_PRISMA_URL: Boolean(stripEnvQuotes(process.env.POSTGRES_PRISMA_URL ?? '')),
    POSTGRES_URL: Boolean(stripEnvQuotes(process.env.POSTGRES_URL ?? '')),
    POSTGRES_URL_NON_POOLING: Boolean(stripEnvQuotes(process.env.POSTGRES_URL_NON_POOLING ?? ''))
  };
}
