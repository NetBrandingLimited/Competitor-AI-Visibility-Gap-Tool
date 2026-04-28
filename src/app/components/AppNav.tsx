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
  const currentSectionId = 'app-nav-current-section';
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
    <div className="app-nav-shell">
      <nav
        ref={navRef}
        aria-label="Primary"
        aria-describedby={currentSectionId}
        className="app-nav-track"
      >
        <span id={currentSectionId} className="sr-only">
          Current section: {activeSection}
        </span>
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
        {!compactViewport ? <span aria-hidden="true" className="app-nav-section-chip">{activeSection}</span> : null}
      </nav>
      {showLeftFade ? (
        <span aria-hidden="true" className="app-nav-fade app-nav-fade-left" />
      ) : null}
      {showRightFade ? (
        <span aria-hidden="true" className="app-nav-fade app-nav-fade-right" />
      ) : null}
    </div>
  );
}
