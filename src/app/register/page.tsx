import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { safeLoginNextQuery, safePostLoginPath } from '@/lib/post-login-path';

import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Register'
};

export default async function RegisterPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await resolveActiveOrgSessionForServerComponent()) {
    redirect(safePostLoginPath(next));
  }

  const loginNext = typeof next === 'string' ? safeLoginNextQuery(next) : null;
  const loginHref = loginNext ? `/login?next=${encodeURIComponent(loginNext)}` : '/login';

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Create your workspace</h1>
        <p className="login-lead">
          Each account gets its own organization, brand settings, pipeline runs, and reports.
        </p>
        <RegisterForm nextPath={next} />
        <p className="login-footer">
          <Link href="/">Home</Link>
          {' · '}
          <Link href={loginHref}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
