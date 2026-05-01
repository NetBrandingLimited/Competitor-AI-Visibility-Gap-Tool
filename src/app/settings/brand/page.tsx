import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import BrandSettingsForm from './BrandSettingsForm';
import { resolveActiveOrgSessionForServerComponent } from '@/lib/active-org';

export const metadata: Metadata = {
  title: 'Brand settings'
};

export default async function BrandSettingsPage() {
  if (!(await resolveActiveOrgSessionForServerComponent())) {
    redirect('/login');
  }

  return (
    <section>
      <h1>Brand &amp; competitors</h1>
      <p>These values are stored on your organization and used for visibility tracking workflows.</p>
      <BrandSettingsForm />
      <p className="mt-24">
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
