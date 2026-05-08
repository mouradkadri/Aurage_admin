/**
 * lib/rateLimit.ts
 *
 * In-memory sliding-window rate limiter.
 *
 * Works perfectly for single-instance deployments (VPS, Railway, Render).
 * For multi-instance / serverless (Vercel with many edge workers), swap the
 * Map for a Redis/Upstash store — the interface stays identical.
 *
 * Usage:
 *   const result = rateLimit('login', ip, { limit: 5, windowMs: 60_000 });
 *   if (!result.allowed) return NextResponse.json(..., { status: 429 });
 */

interface WindowEntry {
  timestamps: number[];
}

// Module-level Map persists across requests within the same process.
const store = new Map<string, WindowEntry>();

// Prune stale keys every 5 minutes to prevent unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      // If the oldest timestamp is already expired the whole entry is stale
      if (!entry.timestamps.length || now - entry.timestamps[0] > 10 * 60_000) {
        store.delete(key);
      }
    }
  }, 5 * 60_000);
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit:    number;
  /** Window size in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed:    boolean;
  remaining:  number;
  resetAt:    number; // epoch ms when the oldest request falls off
}

/**
 * @param namespace  Logical bucket (e.g. 'login', 'otp') — keeps limits separate
 * @param identifier IP address or user identifier
 * @param options    limit + windowMs
 */
export function rateLimit(
  namespace:  string,
  identifier: string,
  options:    RateLimitOptions,
): RateLimitResult {
  const { limit, windowMs } = options;
  const key = `${namespace}:${identifier}`;
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create entry
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Drop timestamps outside the current window (sliding window)
  entry.timestamps = entry.timestamps.filter(t => t > windowStart);

  const resetAt = entry.timestamps.length > 0
    ? entry.timestamps[0] + windowMs
    : now + windowMs;

  if (entry.timestamps.length >= limit) {
    return {
      allowed:   false,
      remaining: 0,
      resetAt,
    };
  }

  // Record this request
  entry.timestamps.push(now);

  return {
    allowed:   true,
    remaining: limit - entry.timestamps.length,
    resetAt,
  };
}

/**
 * Extracts the best available IP from a Next.js request.
 * Prefer x-forwarded-for (set by Vercel / reverse proxies).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; first entry is the client
    return forwarded.split(',')[0].trim();
  }

  // Fallback — should always be present in Node.js HTTP
  return request.headers.get('x-real-ip') ?? '127.0.0.1';
}