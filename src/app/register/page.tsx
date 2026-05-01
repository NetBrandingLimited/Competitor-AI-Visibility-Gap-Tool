import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';

import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Register'
};

export default async function RegisterPage() {
  if (await resolveActiveOrgSessionForServerComponent()) {
    redirect('/settings/brand');
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <h1>Create your workspace</h1>
        <p className="login-lead">
          Each account gets its own organization, brand settings, pipeline runs, and reports.
        </p>
        <RegisterForm />
        <p className="login-footer">
          <Link href="/">Home</Link>
          {' · '}
          <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
