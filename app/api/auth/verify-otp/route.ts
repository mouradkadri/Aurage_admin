import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateCsrf } from '@/lib/csrf';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// OTP guessing is more dangerous than password guessing — a 6-digit code
// has only 1,000,000 combinations. Keep this window tight.
// 5 attempts per 10 minutes per IP; also lock per email so an attacker
// rotating IPs still can't exhaust one victim's OTP.
const IP_LIMIT      = 5;
const IP_WINDOW_MS  = 10 * 60 * 1000; // 10 minutes

const EMAIL_LIMIT     = 5;
const EMAIL_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  // ── Rate limit by IP ──────────────────────────────────────────────────────
  const ip        = getClientIp(request);
  const ipResult  = rateLimit('otp:ip', ip, { limit: IP_LIMIT, windowMs: IP_WINDOW_MS });

  if (!ipResult.allowed) {
    const retryAfterSec = Math.ceil((ipResult.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After':       String(retryAfterSec),
          'X-RateLimit-Limit': String(IP_LIMIT),
          'X-RateLimit-Reset': String(ipResult.resetAt),
        },
      }
    );
  }

  // ── CSRF ──────────────────────────────────────────────────────────────────
  const csrfError = await validateCsrf(request as any);
  if (csrfError) return csrfError;

  // ── Parse body early so we can rate-limit by email too ───────────────────
  let body: { email?: string; otp_code?: string; rememberMe?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // ── Rate limit by email (catches IP-rotating attackers) ───────────────────
  if (body.email) {
    const emailResult = rateLimit(
      'otp:email',
      body.email.toLowerCase(),
      { limit: EMAIL_LIMIT, windowMs: EMAIL_WINDOW_MS }
    );

    if (!emailResult.allowed) {
      const retryAfterSec = Math.ceil((emailResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many attempts for this account. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After':       String(retryAfterSec),
            'X-RateLimit-Limit': String(EMAIL_LIMIT),
            'X-RateLimit-Reset': String(emailResult.resetAt),
          },
        }
      );
    }
  }

  // ── Proxy to Express ──────────────────────────────────────────────────────
  try {
    const forwardedFor = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent    = request.headers.get('user-agent') || 'Unknown';

    const expressRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/admin/verify-otp`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:             body.email,
          otp_code:          body.otp_code,
          rememberMe:        body.rememberMe,
          'x-forwarded-for': forwardedFor,
          'user-agent':      userAgent,
        }),
      }
    );

    const data = await expressRes.json();

    if (!expressRes.ok || !data.success) {
      return NextResponse.json(
        { error: data.message || 'Invalid or expired OTP' },
        { status: expressRes.status || 401 }
      );
    }

    const maxAge = body.rememberMe ? 30 * 24 * 60 * 60 : 8 * 60 * 60;

    (await cookies()).set({
      name:     'admin_access_token',
      value:    data.token,
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path:     '/',
      maxAge,
    });

    return NextResponse.json({ success: true, data: data.data });

  } catch (error) {
    console.error('Verify OTP Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}