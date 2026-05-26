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
      setError(err?.response?.data?.error || 'Failed to initiate password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950 p-6 animate-fade-in-up">
      <div className="mb-5">
        <h1 className="text-zinc-100 font-bold text-sm uppercase tracking-wider">Forgot Password</h1>
        <p className="text-zinc-600 text-xs mt-1">Enter your email to receive a reset link.</p>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/50 text-red-400 text-xs p-2.5 mb-4 font-mono">
          ✕ {error}
        </div>
      )}

      {sent ? (
        <div className="space-y-4">
          <div className="bg-emerald-950/30 border border-emerald-900 text-emerald-400 text-xs p-3 font-mono">
            ✓ If an account exists for <strong>{email}</strong>, a reset link will be sent shortly.
          </div>
          {resetToken && (
            <div className="bg-white/[0.02] border border-white/10 p-3 rounded-sm">
              <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1 font-mono">Dev Mode Reset Token</div>
              <div className="text-amber-400 text-xs font-mono break-all font-bold select-all mb-3">{resetToken}</div>
              <Link
                href={`/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`}
                className="btn-premium-primary text-center block text-xs py-2 bg-amber-500 hover:bg-amber-600 text-black font-bold font-mono transition-colors"
              >
                RESET PASSWORD NOW →
              </Link>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Email Address</label>
            <input
              id="forgot-email"
              type="email"
              className="terminal-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'SENDING...' : 'SEND RESET LINK'}
          </button>
        </form>
      )}

      <div className="text-center mt-4">
        <Link href="/login" className="text-[10px] text-zinc-600 hover:text-zinc-400">← Back to login</Link>
      </div>
    </div>
  );
}
