'use client';

import { useState } from 'react';

type Props = {
  markdown: string;
};

export default function CopyDigestSummary({ markdown }: Props) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      setDone(false);
    }
  }

  return (
    <p className="mt-12">
      <button type="button" onClick={copy}>
        {done ? 'Copied' : 'Copy summary as Markdown'}
      </button>
    </p>
  );
}
