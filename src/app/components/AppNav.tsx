'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

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
const navGroups = [
  { id: 'workspace', items: navItems.slice(0, 4) },
  { id: 'settings', items: navItems.slice(4) }
];

function isActivePath(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const MOBILE_NAV_MQ = '(max-width: 640px)';

function groupHeading(id: string): string {
  if (id === 'workspace') return 'Workspace';
  if (id === 'settings') return 'Settings';
  return id;
}

export default function AppNav() {
  const pathname = usePathname();
  const currentSectionWideId = 'app-nav-current-section-wide';
  const currentSectionMobileId = 'app-nav-current-section-mobile';
  const menuPanelId = useId();
  const navRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    const closeIfWide = () => {
      if (!mq.matches) {
        setMenuOpen(false);
      }
    };
    closeIfWide();
    mq.addEventListener('change', closeIfWide);
    return () => mq.removeEventListener('change', closeIfWide);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const mq = window.matchMedia(MOBILE_NAV_MQ);
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const mq = window.matchMedia(MOBILE_NAV_MQ);

    const updateFades = () => {
      if (mq.matches) {
        setShowLeftFade(false);
        setShowRightFade(false);
        return;
      }
      const maxScrollLeft = nav.scrollWidth - nav.clientWidth;
      setShowLeftFade(nav.scrollLeft > 0);
      setShowRightFade(maxScrollLeft > 0 && nav.scrollLeft < maxScrollLeft - 1);
    };

    updateFades();
    nav.addEventListener('scroll', updateFades, { passive: true });
    const onLayout = () => updateFades();
    window.addEventListener('resize', onLayout);
    mq.addEventListener('change', onLayout);
    return () => {
      nav.removeEventListener('scroll', updateFades);
      window.removeEventListener('resize', onLayout);
      mq.removeEventListener('change', onLayout);
    };
  }, []);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => {
    setMenuOpen((o) => !o);
  }, []);

  const activeItem = navItems.find((item) => isActivePath(pathname, item));
  const activeSection = activeItem?.sectionLabel ?? 'Workspace';

  const workspaceZone = (
    <div className="app-nav-workspace-zone" aria-hidden="true">
      <span className="app-nav-workspace-icon">◈</span>
      <span className="app-nav-workspace-copy">
        <span className="app-nav-workspace-label">Workspace</span>
        <span className="app-nav-workspace-value">{activeSection}</span>
      </span>
    </div>
  );

  return (
    <div className={`app-nav-shell${menuOpen ? ' app-nav-shell--menu-open' : ''}`}>
      <div className="app-nav-mobile-bar">
        {workspaceZone}
        <button
          ref={menuButtonRef}
          type="button"
          className="app-nav-menu-button"
          aria-expanded={menuOpen}
          aria-controls={menuPanelId}
          onClick={toggleMenu}
        >
          <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          <span className="app-nav-menu-bars" aria-hidden="true">
            <span className="app-nav-menu-bar" />
            <span className="app-nav-menu-bar" />
            <span className="app-nav-menu-bar" />
          </span>
        </button>
      </div>

      {menuOpen ? (
        <button
          type="button"
          className="app-nav-backdrop"
          aria-label="Close navigation menu"
          tabIndex={-1}
          onClick={closeMenu}
        />
      ) : null}

      <nav
        id={menuPanelId}
        className="app-nav-mobile-panel"
        aria-label="Site menu"
        aria-describedby={currentSectionMobileId}
        hidden={!menuOpen}
      >
        <span id={currentSectionMobileId} className="sr-only">
          Current section: {activeSection}
        </span>
        {navGroups.map((group) => (
          <div key={group.id} className="app-nav-mobile-group">
            <div className="app-nav-mobile-group-label" role="presentation">
              {groupHeading(group.id)}
            </div>
            <ul className="app-nav-mobile-list">
              {group.items.map((item) => {
                const active = isActivePath(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={active ? 'app-nav-mobile-link app-nav-mobile-link-active' : 'app-nav-mobile-link'}
                      aria-current={active ? 'page' : undefined}
                      onClick={closeMenu}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <nav
        ref={navRef}
        aria-label="Primary"
        aria-describedby={currentSectionWideId}
        className="app-nav-track app-nav-track--wide"
      >
        <span id={currentSectionWideId} className="sr-only">
          Current section: {activeSection}
        </span>
        {workspaceZone}
        <span aria-hidden="true" className="app-nav-group-separator" />
        {navGroups.map((group, groupIdx) => (
          <div key={group.id} className="app-nav-group" role="group" aria-label={`${group.id} navigation`}>
            {group.items.map((item) => {
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
            {groupIdx < navGroups.length - 1 ? <span aria-hidden="true" className="app-nav-group-separator" /> : null}
          </div>
        ))}
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
