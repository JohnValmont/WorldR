import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes that don't require auth
const PUBLIC_ROUTES = ['/', '/login', '/register', '/verify', '/forgot-password'];
// Onboarding routes
const ONBOARDING_ROUTES = ['/onboarding/profile', '/onboarding/nation', '/onboarding/join-party'];
// Dashboard routes that need full setup
const DASHBOARD_ROUTES = ['/dashboard', '/economy', '/budget', '/inflation', '/laws',
  '/politics', '/elections', '/population', '/party', '/reports', '/notifications', '/settings'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get tokens from cookies (server-side) or skip for client-only auth
  // For Next.js edge middleware, we check cookies for server-side tokens
  // Since we use localStorage, the middleware only blocks based on path patterns.
  // Actual auth enforcement is in the DashboardLayout client component.
  // This middleware handles basic redirects only.

  // If accessing root, let through (landing page handles redirect)
  if (pathname === '/') return NextResponse.next();

  // Allow all public routes
  if (PUBLIC_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Allow onboarding routes
  if (ONBOARDING_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Allow API routes
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
