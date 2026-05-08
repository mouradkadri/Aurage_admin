'use client';

import React, {
  createContext, useContext, useEffect,
  useState, useCallback, useRef,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  name:  string;
  email: string;
  role:  string;
}

interface AuthContextValue {
  user:      AdminUser | null;
  loading:   boolean;
  refresh:   () => Promise<void>;
  clear:     () => void;
  /** Use instead of fetch() for any state-mutating request */
  csrfFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const csrfReady             = useRef(false);

  // ── Bootstrap CSRF token ────────────────────────────────────────────────
  // One GET to /api/auth/csrf sets the readable csrf_token cookie.
  // Subsequent mutating requests read that cookie and echo it as a header.
  useEffect(() => {
    if (csrfReady.current) return;
    csrfReady.current = true;

    fetch('/api/auth/csrf').catch(() => {
      // Non-fatal on first load — the token will be absent and the server
      // will reject any mutation attempt with a 403, which is the safe default.
    });
  }, []);

  // ── Fetch current user from server ─────────────────────────────────────
  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/admin/me');

      if (res.status === 401) {
        setUser(null);
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch user');

      const data = await res.json();
      if (data.success && data.data) {
        setUser({
          name:  data.data.name  ?? '',
          email: data.data.email ?? '',
          role:  data.data.role  ?? '',
        });
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  // ── CSRF-aware fetch wrapper ─────────────────────────────────────────────
  // Use this instead of fetch() for POST/PATCH/PUT/DELETE requests so the
  // x-csrf-token header is always included automatically.
  const csrfFetch = useCallback(
    (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
      const token = getCsrfCookie();

      const headers = new Headers(init.headers);
      if (token) headers.set('x-csrf-token', token);

      return fetch(input, { ...init, headers });
    },
    []
  );

  const clear = useCallback(() => setUser(null), []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchMe, clear, csrfFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}