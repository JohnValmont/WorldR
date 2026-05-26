'use client';
import { useState, useRef, useEffect, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

const OTP_LENGTH = 6;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { setUser, user } = useAuthStore();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Focus first empty input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer for resend cooldown
  const startCooldown = useCallback((seconds: number) => {
    setResendCooldown(seconds);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
  }, []);

  const otp = digits.join('');

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (otp.length !== OTP_LENGTH || !email) return;
    setError('');
    setLoading(true);
    try {
      await authApi.verifyEmail(email, otp);
      if (user) setUser({ ...user, is_verified: true });
      setSuccess(true);
      setTimeout(() => router.push('/onboarding/profile'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid or expired code. Please try again.');
      // Shake the inputs and clear them
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    // Handle paste of full OTP
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (cleaned.length === OTP_LENGTH) {
        const newDigits = cleaned.split('');
        setDigits(newDigits);
        setError('');
        inputRefs.current[OTP_LENGTH - 1]?.focus();
        return;
      }
    }

    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError('');

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
      }
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter' && otp.length === OTP_LENGTH) {
      handleVerify();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      setDigits(pasted.split(''));
      setError('');
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;
    setResending(true);
    setResendSuccess(false);
    setError('');
    try {
      await authApi.resendVerification(email);
      setResendSuccess(true);
      setDigits(Array(OTP_LENGTH).fill(''));
      startCooldown(60);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Could not resend code. Try again shortly.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  // Auto-submit when all digits are filled
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !loading && !success && email) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  if (success) {
    return (
      <div className="w-full animate-auth-enter">
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
            <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 mb-2">Email Verified!</h2>
          <p className="text-zinc-500 text-sm">Access granted. Redirecting to profile setup...</p>
          <div className="flex items-center gap-1.5 mt-4">
            <svg className="animate-spin w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-xs text-zinc-600 font-mono">Initializing session...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-auth-enter">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)] animate-pulse" />
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.3em]">Verification Required</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Check your inbox</h1>
        <p className="text-zinc-500 text-sm mt-1 leading-relaxed">
          A 6-digit code was sent to{' '}
          {email ? (
            <span className="text-zinc-300 font-medium">{email}</span>
          ) : (
            'your email address'
          )}.
        </p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-amber-950/15 border border-amber-800/25 rounded-sm p-3.5 mb-6">
        <svg className="w-4 h-4 text-amber-500/80 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-amber-300/70 leading-relaxed">
          Enter the 6-digit code below. It expires in <strong>10 minutes</strong>.
          If you don't see it, check your spam folder.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-950/30 border border-red-800/50 text-red-400 text-xs p-3.5 mb-5 rounded-sm">
          <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <span className="font-mono">{error}</span>
        </div>
      )}

      {/* Resend success */}
      {resendSuccess && !error && (
        <div className="flex items-center gap-2 bg-emerald-950/20 border border-emerald-800/40 text-emerald-400 text-xs p-3 mb-5 rounded-sm">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-mono">New code dispatched — check your inbox.</span>
        </div>
      )}

      {/* OTP PIN Input */}
      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="auth-label mb-3 block">Verification Code</label>
          <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                id={`otp-digit-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={e => handleDigitChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                onFocus={e => e.target.select()}
                disabled={loading}
                className={`
                  w-12 h-14 text-center text-2xl font-bold font-mono rounded-md border
                  bg-zinc-900/80 text-zinc-100 outline-none transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${digit
                    ? 'border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'border-zinc-700/60 hover:border-zinc-600/60'
                  }
                  focus:border-amber-500/80 focus:shadow-[0_0_16px_rgba(245,158,11,0.2)]
                  caret-transparent
                `}
                autoComplete="one-time-code"
              />
            ))}
          </div>
          {/* Divider between digits 3 and 4 for readability */}
          <p className="text-center text-[10px] text-zinc-700 font-mono mt-3 tracking-widest">
            {otp.length}/{OTP_LENGTH} digits entered
          </p>
        </div>

        <button
          id="verify-submit"
          type="submit"
          disabled={loading || otp.length !== OTP_LENGTH || success}
          className="auth-btn-primary w-full group"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verifying...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Verify Email
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          )}
        </button>
      </form>

      {/* Resend & Back */}
      <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
        <button
          id="resend-otp"
          onClick={handleResend}
          disabled={resending || resendCooldown > 0 || !email}
          className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors py-2 border border-white/5 rounded-sm hover:border-white/10"
        >
          {resending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending...
            </span>
          ) : resendCooldown > 0 ? (
            `↺ Resend code (${resendCooldown}s)`
          ) : (
            '↺ Resend verification code'
          )}
        </button>
        <div className="text-center">
          <Link href="/login" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="w-full flex items-center justify-center py-12">
        <svg className="animate-spin w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    }>
      <VerifyForm />
    </Suspense>
  );
}
