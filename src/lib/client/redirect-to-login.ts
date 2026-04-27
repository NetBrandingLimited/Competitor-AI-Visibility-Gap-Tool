'use client';

/**
 * Full navigation avoids `router.replace` racing App Router init ("Router action
 * dispatched before initialization") when called from async `useEffect` after fetch.
 */
export function redirectToLogin(nextPath?: string | null) {
  if (typeof window === 'undefined') {
    return;
  }
  const safe =
    nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : null;
  const q = safe ? `?next=${encodeURIComponent(safe)}` : '';
  window.location.assign(`/login${q}`);
}
