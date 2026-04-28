'use client';

import { useState } from 'react';

type Props = {
  markdown: string;
};

export default function CopyDigestSummary({ markdown }: Props) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy() {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(markdown);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <p className="mt-12">
      <button type="button" onClick={() => void copy()} disabled={busy} aria-busy={busy}>
        {busy ? 'Copying…' : done ? 'Copied' : 'Copy summary as Markdown'}
      </button>
    </p>
  );
}
