import { Auth } from 'googleapis';

export type ServiceAccountInlineEnv = 'GSC_SERVICE_ACCOUNT_JSON' | 'GA4_SERVICE_ACCOUNT_JSON';

/** Try inline JSON in this order, then `GOOGLE_APPLICATION_CREDENTIALS` / ADC. */
const DEFAULT_INLINE_ORDER: ServiceAccountInlineEnv[] = ['GSC_SERVICE_ACCOUNT_JSON', 'GA4_SERVICE_ACCOUNT_JSON'];

export function createGoogleAuthFromEnv(
  scopes: string[],
  inlineEnvPriority: readonly ServiceAccountInlineEnv[] = DEFAULT_INLINE_ORDER
): Auth.GoogleAuth {
  for (const envName of inlineEnvPriority) {
    const inline = process.env[envName]?.trim();
    if (inline) {
      try {
        return new Auth.GoogleAuth({
          credentials: JSON.parse(inline) as Record<string, unknown>,
          scopes
        });
      } catch {
        // Try next env name or fall through to file/ADC.
      }
    }
  }
  return new Auth.GoogleAuth({ scopes });
}

export function createGoogleAuth(
  scopes: string[],
  inlineJsonCandidates: readonly (string | null | undefined)[],
  inlineEnvPriority: readonly ServiceAccountInlineEnv[] = DEFAULT_INLINE_ORDER
): Auth.GoogleAuth {
  for (const inline of inlineJsonCandidates) {
    const trimmed = inline?.trim();
    if (!trimmed) {
      continue;
    }
    try {
      return new Auth.GoogleAuth({
        credentials: JSON.parse(trimmed) as Record<string, unknown>,
        scopes
      });
    } catch {
      // Ignore malformed candidate and continue to env fallback.
    }
  }
  return createGoogleAuthFromEnv(scopes, inlineEnvPriority);
}
