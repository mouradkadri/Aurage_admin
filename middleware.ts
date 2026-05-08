import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('admin_access_token')?.value;
  const { pathname } = request.nextUrl;

  // Only auth endpoints are truly public — everything else, including
  // /api/proxy, requires a valid session cookie. This gives us two layers
  // of protection on proxy routes: middleware rejects cookie-less requests
  // before they even reach the proxy handler, and the proxy double-checks
  // the cookie itself before forwarding to Express.
  const isPublicRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth');

  if (!token && !isPublicRoute) {
    // API routes get a 401 JSON response instead of a login redirect
    // so client-side fetch calls handle it gracefully.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};