import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';

import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Sign in'
};

function safeNextPath(next: string | undefined): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/settings/brand';
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  if (await resolveActiveOrgSessionForServerComponent()) {
    redirect(safeNextPath(next));
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Sign in</h1>
        <p className="login-lead">Competitor AI Visibility Gap Tool</p>
        <LoginForm nextPath={next} />
        <p className="login-footer">
          <Link href="/">Home</Link>
          {' · '}
          <Link href="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
