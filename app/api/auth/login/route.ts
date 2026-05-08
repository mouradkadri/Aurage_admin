import { NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/csrf';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// 10 attempts per 15 minutes per IP.
// Enough for a legitimate user who misremembers their password;
// tight enough to make brute-force infeasible.
const LIMIT     = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(request: Request) {
  // ── Rate limit ────────────────────────────────────────────────────────────
  const ip     = getClientIp(request);
  const result = rateLimit('login', ip, { limit: LIMIT, windowMs: WINDOW_MS });

  if (!result.allowed) {
    const retryAfterSec = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After':       String(retryAfterSec),
          'X-RateLimit-Limit': String(LIMIT),
          'X-RateLimit-Reset': String(result.resetAt),
        },
      }
    );
  }

  // ── CSRF ──────────────────────────────────────────────────────────────────
  const csrfError = await validateCsrf(request as any);
  if (csrfError) return csrfError;

  // ── Proxy to Express ──────────────────────────────────────────────────────
  try {
    const body         = await request.json();
    const forwardedFor = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent    = request.headers.get('user-agent') || 'Unknown';

    const expressRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/login`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:             body.email,
          password:          body.password,
          'x-forwarded-for': forwardedFor,
          'user-agent':      userAgent,
        }),
      }
    );

    const data = await expressRes.json();

    if (!expressRes.ok || !data.success) {
      return NextResponse.json(
        { error: data.message || 'Invalid email or password' },
        { status: expressRes.status || 401 }
      );
    }

    return NextResponse.json({
      success:      true,
      requires_otp: data.requires_otp,
      email:        data.email,
      message:      data.message,
    });

  } catch (error) {
    console.error('Login Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}