'use client';

import React, {
  createContext, useContext, useEffect,
  useState, useCallback, useRef,
} from 'react';

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
  csrfFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
}

function getCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export const SESSION_EXPIRED_EVENT = 'aurage:session-expired';

function dispatchSessionExpired() {
  if (typeof window === 'undefined') return;
  // Never fire while on the login page — 401s there are expected and normal
  if (window.location.pathname === '/login') return;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const csrfReady             = useRef(false);
  const expiryFired           = useRef(false);

  // Bootstrap CSRF token
  useEffect(() => {
    if (csrfReady.current) return;
    csrfReady.current = true;
    fetch('/api/auth/csrf').catch(() => {});
  }, []);

  const handle401 = useCallback(() => {
    // Skip if on login page or already handled
    if (typeof window !== 'undefined' && window.location.pathname === '/login') return;
    if (expiryFired.current) return;
    expiryFired.current = true;
    setUser(null);
    dispatchSessionExpired();
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/admin/me');

      if (res.status === 401) {
        setUser(null);
        setLoading(false);
        // Don't trigger expiry here — this runs on initial load where the
        // user may simply not be logged in yet (e.g. fresh browser visit)
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
        expiryFired.current = false;
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

  // Periodic session check — every 10 minutes + on tab focus
  useEffect(() => {
    const CHECK_INTERVAL = 10 * 60 * 1000;

    const check = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (expiryFired.current) return;
      // Never check on the login page
      if (typeof window !== 'undefined' && window.location.pathname === '/login') return;

      try {
        const res = await fetch('/api/proxy/admin/me');
        if (res.status === 401) {
          handle401();
        } else if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setUser({
              name:  data.data.name  ?? '',
              email: data.data.email ?? '',
              role:  data.data.role  ?? '',
            });
            expiryFired.current = false;
          }
        }
      } catch {
        // Network error — don't trigger expiry, wait for next check
      }
    };

    const interval = setInterval(check, CHECK_INTERVAL);

    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [handle401]);

  // Authenticated fetch — intercepts 401s mid-session
  const authFetch = useCallback(
    async (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
      const res = await fetch(input, init);
      if (res.status === 401 && !expiryFired.current) handle401();
      return res;
    },
    [handle401]
  );

  // CSRF-aware fetch — includes token header + intercepts 401s
  const csrfFetch = useCallback(
    async (input: RequestInfo, init: RequestInit = {}): Promise<Response> => {
      const token = getCsrfCookie();
      const headers = new Headers(init.headers);
      if (token) headers.set('x-csrf-token', token);
      const res = await fetch(input, { ...init, headers });
      if (res.status === 401 && !expiryFired.current) handle401();
      return res;
    },
    [handle401]
  );

  const clear = useCallback(() => {
    setUser(null);
    expiryFired.current = false;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: fetchMe, clear, csrfFetch, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}