'use client';
import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '../../../lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword(email);
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
      setSent(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to initiate password reset. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="w-full animate-auth-enter">
        <div className="flex flex-col items-center text-center py-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
            <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" />
            <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.3em]">Reset Dispatched</span>
          </div>

          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Check your inbox</h1>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
            If an account is registered with{' '}
            <strong className="text-zinc-300">{email}</strong>,
            a reset link will be sent shortly.
          </p>
        </div>

        {/* Dev mode token display */}
        {resetToken && (
          <div className="mb-5 bg-amber-950/20 border border-amber-800/40 rounded-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span className="text-[9px] text-amber-500/80 font-mono uppercase tracking-[0.25em]">Dev Mode — Reset Token</span>
            </div>
            <code className="text-amber-300 text-xs font-mono break-all select-all block leading-relaxed mb-4">{resetToken}</code>
            <Link
              href={`/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`}
              className="auth-btn-primary w-full flex items-center justify-center gap-2 group text-sm"
            >
              Reset Password Now
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        )}

        <div className="space-y-2.5 text-center">
          <button
            onClick={() => { setSent(false); setResetToken(''); }}
            className="w-full text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2 border border-white/5 rounded-sm hover:border-white/10"
          >
            Try a different email
          </button>
          <Link href="/login" className="block text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors py-1">
            ← Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-auth-enter">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.3em]">Password Recovery</span>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">Forgot password?</h1>
        <p className="text-zinc-500 text-sm mt-1">Enter your email to receive a secure reset link.</p>
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="auth-label">Email Address</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <input
              id="forgot-email"
              type="email"
              className="auth-input pl-10"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <button
          id="forgot-submit"
          type="submit"
          disabled={loading}
          className="auth-btn-primary w-full group"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Sending reset link...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Send reset link
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </span>
          )}
        </button>
      </form>

      <div className="text-center mt-6 pt-5 border-t border-white/5">
        <Link href="/login" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors">
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
