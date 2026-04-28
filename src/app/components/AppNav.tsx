 'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type NavItem = {
  label: string;
  href: string;
  exact?: boolean;
  sectionLabel?: string;
};

const navItems: NavItem[] = [
  { label: 'Home', href: '/', exact: true, sectionLabel: 'Home' },
  { label: 'Dashboard', href: '/dashboard', sectionLabel: 'Dashboard' },
  { label: 'Reports', href: '/reports', sectionLabel: 'Reports' },
  { label: 'Ops', href: '/ops', sectionLabel: 'Operations' },
  { label: 'Brand', href: '/settings/brand', sectionLabel: 'Brand settings' },
  { label: 'Connectors', href: '/settings/connectors', sectionLabel: 'Connectors' }
];

function isActivePath(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AppNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement | null>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [compactViewport, setCompactViewport] = useState(false);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const mediaCompact = window.matchMedia('(max-width: 820px)');

    const updateFades = () => {
      const maxScrollLeft = nav.scrollWidth - nav.clientWidth;
      setShowLeftFade(nav.scrollLeft > 0);
      setShowRightFade(maxScrollLeft > 0 && nav.scrollLeft < maxScrollLeft - 1);
    };
    const onMediaChange = () => setCompactViewport(mediaCompact.matches);

    updateFades();
    onMediaChange();
    nav.addEventListener('scroll', updateFades, { passive: true });
    mediaCompact.addEventListener('change', onMediaChange);
    window.addEventListener('resize', updateFades);
    return () => {
      nav.removeEventListener('scroll', updateFades);
      mediaCompact.removeEventListener('change', onMediaChange);
      window.removeEventListener('resize', updateFades);
    };
  }, []);

  const activeItem = navItems.find((item) => isActivePath(pathname, item));
  const activeSection = activeItem?.sectionLabel ?? 'Workspace';

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, marginTop: -8, marginBottom: 8 }}>
      <nav
        ref={navRef}
        aria-label="Primary"
        style={{
          position: 'relative',
          display: 'flex',
          flexWrap: 'nowrap',
          gap: '10px 18px',
          alignItems: 'center',
          overflowX: 'auto',
          overflowY: 'hidden',
          WebkitOverflowScrolling: 'touch',
          paddingTop: 8,
          paddingBottom: 14,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(2px)',
          borderBottom: '1px solid #e5e7eb',
          fontSize: 14
        }}
      >
        <span className="sr-only">Current section: {activeSection}</span>
        {navItems.map((item) => {
          const active = isActivePath(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? 'app-nav-link app-nav-link-active' : 'app-nav-link'}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
        {!compactViewport ? (
          <span
            aria-hidden="true"
            style={{
              marginLeft: 'auto',
              padding: '4px 8px',
              borderRadius: 999,
              fontSize: 12,
              color: '#334155',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              whiteSpace: 'nowrap'
            }}
          >
            {activeSection}
          </span>
        ) : null}
      </nav>
      {showLeftFade ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 16,
            pointerEvents: 'none',
            background: 'linear-gradient(to right, rgba(255,255,255,0.98), rgba(255,255,255,0))'
          }}
        />
      ) : null}
      {showRightFade ? (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 16,
            pointerEvents: 'none',
            background: 'linear-gradient(to left, rgba(255,255,255,0.98), rgba(255,255,255,0))'
          }}
        />
      ) : null}
    </div>
  );
}
