import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomBytes, timingSafeEqual } from 'crypto';

// ─── Constants ────────────────────────────────────────────────────────────────

const CSRF_COOKIE  = 'csrf_token';
const CSRF_HEADER  = 'x-csrf-token';
const TOKEN_BYTES  = 32; // 256-bit token

// Cookie is readable by JS so the client can put it in a header —
// that's intentional for the double-submit pattern. An attacker on
// a different origin cannot read it due to SameSite + browser policy.
const COOKIE_OPTIONS = {
  httpOnly: false,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path:     '/',
  maxAge:   60 * 60 * 8, // 8 hours — matches default session length
};

// ─── Token generation ─────────────────────────────────────────────────────────

export function generateCsrfToken(): string {
  return randomBytes(TOKEN_BYTES).toString('hex');
}

// ─── Set token cookie (call from GET /api/auth/csrf) ─────────────────────────

export async function setCsrfCookie(response: NextResponse): Promise<string> {
  const token = generateCsrfToken();
  response.cookies.set(CSRF_COOKIE, token, COOKIE_OPTIONS);
  return token;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates the CSRF token on a mutating request.
 * Returns an error Response if invalid, or null if valid.
 *
 * Strategy: double-submit cookie
 *   - Cookie `csrf_token`  is set by GET /api/auth/csrf (readable by JS)
 *   - Header `x-csrf-token` must match it on every POST/PATCH/DELETE
 *
 * An attacker on another origin cannot read the cookie (SameSite=Strict
 * prevents the cookie being sent cross-site at all, and browser CORS
 * policy blocks cross-origin reads even if they tried fetch()).
 */
export async function validateCsrf(
  request: NextRequest
): Promise<NextResponse | null> {
  // 1. Origin / Referer check as a first line of defense
  const origin  = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host    = request.headers.get('host');

  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Malformed origin' },
        { status: 403 }
      );
    }
  } else if (referer) {
    // Some browsers omit Origin on same-origin POSTs but send Referer
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return NextResponse.json(
          { error: 'Invalid referer' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Malformed referer' },
        { status: 403 }
      );
    }
  }
  // If neither header is present we still fall through to the token check.
  // Omitting both is valid in some same-origin scenarios (e.g. server actions).

  // 2. Double-submit token check
  const cookieStore  = await cookies();
  const cookieToken  = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken  = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) {
    return NextResponse.json(
      { error: 'CSRF token missing' },
      { status: 403 }
    );
  }

  // Constant-time comparison prevents timing attacks
  const a = Buffer.from(cookieToken);
  const b = Buffer.from(headerToken);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json(
      { error: 'CSRF token mismatch' },
      { status: 403 }
    );
  }

  return null; // valid
}