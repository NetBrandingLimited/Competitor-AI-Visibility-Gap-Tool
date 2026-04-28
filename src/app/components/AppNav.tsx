 'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

const itemStyle: CSSProperties = { color: '#1d4ed8', textDecoration: 'none' };
const activeItemStyle: CSSProperties = {
  ...itemStyle,
  fontWeight: 600,
  textDecoration: 'underline'
};

type NavItem = {
  label: string;
  href: string;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { label: 'Home', href: '/', exact: true },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Reports', href: '/reports' },
  { label: 'Ops', href: '/ops' },
  { label: 'Brand', href: '/settings/brand' },
  { label: 'Connectors', href: '/settings/connectors' }
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

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const updateFades = () => {
      const maxScrollLeft = nav.scrollWidth - nav.clientWidth;
      setShowLeftFade(nav.scrollLeft > 0);
      setShowRightFade(maxScrollLeft > 0 && nav.scrollLeft < maxScrollLeft - 1);
    };

    updateFades();
    nav.addEventListener('scroll', updateFades, { passive: true });
    window.addEventListener('resize', updateFades);
    return () => {
      nav.removeEventListener('scroll', updateFades);
      window.removeEventListener('resize', updateFades);
    };
  }, []);

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
        {navItems.map((item) => {
          const active = isActivePath(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              style={active ? activeItemStyle : itemStyle}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
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
