'use client';

import { useState } from 'react';

type Props = {
  text: string;
  label?: string;
  /** Stable accessible name when visible label cycles (e.g. Copy id → Copied). */
  ariaLabel?: string;
  className?: string;
};

export default function CopyTextButton({ text, label = 'Copy', ariaLabel, className }: Props) {
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
  const name =
    busy ? 'Copying to clipboard' : done ? 'Copied to clipboard' : ariaLabel ?? copyLabel;
  return (
    <button
      type="button"
      onClick={() => void copy()}
      disabled={busy}
      aria-busy={busy}
      aria-label={name}
      className={className}
    >
      {copyLabel}
    </button>
  );
}
