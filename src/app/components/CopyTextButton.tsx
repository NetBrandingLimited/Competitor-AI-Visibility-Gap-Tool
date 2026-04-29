'use client';

import { useState } from 'react';

type Props = {
  text: string;
  label?: string;
  className?: string;
};

export default function CopyTextButton({ text, label = 'Copy', className }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function copy() {
    setBusy(true);
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      setDone(false);
    } finally {
      setBusy(false);
    }
  }

  const copyLabel = busy ? 'Copying…' : done ? 'Copied' : label;
  return (
    <button type="button" onClick={() => void copy()} disabled={busy} aria-busy={busy} className={className}>
      {copyLabel}
    </button>
  );
}
