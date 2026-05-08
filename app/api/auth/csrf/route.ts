import { NextResponse } from 'next/server';
import { setCsrfCookie } from '@/lib/csrf';

/**
 * GET /api/auth/csrf
 *
 * Call this once on app load (from AuthProvider or a top-level useEffect).
 * It sets the readable `csrf_token` cookie that the client must echo back
 * as the `x-csrf-token` header on every state-mutating request.
 *
 * The endpoint itself is safe to be public — knowing the token only helps
 * you if you can also send it from the correct origin.
 */
export async function GET() {
  const response = NextResponse.json({ ok: true });
  await setCsrfCookie(response);
  return response;
}