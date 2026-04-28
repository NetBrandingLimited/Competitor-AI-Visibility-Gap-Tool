'use client';

import { useEffect, useState } from 'react';

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 320);
    };
    const mediaReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mediaCompact = window.matchMedia('(max-width: 640px)');
    const onMediaChange = () => {
      setReduceMotion(mediaReduce.matches);
      setCompactViewport(mediaCompact.matches);
    };

    onMediaChange();
    onScroll();

    mediaReduce.addEventListener('change', onMediaChange);
    mediaCompact.addEventListener('change', onMediaChange);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      mediaReduce.removeEventListener('change', onMediaChange);
      mediaCompact.removeEventListener('change', onMediaChange);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  if (!visible || compactViewport) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })}
      aria-label="Back to top"
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 40,
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        color: '#1f2937',
        borderRadius: 999,
        padding: '8px 12px',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: '0 8px 20px rgba(15, 23, 42, 0.12)',
        cursor: 'pointer'
      }}
    >
      ↑ Top
    </button>
  );
}
