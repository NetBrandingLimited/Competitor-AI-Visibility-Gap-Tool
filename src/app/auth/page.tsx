import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { safeLoginNextQuery } from '@/lib/post-login-path';

export const metadata: Metadata = {
  title: 'Auth'
};

export default async function AuthRedirectPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next: nextRaw } = await searchParams;
  const nextQ = typeof nextRaw === 'string' ? safeLoginNextQuery(nextRaw) : null;
  redirect(nextQ ? `/login?next=${encodeURIComponent(nextQ)}` : '/login');
}
