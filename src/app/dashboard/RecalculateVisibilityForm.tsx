'use client';

import { useState } from 'react';

import { GSC_SUMMARY_UI_STATUS_MAX, tableCellEllipsisParts } from '@/lib/ingestion/gscDiagnostics';

import { refreshVisibilityScoreAction } from './visibility-actions';

type Props = {
  organizationId: string;
};

/**
 * Client boundary so the server action is bound on the client; avoids RSC / flight
 * issues when the card is rendered from a Server Component.
 */
export default function RecalculateVisibilityForm({ organizationId }: Props) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<null | { ok: boolean; text: string }>(null);

  async function submit(formData: FormData) {
    setFeedback(null);
    setPending(true);
    try {
      await refreshVisibilityScoreAction(formData);
      setFeedback({ ok: true, text: 'Visibility score recalculated.' });
    } catch (err) {
      setFeedback({
        ok: false,
        text: err instanceof Error ? err.message : 'Recalculation failed.'
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <form action={submit} className="mt-14">
      <input type="hidden" name="organizationId" value={organizationId} />
      <button type="submit" className="primary" disabled={pending} aria-busy={pending}>
        {pending ? 'Recalculating…' : 'Recalculate score'}
      </button>
      {feedback ? (
        <p
          className={`mt-8 ${feedback.ok ? 'text-debug-success' : 'text-debug-error'}`}
          role="status"
          aria-live="polite"
        >
          {(() => {
            const m = tableCellEllipsisParts(feedback.text, GSC_SUMMARY_UI_STATUS_MAX);
            return <span title={m.title}>{m.display}</span>;
          })()}
        </p>
      ) : null}
    </form>
  );
}
