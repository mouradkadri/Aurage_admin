import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrf } from '@/lib/csrf';

export async function POST(request: Request) {
  // Validate CSRF even on logout — prevents cross-site forced sign-out attacks
  const csrfError = await validateCsrf(request as any);
  if (csrfError) return csrfError;

  try {
    const cookieStore = await cookies();
    cookieStore.delete('admin_access_token');
    cookieStore.delete('csrf_token');

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout Error:', error);
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 });
  }
}