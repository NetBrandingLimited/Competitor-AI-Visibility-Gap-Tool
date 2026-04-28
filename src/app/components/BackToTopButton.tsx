'use client';

import { useCallback, useEffect, useState } from 'react';

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);
  const [showShortcutToast, setShowShortcutToast] = useState(false);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [reduceMotion]);

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

  useEffect(() => {
    if (!showShortcutToast) return;
    const timer = window.setTimeout(() => setShowShortcutToast(false), 1200);
    return () => window.clearTimeout(timer);
  }, [showShortcutToast]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.altKey && event.shiftKey && event.key.toLowerCase() === 't')) {
        return;
      }
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl instanceof HTMLElement && activeEl.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      scrollToTop();
      setShowShortcutToast(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scrollToTop]);

  if (!visible || compactViewport) return null;

  return (
    <>
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to top"
        title="Back to top (Alt+Shift+T)"
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
      {showShortcutToast ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 58,
            zIndex: 41,
            background: '#111827',
            color: '#ffffff',
            borderRadius: 8,
            padding: '6px 10px',
            fontSize: 12,
            boxShadow: '0 10px 22px rgba(0, 0, 0, 0.2)'
          }}
        >
          Jumped to top
        </div>
      ) : null}
    </>
  );
}
