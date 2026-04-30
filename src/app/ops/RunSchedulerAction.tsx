'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { GSC_SUMMARY_UI_STATUS_MAX, tableCellEllipsisParts } from '@/lib/ingestion/gscDiagnostics';

export default function RunSchedulerAction() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [forceDigest, setForceDigest] = useState(false);
  const [digestOnly, setDigestOnly] = useState(false);

  async function runNow() {
    setRunning(true);
    setMessage('');
    try {
      const params = new URLSearchParams({ limit: '2' });
      if (forceDigest) {
        params.set('forceDigest', '1');
      }
      if (digestOnly) {
        params.set('digestOnly', '1');
      }
      const response = await fetch(`/api/debug/scheduler/run?${params.toString()}`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(`Scheduler run failed (${response.status})`);
      }
      const data = (await response.json()) as {
        mode?: 'full' | 'digest-only';
        digestGenerated?: boolean;
        pipelineRefreshedForDigest?: boolean;
        pipelineRun?: { id: string } | null;
        digest?: { id: string } | null;
      };
      const parts = [
        `Scheduler job completed (${data.mode ?? (digestOnly ? 'digest-only' : 'full')}).`,
        data.digestGenerated ? `Digest: ${data.digest?.id ?? 'generated'}.` : 'Digest: skipped (not due).',
        data.pipelineRun?.id
          ? `Pipeline run: ${data.pipelineRun.id}.`
          : data.pipelineRefreshedForDigest
            ? 'Pipeline refreshed for digest.'
            : 'Pipeline: not executed.'
      ];
      setMessage(parts.join(' '));
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Scheduler run failed.';
      setMessage(text);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="stack-y-actions">
      <label className="block mb-8">
        <input
          type="checkbox"
          name="forceDigest"
          checked={forceDigest}
          onChange={(e) => setForceDigest(e.target.checked)}
          disabled={running}
          className="mr-8"
        />
        Force weekly digest generation in this run
      </label>
      <label className="block mb-8">
        <input
          type="checkbox"
          name="digestOnly"
          checked={digestOnly}
          onChange={(e) => setDigestOnly(e.target.checked)}
          disabled={running}
          className="mr-8"
        />
        Run digest-only mode (skip full pipeline/trends unless digest refresh requires it)
      </label>
      <button type="button" onClick={runNow} disabled={running} aria-busy={running}>
        {running ? 'Running scheduled job?' : 'Run scheduled job now'}
      </button>
      {message ? (
        <p className="mt-8" role="status" aria-live="polite">
          {(() => {
            const m = tableCellEllipsisParts(message, GSC_SUMMARY_UI_STATUS_MAX);
            return <span title={m.title}>{m.display}</span>;
          })()}
        </p>
      ) : null}
    </div>
  );
}
