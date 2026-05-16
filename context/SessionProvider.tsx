'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SESSION_EXPIRED_EVENT } from '@/context/AuthContext';

interface SessionContextValue {
  triggerExpiry: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>');
  return ctx;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [expired, setExpired]     = useState(false);
  const [countdown, setCountdown] = useState(5);
  const router    = useRouter();
  const pathname  = usePathname();
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef  = useRef(false);

  // Never show the modal on the login page — 401s there are expected
  const isLoginPage = pathname === '/login';

  const triggerExpiry = useCallback(() => {
    // Skip if already fired or we're on the login page
    if (firedRef.current || isLoginPage) return;
    firedRef.current = true;
    setExpired(true);
    setCountdown(5);

    let secs = 5;
    timerRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        // Reset before navigating so state is clean on return
        setExpired(false);
        firedRef.current = false;
        router.push('/login');
      }
    }, 1000);
  }, [router, isLoginPage]);

  // Reset everything when the pathname changes to /login
  // (handles the case where middleware redirects before the timer finishes)
  useEffect(() => {
    if (isLoginPage) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setExpired(false);
      setCountdown(5);
      firedRef.current = false;
    }
  }, [isLoginPage]);

  // Listen for the global event dispatched by AuthContext
  useEffect(() => {
    const handler = () => triggerExpiry();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [triggerExpiry]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleLoginNow = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setExpired(false);
    firedRef.current = false;
    router.push('/login');
  };

  return (
    <SessionContext.Provider value={{ triggerExpiry }}>
      {children}

      {/* Only render the modal when expired AND not on the login page */}
      {expired && !isLoginPage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center">
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Session Expired
            </h2>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Your session has expired for security reasons. You'll be redirected to the login
              page in{' '}
              <span className="font-semibold text-amber-500 tabular-nums">{countdown}s</span>.
            </p>

            <button
              onClick={handleLoginNow}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 px-4 rounded-xl transition-all text-sm"
            >
              Log In Now
            </button>
          </div>
        </div>
      )}
    </SessionContext.Provider>
  );
}