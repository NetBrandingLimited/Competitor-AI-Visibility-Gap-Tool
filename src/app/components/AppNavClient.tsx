'use client';

import { usePathname } from 'next/navigation';

import AppNav from '@/app/components/AppNav';

/** Remounts nav on route change so mobile menu state resets without an effect. */
export default function AppNavClient() {
  const pathname = usePathname();
  return <AppNav key={pathname} />;
}
