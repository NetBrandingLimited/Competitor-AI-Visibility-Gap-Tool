import Link from 'next/link';

import BrandSettingsForm from './BrandSettingsForm';

export default function BrandSettingsPage() {
  return (
    <section>
      <h1>Brand &amp; competitors</h1>
      <p>These values are stored on your organization and used for visibility tracking workflows.</p>
      <BrandSettingsForm />
      <p style={{ marginTop: 24 }}>
        <Link href="/settings/connectors">Data connectors</Link>
        {' · '}
        <Link href="/dashboard">Dashboard</Link>
        {' · '}
        <Link href="/reports">Reports</Link>
        {' · '}
        <Link href="/ops">Ops</Link>
        {' · '}
        <Link href="/login">Switch account</Link>
      </p>
    </section>
  );
}
