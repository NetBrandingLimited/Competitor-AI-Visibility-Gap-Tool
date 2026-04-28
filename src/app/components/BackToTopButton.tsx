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
        className="back-to-top-button"
      >
        ↑ Top
      </button>
      {showShortcutToast ? (
        <div role="status" aria-live="polite" className="back-to-top-toast">
          Jumped to top
        </div>
      ) : null}
    </>
  );
}
