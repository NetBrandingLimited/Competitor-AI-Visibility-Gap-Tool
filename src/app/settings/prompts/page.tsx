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
        Define the prompts and surfaces that will form each <strong>measurement unit</strong> when AI-answer
        monitoring is connected. This does not run models yet—it only stores your workspace library.
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
