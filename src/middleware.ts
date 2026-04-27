import { NextResponse, type NextRequest } from 'next/server';

import { SESSION_USER_ID_COOKIE } from '@/lib/session';

const PROTECTED = ['/dashboard', '/reports', '/settings', '/ops'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PROTECTED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!needsAuth) {
    return NextResponse.next();
  }
  const session = request.cookies.get(SESSION_USER_ID_COOKIE)?.value?.trim();
  if (!session) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/reports',
    '/reports/:path*',
    '/settings',
    '/settings/:path*',
    '/ops',
    '/ops/:path*'
  ]
};
