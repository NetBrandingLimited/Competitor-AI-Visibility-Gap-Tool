import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { safeLoginNextQuery, safePostLoginPath } from '@/lib/post-login-path';

import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in'
};

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await resolveActiveOrgSessionForServerComponent()) {
    redirect(safePostLoginPath(next));
  }

  const registerNext = typeof next === 'string' ? safeLoginNextQuery(next) : null;
  const registerHref = registerNext ? `/register?next=${encodeURIComponent(registerNext)}` : '/register';

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Sign in</h1>
        <p className="login-lead">Competitor AI Visibility Gap Tool</p>
        <LoginForm nextPath={next} />
        <p className="login-footer">
          <Link href="/">Home</Link>
          {' · '}
          <Link href={registerHref}>Create account</Link>
        </p>
      </div>
    </div>
  );
}
