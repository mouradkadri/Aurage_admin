'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  
  // UI States
  const [step, setStep] = useState<'login' | 'otp'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form States
  const [email, setEmail] = useState(''); 
  const [password, setPassword] = useState('');
  const[showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
   const [rememberMe, setRememberMe] = useState(true);

  // --- STEP 1: Handle Email & Password Submission ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to login');
        setIsLoading(false);
        return;
      }

      // If backend says OTP is required, move to step 2
      if (data.requires_otp) {
        setSuccessMsg(data.message || 'OTP sent to your email.');
        setStep('otp');
      }
      
    } catch (err) {
      setError('A network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- STEP 2: Handle OTP Submission ---
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid or expired OTP');
        setIsLoading(false);
        return;
      }
        const storage = rememberMe ? localStorage : sessionStorage;
      
      if (rememberMe) sessionStorage.clear();
      else localStorage.clear();

      localStorage.setItem('adminName', data.user.name);
      localStorage.setItem('adminEmail', data.user.email);
      localStorage.setItem('adminRole', data.user.role);

      router.refresh(); 
      router.push('/');
      
    } catch (err) {
      setError('A network error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-gray-800/90 backdrop-blur border border-gray-700 rounded-2xl shadow-2xl p-8 transition-all duration-300">
          
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              {step === 'login' ? (
                <span className="text-white font-bold text-lg">A</span>
              ) : (
                <ShieldCheck className="text-white w-6 h-6" />
              )}
            </div>
          </div>

          {/* Title */}
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

          {/* Messages */}
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
          {successMsg && step === 'otp' && !error && (
            <div className="mb-6 p-3 bg-green-500/10 border border-green-500/30 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
              <p className="text-green-400 text-sm text-center">{successMsg}</p>
            </div>
          )}

          {/* --- FORM RENDERER --- */}
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
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
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
                    className="w-full pl-10 pr-10 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
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
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Continue'}
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
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} // Restrict to numbers only
                  placeholder="000000"
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2.5 rounded-lg transition-all disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Secure Sign In'}
              </Button>

              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep('login');
                    setOtpCode('');
                    setError('');
                    setSuccessMsg('');
                  }}
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