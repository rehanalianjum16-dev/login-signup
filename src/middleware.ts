import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  const isProtectedRoute = pathname.startsWith('/dashboard');
  const isAuthRoute = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(pathname);

  if (isProtectedRoute && !refreshToken) {
    // Redirect unauthenticated user to login
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthRoute && refreshToken) {
    // Redirect authenticated user to dashboard if they try to access login/signup
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password'
  ]
};
