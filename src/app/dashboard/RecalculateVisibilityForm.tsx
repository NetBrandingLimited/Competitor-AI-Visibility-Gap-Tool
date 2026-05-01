'use client';

import { useState } from 'react';

import EllipsisStatusText from '@/app/components/EllipsisStatusText';

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

  // Omit method="post": with a function action, React 19 + Next may SSR method as null and set "post" on the client, which mismatches hydration if method is explicit.
  return (
    <form action={submit} className="mt-14">
      <input type="hidden" name="organizationId" value={organizationId} />
      <button
        type="submit"
        className="primary"
        disabled={pending}
        aria-busy={pending}
        title="Recompute the v1 visibility score from the latest pipeline, trends, and connector signals."
      >
        {pending ? 'Recalculating…' : 'Recalculate score'}
      </button>
      {feedback ? (
        <p
          className={`mt-8 ${feedback.ok ? 'text-debug-success' : 'text-debug-error'}`}
          role="status"
          aria-live="polite"
        >
          <EllipsisStatusText text={feedback.text} />
        </p>
      ) : null}
    </form>
  );
}
