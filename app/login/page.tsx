'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { refresh, csrfFetch } = useAuth();

  const [step, setStep]             = useState<'login' | 'otp'>('login');
  const [isLoading, setIsLoading]   = useState(false);
  const [error, setError]           = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode]           = useState('');
  const [rememberMe, setRememberMe]     = useState(true);

  // Rate limit countdown (seconds remaining until retry allowed)
  const [rateLimitedFor, setRateLimitedFor] = useState(0);

  // Countdown ticker
  useEffect(() => {
    if (rateLimitedFor <= 0) return;
    const id = setInterval(() => {
      setRateLimitedFor(s => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rateLimitedFor]);

  // ── Shared 429 handler ───────────────────────────────────────────────────
  const handle429 = (headers: Headers, fallbackMsg: string) => {
    const retryAfter = headers.get('Retry-After');
    const secs = retryAfter ? parseInt(retryAfter, 10) : 60;
    setRateLimitedFor(secs);
    setError(fallbackMsg);
  };

  // ── Step 1: password ─────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimitedFor > 0) return;

    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    if (!email || !password) {
      setError('Please fill in all fields.');
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await csrfFetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      });

      if (res.status === 429) {
        handle429(res.headers, 'Too many login attempts. Please wait before trying again.');
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to login');
        setIsLoading(false);
        return;
      }

      if (data.requires_otp) {
        setSuccessMsg(data.message || 'OTP sent to your email.');
        setStep('otp');
      }
    } catch {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: OTP ──────────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rateLimitedFor > 0) return;

    setIsLoading(true);
    setError('');

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await csrfFetch('/api/auth/verify-otp', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, otp_code: otpCode, rememberMe }),
      });

      if (res.status === 429) {
        handle429(res.headers, 'Too many OTP attempts. Please wait before trying again.');
        setIsLoading(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid or expired OTP');
        setIsLoading(false);
        return;
      }

      await refresh();
      router.refresh();
      router.push('/');
    } catch {
      setError('A network error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const isBlocked = rateLimitedFor > 0;

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-2xl shadow-2xl p-8 transition-all duration-300">

          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              {step === 'login'
                ? <span className="text-white font-bold text-lg">A</span>
                : <ShieldCheck className="text-white w-6 h-6" />
              }
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              {step === 'login' ? 'Aurage Admin' : 'Two-Step Verification'}
            </h1>
            <p className="text-gray-400 text-sm">
              {step === 'login'
                ? 'Sign in to your dashboard'
                : `Enter the code sent to ${email}`}
            </p>
          </div>

          {/* Rate-limit banner */}
          {isBlocked && (
            <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-orange-400">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Too many attempts — retry in{' '}
                  <span className="font-mono font-bold">{formatCountdown(rateLimitedFor)}</span>
                </span>
              </div>
            </div>
          )}

          {/* Regular error (only when not rate-limited) */}
          {error && !isBlocked && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {successMsg && step === 'otp' && !error && !isBlocked && (
            <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-green-400 text-sm text-center">{successMsg}</p>
            </div>
          )}

          {step === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aurage.com"
                    disabled={isBlocked}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    disabled={isBlocked}
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center text-sm pt-2">
                <label className="flex items-center text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 accent-amber-500"
                  />
                  <span className="ml-2">Remember me</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading || isBlocked}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : isBlocked ? `Locked (${formatCountdown(rateLimitedFor)})` : 'Continue'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2 text-center">6-Digit Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  disabled={isBlocked}
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || otpCode.length !== 6 || isBlocked}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : isBlocked ? `Locked (${formatCountdown(rateLimitedFor)})` : 'Secure Sign In'}
              </Button>

              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => { setStep('login'); setOtpCode(''); setError(''); setSuccessMsg(''); setRateLimitedFor(0); }}
                  className="flex items-center text-sm text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to login
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}