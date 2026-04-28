 'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

  return (
    <nav
      aria-label="Primary"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        flexWrap: 'nowrap',
        gap: '10px 18px',
        alignItems: 'center',
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        marginTop: -8,
        paddingTop: 8,
        paddingBottom: 14,
        marginBottom: 8,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(2px)',
        borderBottom: '1px solid #e5e7eb',
        fontSize: 14
      }}
    >
      {navItems.map((item) => {
        const active = isActivePath(pathname, item);
        return (
          <Link key={item.href} href={item.href} style={active ? activeItemStyle : itemStyle} aria-current={active ? 'page' : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
