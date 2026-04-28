import Link from 'next/link';
import type { CSSProperties } from 'react';

const itemStyle: CSSProperties = { color: '#1d4ed8', textDecoration: 'none' };

export default function AppNav() {
  return (
    <nav
      aria-label="Primary"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px 18px',
        alignItems: 'center',
        paddingBottom: 14,
        marginBottom: 8,
        borderBottom: '1px solid #e5e7eb',
        fontSize: 14
      }}
    >
      <Link href="/" style={itemStyle}>
        Home
      </Link>
      <Link href="/dashboard" style={itemStyle}>
        Dashboard
      </Link>
      <Link href="/reports" style={itemStyle}>
        Reports
      </Link>
      <Link href="/ops" style={itemStyle}>
        Ops
      </Link>
      <Link href="/settings/brand" style={itemStyle}>
        Brand
      </Link>
      <Link href="/settings/connectors" style={itemStyle}>
        Connectors
      </Link>
    </nav>
  );
}
