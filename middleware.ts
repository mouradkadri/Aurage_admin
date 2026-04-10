import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Get the token from the secure cookies
  const token = request.cookies.get('admin_access_token')?.value;
  
  // 2. Get the current URL path the user is trying to access
  const { pathname } = request.nextUrl;

  // 3. Define paths that DO NOT require authentication
  const isPublicRoute = 
  pathname.startsWith('/login') || 
  pathname.startsWith('/api/auth') || 
  pathname.startsWith('/api/proxy'); 

  // 4. If there is NO token and the user is NOT on a public route -> Redirect to Login
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url);
    // Optional: Save the URL they were trying to visit so you can redirect them back later
    // loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 5. If there IS a token and the user tries to go to the Login page -> Redirect to Dashboard
  if (token && pathname === '/login') {
    const dashboardUrl = new URL('/', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // 6. Otherwise, allow the request to proceed normally
  return NextResponse.next();
}

// Configure which routes this middleware should run on
export const config = {
  matcher:[
    /*
     * Match all request paths except for the ones starting with:
     * - api/proxy (if you have proxy routes, let the proxy handle auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any files with an extension (e.g., .svg, .png)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};