'use client';

import { refreshVisibilityScoreAction } from './visibility-actions';

type Props = {
  organizationId: string;
};

/**
 * Client boundary so the server action is bound on the client; avoids RSC / flight
 * issues when the card is rendered from a Server Component.
 */
export default function RecalculateVisibilityForm({ organizationId }: Props) {
  return (
    <form action={refreshVisibilityScoreAction} className="mt-14">
      <input type="hidden" name="organizationId" value={organizationId} />
      <button type="submit" className="primary">
        Recalculate score
      </button>
    </form>
  );
}
