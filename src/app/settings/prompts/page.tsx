import Link from 'next/link';
import type { Metadata } from 'next';

import TrackedPromptsForm from './TrackedPromptsForm';
import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';
import { redirectUnauthenticatedToLogin } from '@/lib/redirect-unauthenticated-to-login';

export const metadata: Metadata = {
  title: 'AI prompt library'
};

export default async function TrackedPromptsSettingsPage() {
  if (!(await resolveActiveOrgSessionForServerComponent())) {
    redirectUnauthenticatedToLogin('/settings/prompts');
  }

  return (
    <section>
      <h1>AI prompt library</h1>
      <p>
        Define prompts and target surfaces for each <strong>measurement unit</strong>. Save your library here; when{' '}
        <code>OPENAI_API_KEY</code> / <code>ANTHROPIC_API_KEY</code> are set on the server, use{' '}
        <strong>Collect answers now</strong> to store real API model outputs (separate from Search Console pipeline
        documents).
      </p>
      <TrackedPromptsForm />
      <p className="mt-24">
        <Link href="/settings/brand">Brand &amp; competitors</Link>
        {' · '}
        <Link href="/settings/connectors">Data connectors</Link>
        {' · '}
        <Link href="/dashboard">Dashboard</Link>
      </p>
    </section>
  );
}
