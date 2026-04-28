'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { redirectToLogin } from '@/lib/client/redirect-to-login';

type Org = {
  id: string;
  name: string;
  role: string;
};

type ConnectorSettings = {
  gscSiteUrl: string | null;
  ga4PropertyId: string | null;
  hasGscServiceAccountJson?: boolean;
  hasGa4ServiceAccountJson?: boolean;
};

type ConnectorHealth = {
  id: string;
  displayName: string;
  configured: boolean;
  detail?: string;
};

type ConnectorTestResult = {
  id: string;
  ok: boolean;
  detail: string;
};

type ConnectorTestCache = {
  testedAt: string | null;
  results: ConnectorTestResult[];
};

type LiveSignal = {
  source: string;
  metric: string;
  value: number;
  unit?: string;
  dimensions?: Record<string, string>;
  asOf: string;
};

type ConnectorSignalsCache = {
  fetchedAt: string | null;
  signals: LiveSignal[];
};

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

function freshnessLabel(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) {
    return null;
  }
  const age = Date.now() - ts;
  if (age <= 0) {
    return 'fresh';
  }
  if (age < STALE_AFTER_MS) {
    return 'fresh';
  }
  const hours = Math.floor(age / (60 * 60 * 1000));
  return `stale (${hours}h old)`;
}

