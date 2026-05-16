/**
 * lib/apiError.ts
 *
 * Extracts a human-readable message from any backend response shape
 * and fires a sonner toast. Import this wherever you do fetch() calls.
 */

import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiErrorOptions {
  /** Fallback message if the response has no readable error field */
  fallback?: string;
  /** If true, throws after toasting (useful in async catch blocks) */
  rethrow?: boolean;
}

// ─── Core extractor ───────────────────────────────────────────────────────────

/**
 * Given a Response that is NOT ok, read the body and return the best
 * human-readable error string. Never throws.
 */
export async function extractApiError(
  res: Response,
  fallback = 'Une erreur inattendue est survenue.',
): Promise<string> {
  try {
    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = await res.json();
      // Try common backend error shapes in priority order
      return (
        json.message   ||   // Express: { message: '...' }
        json.error     ||   // Next API routes: { error: '...' }
        json.detail    ||   // DRF / FastAPI: { detail: '...' }
        json.msg       ||   // Some Flask patterns
        (Array.isArray(json.errors) && json.errors[0]?.message) || // Validation arrays
        fallback
      );
    }
    // Plain text error body (rare but possible)
    const text = await res.text();
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}

// ─── Toast helpers ────────────────────────────────────────────────────────────

/**
 * Show a sonner error toast with the backend message.
 * Returns the message string so callers can log or rethrow it.
 */
export async function toastApiError(
  res: Response,
  fallback = 'Une erreur inattendue est survenue.',
): Promise<string> {
  const message = await extractApiError(res, fallback);
  toast.error(message, {
    description: `HTTP ${res.status}`,
    duration: 6000,
  });
  return message;
}

/**
 * Show a generic catch-block error toast (network errors, JSON parse failures, etc.)
 */
export function toastNetworkError(err: unknown): void {
  const message =
    err instanceof Error ? err.message : 'Erreur réseau. Vérifiez votre connexion.';
  toast.error(message, { duration: 6000 });
}

/**
 * Convenience wrapper: call inside a try/catch around fetch().
 * Handles both non-ok responses AND thrown exceptions.
 *
 * Usage:
 *   const data = await handleApiCall(
 *     () => fetch('/api/proxy/products', { method: 'POST', body: fd }),
 *     'Impossible de créer le produit',
 *   );
 *   if (!data) return false; // error already toasted
 */
export async function handleApiCall<T = unknown>(
  fn: () => Promise<Response>,
  fallback = 'Une erreur inattendue est survenue.',
): Promise<T | null> {
  try {
    const res = await fn();
    if (!res.ok) {
      await toastApiError(res, fallback);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    toastNetworkError(err);
    return null;
  }
}