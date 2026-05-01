/** Default route after successful sign-in when `next` is missing or unsafe. */
export const DEFAULT_POST_LOGIN_PATH = '/settings/brand';

/**
 * Open-redirect safe: only same-origin relative paths (`/foo`, not `//evil` or `https:`).
 */
export function safePostLoginPath(next: string | undefined | null): string {
  const t = typeof next === 'string' ? next.trim() : '';
  if (t.startsWith('/') && !t.startsWith('//')) {
    return t;
  }
  return DEFAULT_POST_LOGIN_PATH;
}

/**
 * Value for `?next=` on `/login` — `null` means omit the query param (invalid or empty).
 */
export function safeLoginNextQuery(next: string | undefined | null): string | null {
  const t = typeof next === 'string' ? next.trim() : '';
  if (t.startsWith('/') && !t.startsWith('//')) {
    return t;
  }
  return null;
}
