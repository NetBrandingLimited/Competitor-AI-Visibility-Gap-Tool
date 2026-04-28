'use client';

import { useState } from 'react';

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

  async function submit(formData: FormData) {
    setPending(true);
    try {
      await refreshVisibilityScoreAction(formData);
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
    </form>
  );
}