export default function ConnectorsStatusPanel() {
  const pathname = usePathname();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState('');
  const [gscSiteUrl, setGscSiteUrl] = useState('');
  const [ga4PropertyId, setGa4PropertyId] = useState('');
  const [gscServiceAccountJson, setGscServiceAccountJson] = useState('');
  const [ga4ServiceAccountJson, setGa4ServiceAccountJson] = useState('');
  const [hasGscServiceAccountJson, setHasGscServiceAccountJson] = useState(false);
  const [hasGa4ServiceAccountJson, setHasGa4ServiceAccountJson] = useState(false);
  const [clearGscCredential, setClearGscCredential] = useState(false);
  const [clearGa4Credential, setClearGa4Credential] = useState(false);
  const [connectors, setConnectors] = useState<ConnectorHealth[]>([]);
  const [error, setError] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<ConnectorTestResult[]>([]);
  const [lastTestedAt, setLastTestedAt] = useState<string | null>(null);
  const [fetchingSignals, setFetchingSignals] = useState(false);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [signalsFetchedAt, setSignalsFetchedAt] = useState<string | null>(null);
  const [clearingSignals, setClearingSignals] = useState(false);

  const loadConnectors = useCallback(async (id: string) => {
    if (!id) {
      return;
    }
    setError('');
    setRefreshing(true);
    try {
      const response = await fetch(`/api/orgs/${id}/connectors`, { credentials: 'include' });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Request failed (${response.status})`);
        setConnectors([]);
        return;
      }
      const data = (await response.json()) as {
        connectors: ConnectorHealth[];
        settings?: ConnectorSettings;
        cachedTest?: ConnectorTestCache;
        cachedSignals?: ConnectorSignalsCache;
      };
      setGscSiteUrl(data.settings?.gscSiteUrl ?? '');
      setGa4PropertyId(data.settings?.ga4PropertyId ?? '');
      setHasGscServiceAccountJson(Boolean(data.settings?.hasGscServiceAccountJson));
      setHasGa4ServiceAccountJson(Boolean(data.settings?.hasGa4ServiceAccountJson));
      setGscServiceAccountJson('');
      setGa4ServiceAccountJson('');
      setClearGscCredential(false);
      setClearGa4Credential(false);
      setConnectors(data.connectors ?? []);
      setLastTestedAt(data.cachedTest?.testedAt ?? null);
      setTestResults(data.cachedTest?.results ?? []);
      setLiveSignals(data.cachedSignals?.signals ?? []);
      setSignalsFetchedAt(data.cachedSignals?.fetchedAt ?? null);
    } finally {
      setRefreshing(false);
    }
  }, []);

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
        await loadConnectors(first.id);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadConnectors, pathname]);

  async function onOrgChange(nextId: string) {
    setOrgId(nextId);
    setSaveMessage('');
    setTestResults([]);
    await loadConnectors(nextId);
    try {
      await fetch('/api/auth/active-org', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ organizationId: nextId })
      });
    } catch {
      // ignore
    }
  }

  async function testCredentials(opts?: { preserveSaveMessage?: boolean }): Promise<boolean> {
    if (!orgId) {
      return false;
    }
    setError('');
    if (!opts?.preserveSaveMessage) {
      setSaveMessage('');
    }
    setTesting(true);
    try {
      const response = await fetch(`/api/orgs/${orgId}/connectors`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Test failed (${response.status})`);
        setTestResults([]);
        return false;
      }
      const body = (await response.json()) as { tests?: ConnectorTestResult[] };
      const results = body.tests ?? [];
      setTestResults(results);
      setLastTestedAt(new Date().toISOString());
      return results.every((r) => r.ok);
    } finally {
      setTesting(false);
    }
  }

  async function saveSettings() {
    if (!orgId) {
      return;
    }
    setSaveMessage('');
    setError('');
    setSaving(true);
    try {
      const response = await fetch(`/api/orgs/${orgId}/connectors`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          gscSiteUrl,
          ga4PropertyId,
          gscServiceAccountJson: clearGscCredential ? null : gscServiceAccountJson || undefined,
          ga4ServiceAccountJson: clearGa4Credential ? null : ga4ServiceAccountJson || undefined
        })
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Save failed (${response.status})`);
        return;
      }
      setSaveMessage('Saved.');
      setTestResults([]);
      setLiveSignals([]);
      setSignalsFetchedAt(null);
      await loadConnectors(orgId);
      const testPassed = await testCredentials({ preserveSaveMessage: true });
      if (testPassed) {
        await fetchLiveSignals();
      }
    } finally {
      setSaving(false);
    }
  }

  async function fetchLiveSignals() {
    if (!orgId) {
      return;
    }
    setError('');
    setFetchingSignals(true);
    try {
      const response = await fetch(`/api/orgs/${orgId}/connectors/signals`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Signal fetch failed (${response.status})`);
        setLiveSignals([]);
        setSignalsFetchedAt(null);
        return;
      }
      const body = (await response.json()) as {
        fetchedAt?: string;
        signals?: LiveSignal[];
      };
      setSignalsFetchedAt(body.fetchedAt ?? new Date().toISOString());
      setLiveSignals(body.signals ?? []);
    } finally {
      setFetchingSignals(false);
    }
  }

  async function clearSignalCache() {
    if (!orgId) {
      return;
    }
    setError('');
    setClearingSignals(true);
    try {
      const response = await fetch(`/api/orgs/${orgId}/connectors/signals`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? `Clear signal cache failed (${response.status})`);
        return;
      }
      setSignalsFetchedAt(null);
      setLiveSignals([]);
      setSaveMessage('Signal cache cleared.');
    } finally {
      setClearingSignals(false);
    }
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
    <div className="brand-form">
      {orgs.length > 1 ? (
        <label className="field">
          <span>Organization</span>
          <select value={orgId} onChange={(e) => void onOrgChange(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.role})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <p className="mt-8-mb-0">
        Connector credentials are read from server environment variables (see <code>.env.example</code>). This page
        only shows whether each adapter is configured, not secrets.
      </p>

      <label className="field mt-16">
        <span>GSC site URL (org-specific override)</span>
        <input
          value={gscSiteUrl}
          onChange={(e) => setGscSiteUrl(e.target.value)}
          placeholder="sc-domain:example.com or https://www.example.com/"
        />
      </label>
      <label className="field">
        <span>GA4 property ID (org-specific override)</span>
        <input value={ga4PropertyId} onChange={(e) => setGa4PropertyId(e.target.value)} placeholder="123456789" />
      </label>
      <label className="field">
        <span>GSC service-account JSON (encrypted at rest; leave blank to keep current)</span>
        <textarea
          value={gscServiceAccountJson}
          onChange={(e) => setGscServiceAccountJson(e.target.value)}
          rows={4}
          placeholder='{"type":"service_account", ...}'
        />
      </label>
      <p className="connector-hint-pull">
        Current stored GSC credential: {hasGscServiceAccountJson ? 'present' : 'none'}
      </p>
      <label className="field mt-0">
        <span>
          <input
            type="checkbox"
            checked={clearGscCredential}
            onChange={(e) => setClearGscCredential(e.target.checked)}
            className="mr-8"
          />
          Clear stored GSC credential on save
        </span>
      </label>
      <label className="field">
        <span>GA4 service-account JSON (encrypted at rest; leave blank to keep current)</span>
        <textarea
          value={ga4ServiceAccountJson}
          onChange={(e) => setGa4ServiceAccountJson(e.target.value)}
          rows={4}
          placeholder='{"type":"service_account", ...}'
        />
      </label>
      <p className="connector-hint-pull">
        Current stored GA4 credential: {hasGa4ServiceAccountJson ? 'present' : 'none'}
      </p>
      <label className="field mt-0">
        <span>
          <input
            type="checkbox"
            checked={clearGa4Credential}
            onChange={(e) => setClearGa4Credential(e.target.checked)}
            className="mr-8"
          />
          Clear stored GA4 credential on save
        </span>
      </label>

      <div className="connector-actions mt-16">
        <button
          type="button"
          className="primary"
          disabled={saving || !orgId}
          aria-busy={saving}
          onClick={() => void saveSettings()}
        >
          {saving ? 'Saving…' : 'Save connector settings'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={refreshing || !orgId}
          aria-busy={refreshing}
          onClick={() => loadConnectors(orgId)}
        >
          {refreshing ? 'Refreshing…' : 'Refresh status'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={testing || !orgId}
          aria-busy={testing}
          onClick={() => void testCredentials()}
        >
          {testing ? 'Testing…' : 'Test credentials'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={fetchingSignals || !orgId}
          aria-busy={fetchingSignals}
          onClick={() => void fetchLiveSignals()}
        >
          {fetchingSignals ? 'Fetching signals…' : 'Fetch live signals'}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={clearingSignals || !orgId}
          aria-busy={clearingSignals}
          onClick={() => void clearSignalCache()}
        >
          {clearingSignals ? 'Clearing cache…' : 'Clear signal cache'}
        </button>
      </div>

      {error ? (
        <p className="error" role="status" aria-live="polite">
          {error}
        </p>
      ) : null}
      {saveMessage ? (
        <p className="success" role="status" aria-live="polite">
          {saveMessage}
        </p>
      ) : null}
      {lastTestedAt ? (
        <p className="connector-hint-meta">
          Last credentials test: {new Date(lastTestedAt).toLocaleString()}
          {freshnessLabel(lastTestedAt) ? ` · ${freshnessLabel(lastTestedAt)}` : ''}
        </p>
      ) : null}
      {testResults.length > 0 ? (
        <div className="mt-12">
          {testResults.map((t) => (
            <p key={t.id} className={`${t.ok ? 'success' : 'error'} my-6-0`}>
              {t.ok ? 'PASS' : 'FAIL'} {t.id}: {t.detail}
            </p>
          ))}
        </div>
      ) : null}
      {signalsFetchedAt ? (
        <p className="connector-hint-signals">
          Live signals fetched: {new Date(signalsFetchedAt).toLocaleString()} ({liveSignals.length} metrics)
        </p>
      ) : null}
      {signalsFetchedAt && liveSignals.length === 0 ? (
        <p className="text-hint-empty">
          No live metrics returned. Check property IDs, credentials, and API permissions.
        </p>
      ) : null}
      {liveSignals.length > 0 ? (
        <div className="mt-10">
          {liveSignals.map((s) => (
            <p key={`${s.source}-${s.metric}-${s.asOf}`} className="text-metric-line">
              <strong>{s.source}</strong> · <code>{s.metric}</code> = {s.value}
              {s.unit ? ` ${s.unit}` : ''} · asOf {s.asOf}
            </p>
          ))}
        </div>
      ) : null}

      <div className="connector-list">
        {connectors.map((c) => (
          <article key={c.id} className="connector-card">
            <h2>{c.displayName}</h2>
            <p className="connector-meta">
              <span className={c.configured ? 'badge badge-ok' : 'badge badge-warn'}>
                {c.configured ? 'Configured' : 'Not configured'}
              </span>
              <code className="connector-id">{c.id}</code>
            </p>
            {c.detail ? <p className="connector-detail">{c.detail}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
