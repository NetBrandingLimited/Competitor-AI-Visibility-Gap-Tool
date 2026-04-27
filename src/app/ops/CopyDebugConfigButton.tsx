'use client';

import { useEffect, useState } from 'react';

export default function CopyDebugConfigButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [copiedAt, setCopiedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => {
      setMessage('');
      setCopiedAt(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [message]);

  async function copyJson() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/debug/config', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Config fetch failed (${response.status})`);
      }
      const payload = (await response.json()) as unknown;
      const text = JSON.stringify(payload, null, 2);
      await navigator.clipboard.writeText(text);
      setMessage('Copied debug config JSON.');
      setCopiedAt(new Date().toLocaleTimeString());
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Copy failed.';
      setMessage(text);
      setCopiedAt(null);
    } finally {
      setBusy(false);
    }
  }

  async function downloadJson() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/debug/config', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Config fetch failed (${response.status})`);
      }
      const payload = (await response.json()) as unknown;
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
      setCopiedAt(new Date().toLocaleTimeString());
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Download failed.';
      setMessage(text);
      setCopiedAt(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ marginLeft: 10 }}>
      <button type="button" onClick={copyJson} disabled={busy} style={{ padding: '4px 10px' }}>
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
          {copiedAt ? <span style={{ marginLeft: 6, color: '#6b7280' }}>at {copiedAt}</span> : null}
        </span>
      ) : null}
    </span>
  );
}
