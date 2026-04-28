'use client';

import { useEffect, useRef, useState } from 'react';

type DebugConfigActionsProps = {
  className?: string;
};

export default function DebugConfigActions({ className }: DebugConfigActionsProps) {
  const [busyAction, setBusyAction] = useState<null | 'copy' | 'download'>(null);
  const [message, setMessage] = useState('');
  const [actionAt, setActionAt] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const requestControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestControllerRef.current?.abort();
    };
  }, []);

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
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    const response = await fetch('/api/debug/config', {
      credentials: 'include',
      signal: controller.signal
    });
    if (!response.ok) {
      throw new Error(`Config fetch failed (${response.status})`);
    }
    return response.json();
  }

  async function copyJson() {
    setBusyAction('copy');
    setMessage('');
    try {
      const payload = await fetchDebugConfig();
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      if (mountedRef.current) {
        setMessage('Copied debug config JSON.');
        setActionAt(new Date().toLocaleTimeString());
      }
    } catch (error) {
      if (mountedRef.current && !(error instanceof DOMException && error.name === 'AbortError')) {
        setMessage(error instanceof Error ? error.message : 'Copy failed.');
        setActionAt(null);
      }
    } finally {
      if (mountedRef.current) {
        setBusyAction(null);
      }
    }
  }

  async function downloadJson() {
    setBusyAction('download');
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
      if (mountedRef.current) {
        setMessage('Downloaded debug config JSON.');
        setActionAt(new Date().toLocaleTimeString());
      }
    } catch (error) {
      if (mountedRef.current && !(error instanceof DOMException && error.name === 'AbortError')) {
        setMessage(error instanceof Error ? error.message : 'Download failed.');
        setActionAt(null);
      }
    } finally {
      if (mountedRef.current) {
        setBusyAction(null);
      }
    }
  }

  const statusOk = message.startsWith('Copied') || message.startsWith('Downloaded');
  const paragraphClass = [className, 'mt-6'].filter(Boolean).join(' ');

  return (
    <p className={paragraphClass}>
      Runtime debug JSON:{' '}
      <a href="/api/debug/config" target="_blank" rel="noreferrer">
        /api/debug/config
      </a>
      <button
        type="button"
        onClick={copyJson}
        disabled={Boolean(busyAction)}
        className="btn-compact-inline ml-10"
      >
        {busyAction === 'copy' ? 'Copying...' : 'Copy JSON'}
      </button>
      <button
        type="button"
        onClick={downloadJson}
        disabled={Boolean(busyAction)}
        className="btn-compact-inline ml-8"
      >
        {busyAction === 'download' ? 'Downloading...' : 'Download JSON'}
      </button>
      {message ? (
        <span
          role="status"
          aria-live="polite"
          className={`debug-config-status ${statusOk ? 'text-debug-success' : 'text-debug-error'}`}
        >
          {message}
          {actionAt ? <span className="text-timestamp-muted ml-6">at {actionAt}</span> : null}
        </span>
      ) : null}
    </p>
  );
}
