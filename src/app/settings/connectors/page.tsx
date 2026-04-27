import Link from 'next/link';

import ConnectorsStatusPanel from './ConnectorsStatusPanel';

export default function ConnectorsSettingsPage() {
  return (
    <section>
      <h1>Data connectors</h1>
      <p>
        Google Search Console and GA4 use rolling 28-day windows (UTC dates) into visibility signals when property
        identifiers and credentials are set. Inline JSON can live in <code>GSC_SERVICE_ACCOUNT_JSON</code> or{' '}
        <code>GA4_SERVICE_ACCOUNT_JSON</code>; otherwise set <code>GOOGLE_APPLICATION_CREDENTIALS</code>.
      </p>
      <p>Set property identifiers per organization below (these override global env values when provided).</p>
      <p>
        You can also save per-organization service-account JSON encrypted at rest (requires{' '}
        <code>APP_SECRETS_KEY</code> on the server).
      </p>
      <ConnectorsStatusPanel />
      <p style={{ marginTop: 24 }}>
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
