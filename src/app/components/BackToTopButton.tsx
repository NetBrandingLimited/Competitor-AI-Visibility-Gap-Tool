'use client';

import { useEffect, useState } from 'react';

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 320);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
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
