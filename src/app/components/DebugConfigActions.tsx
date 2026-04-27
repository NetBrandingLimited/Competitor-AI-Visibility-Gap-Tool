'use client';

import { useEffect, useState } from 'react';

type DebugConfigActionsProps = {
  className?: string;
};

export default function DebugConfigActions({ className }: DebugConfigActionsProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [actionAt, setActionAt] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => {
      setMessage('');
      setActionAt(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function fetchDebugConfig(): Promise<unknown> {
    const response = await fetch('/api/debug/config', {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(`Config fetch failed (${response.status})`);
    }
    return response.json();
  }

  async function copyJson() {
    setBusy(true);
    setMessage('');
    try {
      const payload = await fetchDebugConfig();
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setMessage('Copied debug config JSON.');
      setActionAt(new Date().toLocaleTimeString());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Copy failed.');
      setActionAt(null);
    } finally {
      setBusy(false);
    }
  }

  async function downloadJson() {
    setBusy(true);
    setMessage('');
    try {
      const payload = await fetchDebugConfig();
      const text = JSON.stringify(payload, null, 2);
      const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `debug-config-${new Date().toISOString().replaceAll(':', '-')}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage('Downloaded debug config JSON.');
      setActionAt(new Date().toLocaleTimeString());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Download failed.');
      setActionAt(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <p style={{ marginTop: 6 }} className={className}>
      Runtime debug JSON:{' '}
      <a href="/api/debug/config" target="_blank" rel="noreferrer">
        /api/debug/config
      </a>
      <button type="button" onClick={copyJson} disabled={busy} style={{ marginLeft: 10, padding: '4px 10px' }}>
        {busy ? 'Copying...' : 'Copy JSON'}
      </button>
      <button type="button" onClick={downloadJson} disabled={busy} style={{ marginLeft: 8, padding: '4px 10px' }}>
        Download JSON
      </button>
      {message ? (
        <span
          style={{
            marginLeft: 8,
            color: message.startsWith('Copied') || message.startsWith('Downloaded') ? '#166534' : '#b91c1c'
          }}
        >
          {message}
          {actionAt ? <span style={{ marginLeft: 6, color: '#6b7280' }}>at {actionAt}</span> : null}
        </span>
      ) : null}
    </p>
  );
}
