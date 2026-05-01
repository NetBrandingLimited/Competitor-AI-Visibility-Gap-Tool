'use client';

import EllipsisStatusText from '@/app/components/EllipsisStatusText';
import {
  GSC_SUMMARY_UI_STATUS_MAX,
  tableCellEllipsisParts,
  UI_INLINE_ID_DISPLAY_MAX
} from '@/lib/ingestion/gscDiagnostics';
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
      const data = (await response.json()) as { gscDiagnosticsSummary?: string | null };
      let message = 'Unified pipeline run completed.';
      const gsc = typeof data.gscDiagnosticsSummary === 'string' ? data.gscDiagnosticsSummary.trim() : '';
      if (gsc.length > 0) {
        message += ` GSC: ${tableCellEllipsisParts(gsc, GSC_SUMMARY_UI_STATUS_MAX).display}`;
      }
      setPipeline({ running: false, message });
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
      const data = (await response.json()) as {
        digest?: { id: string; summary?: { pipelineGscDiagnosticsSummary?: string | null } };
      };
      let message = 'Weekly digest generated.';
      if (data.digest?.id) {
        message += ` Id: ${tableCellEllipsisParts(data.digest.id, UI_INLINE_ID_DISPLAY_MAX).display}.`;
      }
      const digestGsc = data.digest?.summary?.pipelineGscDiagnosticsSummary?.trim();
      if (digestGsc) {
        message += ` GSC: ${tableCellEllipsisParts(digestGsc, GSC_SUMMARY_UI_STATUS_MAX).display}`;
      }
      setDigest({ running: false, message });
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Digest generation failed.';
      setDigest({ running: false, message });
    }
  }

  return (
    <div className="stack-y-actions">
      <p className="text-muted-note mb-8">
        Pipeline uses your saved <strong>brand &amp; competitors</strong> for the default search query. With{' '}
        <Link href="/settings/connectors">Search Console</Link> configured, documents are live query rows; otherwise mock
        text is used. Set brand fields under <Link href="/settings/brand">Brand settings</Link>.
      </p>
      <button
        type="button"
        onClick={runPipeline}
        disabled={pipeline.running}
        aria-busy={pipeline.running}
        className="mr-8"
      >
        {pipeline.running ? 'Running pipeline?' : 'Run unified pipeline'}
      </button>
      <button type="button" onClick={runTrends} disabled={trends.running} aria-busy={trends.running}>
        {trends.running ? 'Running snapshot job?' : 'Run trend snapshot'}
      </button>
      <button
        type="button"
        onClick={generateDigest}
        disabled={digest.running}
        aria-busy={digest.running}
        className="ml-8"
      >
        {digest.running ? 'Generating digest?' : 'Generate weekly digest'}
      </button>
      {pipeline.message ? (
        <p className="mt-8" role="status" aria-live="polite">
          <EllipsisStatusText text={pipeline.message} />
        </p>
      ) : null}
      {trends.message ? (
        <p className="mt-4" role="status" aria-live="polite">
          <EllipsisStatusText text={trends.message} />
        </p>
      ) : null}
      {digest.message ? (
        <p className="mt-4" role="status" aria-live="polite">
          <EllipsisStatusText text={digest.message} />
        </p>
      ) : null}
    </div>
  );
}
