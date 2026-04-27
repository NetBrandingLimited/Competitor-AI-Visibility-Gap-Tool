'use client';

import { useState } from 'react';

export default function CopyDebugConfigButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

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
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Copy failed.';
      setMessage(text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span style={{ marginLeft: 10 }}>
      <button type="button" onClick={copyJson} disabled={busy} style={{ padding: '4px 10px' }}>
        {busy ? 'Copying...' : 'Copy JSON'}
      </button>
      {message ? (
        <span style={{ marginLeft: 8, color: message.startsWith('Copied') ? '#166534' : '#b91c1c' }}>{message}</span>
      ) : null}
    </span>
  );
}
