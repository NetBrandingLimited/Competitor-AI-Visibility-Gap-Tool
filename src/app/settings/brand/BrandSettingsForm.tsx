'use client';

import { usePathname, useRouter } from 'next/navigation';
import { startTransition, useEffect, useState, type FormEvent } from 'react';

import { redirectToLogin } from '@/lib/client/redirect-to-login';

type Org = {
  id: string;
  name: string;
  role: string;
  brandName: string | null;
  category: string | null;
  competitorA: string | null;
  competitorB: string | null;
  competitorC: string | null;
  weeklyDigestNotifyEmail?: string | null;
};

export default function BrandSettingsForm() {
  const pathname = usePathname();
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState('');
  const [brandName, setBrandName] = useState('');
  const [category, setCategory] = useState('');
  const [competitorA, setCompetitorA] = useState('');
  const [competitorB, setCompetitorB] = useState('');
  const [competitorC, setCompetitorC] = useState('');
  const [weeklyDigestNotifyEmail, setWeeklyDigestNotifyEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch('/api/auth/session', { credentials: 'include' });
      const data = (await response.json()) as { user: unknown; organizations: Org[] };
      if (cancelled) {
        return;
      }
      if (!data.user) {
        setLoading(false);
        redirectToLogin(pathname);
        return;
      }
      setOrgs(data.organizations ?? []);
      const first = data.organizations?.[0];
      if (first) {
        setOrgId(first.id);
        setBrandName(first.brandName ?? '');
        setCategory(first.category ?? '');
        setCompetitorA(first.competitorA ?? '');
        setCompetitorB(first.competitorB ?? '');
        setCompetitorC(first.competitorC ?? '');
        setWeeklyDigestNotifyEmail(first.weeklyDigestNotifyEmail ?? '');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  function applyOrgFields(selected: Org) {
    setBrandName(selected.brandName ?? '');
    setCategory(selected.category ?? '');
    setCompetitorA(selected.competitorA ?? '');
    setCompetitorB(selected.competitorB ?? '');
    setCompetitorC(selected.competitorC ?? '');
    setWeeklyDigestNotifyEmail(selected.weeklyDigestNotifyEmail ?? '');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgId) {
      setMessage('No organization available.');
      return;
    }
    setMessage('');
    setSaving(true);
    try {
      const response = await fetch(`/api/orgs/${orgId}/brand`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brandName,
          category,
          competitorA,
          competitorB,
          competitorC,
          weeklyDigestNotifyEmail: weeklyDigestNotifyEmail.trim() || null
        })
      });
      if (!response.ok) {
        const err = (await response.json().catch(() => ({}))) as { error?: string };
        setMessage(err.error ?? `Save failed (${response.status})`);
        return;
      }
      setMessage('Saved.');
      startTransition(() => {
        router.refresh();
      });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    redirectToLogin();
  }

  if (loading) {
    return <p>Loading…</p>;
  }

  if (orgs.length === 0) {
    return (
      <p>
        You are signed in but have no organization membership. Run <code>npm run db:seed</code>.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="brand-form">
      {orgs.length > 1 ? (
        <label className="field">
          <span>Organization</span>
          <select
            value={orgId}
            onChange={async (e) => {
              const nextId = e.target.value;
              setOrgId(nextId);
              const selected = orgs.find((o) => o.id === nextId);
              if (selected) {
                applyOrgFields(selected);
              }
              try {
                await fetch('/api/auth/active-org', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ organizationId: nextId })
                });
              } catch {
                // ignore network errors; form fields still updated
              }
            }}
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.role})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="field">
        <span>Brand name</span>
        <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Your brand" />
      </label>
      <label className="field">
        <span>Category</span>
        <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. SaaS, SEO" />
      </label>
      <label className="field">
        <span>Competitor A</span>
        <input value={competitorA} onChange={(e) => setCompetitorA(e.target.value)} />
      </label>
      <label className="field">
        <span>Competitor B</span>
        <input value={competitorB} onChange={(e) => setCompetitorB(e.target.value)} />
      </label>
      <label className="field">
        <span>Competitor C</span>
        <input value={competitorC} onChange={(e) => setCompetitorC(e.target.value)} />
      </label>

      <label className="field">
        <span>Weekly digest email (optional)</span>
        <input
          type="email"
          autoComplete="email"
          value={weeklyDigestNotifyEmail}
          onChange={(e) => setWeeklyDigestNotifyEmail(e.target.value)}
          placeholder="you@company.com"
        />
        <small style={{ display: 'block', marginTop: 6, opacity: 0.85, fontSize: '0.9em' }}>
          When set, each new weekly digest is emailed here if the server has Resend or SMTP env vars (see .env.example).
        </small>
      </label>

      <div className="actions">
        <button type="submit" className="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="secondary" onClick={logout}>
          Sign out
        </button>
      </div>
      {message ? <p className={message === 'Saved.' ? 'success' : 'error'}>{message}</p> : null}
    </form>
  );
}
