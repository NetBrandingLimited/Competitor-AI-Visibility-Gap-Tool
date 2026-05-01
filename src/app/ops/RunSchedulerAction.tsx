'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import EllipsisStatusText from '@/app/components/EllipsisStatusText';
import { tableCellEllipsisParts, UI_INLINE_ID_DISPLAY_MAX } from '@/lib/ingestion/gscDiagnostics';

type Props = {
  canEdit: boolean;
};

export default function RunSchedulerAction({ canEdit }: Props) {
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
      const digestLabel = data.digest?.id
        ? tableCellEllipsisParts(data.digest.id, UI_INLINE_ID_DISPLAY_MAX).display
        : 'generated';
      const pipelineRunLabel = data.pipelineRun?.id
        ? tableCellEllipsisParts(data.pipelineRun.id, UI_INLINE_ID_DISPLAY_MAX).display
        : null;
      const parts = [
        `Scheduler job completed (${data.mode ?? (digestOnly ? 'digest-only' : 'full')}).`,
        data.digestGenerated ? `Digest: ${digestLabel}.` : 'Digest: skipped (not due).',
        pipelineRunLabel
          ? `Pipeline run: ${pipelineRunLabel}.`
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

  if (!canEdit) {
    return (
      <p className="text-muted-note stack-y-actions">
        Only editors and admins can run the scheduler from this page.
      </p>
    );
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
        {running ? 'Running scheduled job…' : 'Run scheduled job now'}
      </button>
      {message ? (
        <p className="mt-8" role="status" aria-live="polite">
          <EllipsisStatusText text={message} />
        </p>
      ) : null}
    </div>
  );
}
