import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    // 1. Delete the secure cookie
    // In Next.js 14+, cookies() is asynchronous, but await is safe to use.
    const cookieStore = await cookies();
    cookieStore.delete('admin_access_token');

    // 2. Return a success response
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout Error:', error);
    return NextResponse.json({ error: 'Failed to log out' }, { status: 500 });
  }
}