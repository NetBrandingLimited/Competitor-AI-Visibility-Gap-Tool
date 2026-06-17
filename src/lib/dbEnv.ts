const POSTGRES_URI_RE = /(postgres(?:ql)?):\/\/\S+/i;

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

/** Strip BOM, smart quotes, and extract a postgres URI from noisy paste. */
export function normalizeDatabaseUrl(value: string): string {
  let cleaned = stripEnvQuotes(value);
  cleaned = cleaned.replace(/^\uFEFF/, '');
  cleaned = cleaned.replace(/^[\u201c\u201d\u2018\u2019]+/, '').replace(/[\u201c\u201d\u2018\u2019]+$/, '');

  const embedded = cleaned.match(POSTGRES_URI_RE);
  if (embedded) {
    return embedded[0];
  }

  return cleaned.trim();
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const cleaned = normalizeDatabaseUrl(value ?? '');
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
  return /^postgres(?:ql)?:\/\//i.test(url);
}

/** Safe hint for misconfigured env (scheme only, no credentials). */
export function databaseUrlSchemeHint(url: string): string | null {
  if (!url) {
    return null;
  }
  const match = url.match(/^([a-z][a-z0-9+.-]*):/i);
  return match?.[1] ?? 'unknown';
}

/** Non-secret diagnostics when env paste is malformed. */
export function databaseUrlDiagnostics(url: string) {
  const raw = process.env.DATABASE_URL ?? '';
  return {
    resolvedLength: url.length,
    rawLength: raw.length,
    rawHasColon: raw.includes(':'),
    rawIncludesPostgresql: /postgres(?:ql)?:\/\//i.test(raw)
  };
}

export function postgresEnvPresence() {
  return {
    DATABASE_URL: Boolean(normalizeDatabaseUrl(process.env.DATABASE_URL ?? '')),
    DIRECT_URL: Boolean(normalizeDatabaseUrl(process.env.DIRECT_URL ?? '')),
    POSTGRES_PRISMA_URL: Boolean(normalizeDatabaseUrl(process.env.POSTGRES_PRISMA_URL ?? '')),
    POSTGRES_URL: Boolean(normalizeDatabaseUrl(process.env.POSTGRES_URL ?? '')),
    POSTGRES_URL_NON_POOLING: Boolean(normalizeDatabaseUrl(process.env.POSTGRES_URL_NON_POOLING ?? ''))
  };
}
