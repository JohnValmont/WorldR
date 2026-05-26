'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { Suspense } from 'react';

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.verifyEmail(token.trim());
      if (user) setUser({ ...user, is_verified: true });
      setSuccess(true);
      setTimeout(() => router.push('/onboarding/profile'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid or expired token.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setError('');
    } catch {
      setError('Could not resend. Try again shortly.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-sm animate-fade-in-up shadow-2xl relative overflow-hidden">
      <div className="flex items-center gap-1.5 mb-5 border-b border-white/10 pb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] shrink-0 animate-pulse" />
        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.25em] font-bold">VERIFY CHRONICLE ACCESS</span>
      </div>

      <p className="text-zinc-400 text-xs mb-5 leading-relaxed font-sans">
        Enter the access token dispatched to{' '}
        {email ? <strong className="text-zinc-200">{email}</strong> : 'your email address'} to authorize your session.
      </p>

      {success && (
        <div className="bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 text-xs p-2.5 mb-4 font-mono">
          ✓ ACCESS GRANTED — TRANSFERRING TO PROFILE PROFILE SETUP...
        </div>
      )}

      {error && (
        <div className="bg-red-950/30 border border-red-900/50 text-red-400 text-xs p-2.5 mb-4 font-mono">
          ✕ {error}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Access Token</label>
          <input
            id="verify-token"
            className="input-premium"
            placeholder="Paste credentials token..."
            value={token}
            onChange={e => setToken(e.target.value)}
            required
          />
        </div>
        <button
          id="verify-submit"
          type="submit"
          disabled={loading || success}
          className="btn-premium-primary w-full"
        >
          {loading ? 'VERIFYING CREDENTIALS...' : 'AUTHORIZE SESSION'}
        </button>
      </form>

      <button
        onClick={handleResend}
        disabled={resending || !email}
        className="w-full text-center text-[10px] text-zinc-500 hover:text-zinc-300 mt-5 transition-colors"
      >
        {resending ? 'Re-sending Token...' : 'Request another access token'}
      </button>

      <div className="text-center mt-3 border-t border-white/5 pt-3">
        <Link href="/login" className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">← Cancel and return to login</Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
