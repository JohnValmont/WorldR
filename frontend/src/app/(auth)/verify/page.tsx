'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const { setUser, user } = useAuthStore();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.verifyEmail(token.trim());
      if (user) setUser({ ...user, is_verified: true });
      setSuccess(true);
      setTimeout(() => router.push('/onboarding/profile'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid or expired token. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resendCooldown) return;
    setResending(true);
    setResendSuccess(false);
    try {
      await authApi.resendVerification(email);
      setError('');
      setResendSuccess(true);
      setResendCooldown(true);
      setTimeout(() => setResendCooldown(false), 60000);
    } catch {
      setError('Could not resend verification. Try again shortly.');
    } finally {
      setResending(false);
    }
  };

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
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.8)] animate-pulse" />
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.3em]">Email Verification</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Verify your email</h1>
        <p className="text-zinc-500 text-sm mt-1 leading-relaxed">
          Enter the verification token sent to{' '}
          {email ? (
            <span className="text-zinc-300 font-medium">{email}</span>
          ) : (
            'your email address'
          )}.
        </p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 bg-indigo-950/20 border border-indigo-800/30 rounded-sm p-3.5 mb-6">
        <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-indigo-300/80 leading-relaxed">
          Check your inbox for the verification token. It expires in <strong>24 hours</strong>.
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
          <span className="font-mono">New verification token dispatched.</span>
        </div>
      )}

      {/* Token input */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="auth-label">Verification Token</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </span>
            <input
              id="verify-token"
              className="auth-input pl-10 font-mono tracking-wider"
              placeholder="Paste your verification token..."
              value={token}
              onChange={e => setToken(e.target.value)}
              required
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>

        <button
          id="verify-submit"
          type="submit"
          disabled={loading || success}
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
          onClick={handleResend}
          disabled={resending || resendCooldown || !email}
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
          ) : resendCooldown ? (
            'Token sent — wait 60s before retrying'
          ) : (
            '↺ Resend verification token'
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
