'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type ActionState = {
  running: boolean;
  message: string;
};

export default function RunActions() {
  const router = useRouter();
  const [pipeline, setPipeline] = useState<ActionState>({ running: false, message: '' });
  const [trends, setTrends] = useState<ActionState>({ running: false, message: '' });
  const [digest, setDigest] = useState<ActionState>({ running: false, message: '' });

  async function runPipeline() {
    setPipeline({ running: true, message: '' });
    try {
      const response = await fetch('/api/debug/pipeline/run?limit=2', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Run failed (${response.status})`);
      }
      setPipeline({ running: false, message: 'Unified pipeline run completed.' });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Pipeline run failed.';
      setPipeline({ running: false, message });
    }
  }

  async function runTrends() {
    setTrends({ running: true, message: '' });
    try {
      const response = await fetch('/api/debug/trends/run', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Snapshot job failed (${response.status})`);
      }
      setTrends({ running: false, message: 'Trend snapshot job completed.' });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Trend job failed.';
      setTrends({ running: false, message });
    }
  }

  async function generateDigest() {
    setDigest({ running: true, message: '' });
    try {
      const response = await fetch('/api/reports/weekly-digest', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Digest failed (${response.status})`);
      }
      setDigest({ running: false, message: 'Weekly digest generated.' });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Digest generation failed.';
      setDigest({ running: false, message });
    }
  }

  return (
    <div className="stack-y-actions">
      <p className="text-muted-note mb-8">
        Pipeline uses your saved <strong>brand &amp; competitors</strong> for the default search query and mock
        document text. Set them under <Link href="/settings/brand">Brand settings</Link> first.
      </p>
      <button
        type="button"
        onClick={runPipeline}
        disabled={pipeline.running}
        aria-busy={pipeline.running}
        className="mr-8"
      >
        {pipeline.running ? 'Running pipeline...' : 'Run unified pipeline'}
      </button>
      <button type="button" onClick={runTrends} disabled={trends.running} aria-busy={trends.running}>
        {trends.running ? 'Running snapshot job...' : 'Run trend snapshot'}
      </button>
      <button
        type="button"
        onClick={generateDigest}
        disabled={digest.running}
        aria-busy={digest.running}
        className="ml-8"
      >
        {digest.running ? 'Generating digest...' : 'Generate weekly digest'}
      </button>
      {pipeline.message ? (
        <p className="mt-8" role="status" aria-live="polite">
          {pipeline.message}
        </p>
      ) : null}
      {trends.message ? (
        <p className="mt-4" role="status" aria-live="polite">
          {trends.message}
        </p>
      ) : null}
      {digest.message ? (
        <p className="mt-4" role="status" aria-live="polite">
          {digest.message}
        </p>
      ) : null}
    </div>
  );
}

