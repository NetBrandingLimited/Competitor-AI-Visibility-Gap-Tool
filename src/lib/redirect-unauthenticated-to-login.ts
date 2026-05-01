import { redirect } from 'next/navigation';

import { safeLoginNextQuery } from '@/lib/post-login-path';

/** For server components: send unauthenticated users to sign-in with a safe `?next=` return path. */
export function redirectUnauthenticatedToLogin(returnPath: string): never {
  const safe = safeLoginNextQuery(returnPath);
  return redirect(safe ? `/login?next=${encodeURIComponent(safe)}` : '/login');
}
