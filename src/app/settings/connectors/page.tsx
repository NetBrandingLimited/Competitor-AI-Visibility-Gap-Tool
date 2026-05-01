import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import ConnectorsStatusPanel from './ConnectorsStatusPanel';
import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';

export const metadata: Metadata = {
  title: 'Connectors'
};

export default async function ConnectorsSettingsPage() {
  if (!(await resolveActiveOrgSessionForServerComponent())) {
    redirect('/login');
  }

  return (
    <section>
      <h1>Data connectors</h1>
      <p>
        Google Search Console and GA4 use rolling 28-day windows (UTC dates) into visibility signals when property
        identifiers and credentials are set. Inline JSON can live in <code>GSC_SERVICE_ACCOUNT_JSON</code> or{' '}
        <code>GA4_SERVICE_ACCOUNT_JSON</code>; otherwise set <code>GOOGLE_APPLICATION_CREDENTIALS</code>. To inspect
        how live GSC rows are filtered for the pipeline, use{' '}
        <Link href="/debug/ingestion">Debug ingestion</Link> (editor role).
      </p>
      <p>Set property identifiers per organization below (these override global env values when provided).</p>
      <p>
        You can also save per-organization service-account JSON encrypted at rest (requires{' '}
        <code>APP_SECRETS_KEY</code> on the server).
      </p>
      <ConnectorsStatusPanel />
      <p className="mt-24">
        <Link href="/settings/brand">Brand settings</Link>
        {' · '}
        <Link href="/dashboard">Dashboard</Link>
        {' · '}
        <Link href="/reports">Reports</Link>
        {' · '}
        <Link href="/login">Switch account</Link>
      </p>
    </section>
  );
}
