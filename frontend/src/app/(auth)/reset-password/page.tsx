'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '../../../lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ email, token, password });
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to reset password. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950 p-6 animate-fade-in-up">
      <div className="mb-5">
        <h1 className="text-zinc-100 font-bold text-sm uppercase tracking-wider">Reset Password</h1>
        <p className="text-zinc-600 text-xs mt-1">Set a new security key for your faction.</p>
      </div>

      {success && (
        <div className="bg-emerald-950/30 border border-emerald-900 text-emerald-400 text-xs p-3 mb-4 font-mono">
          ✓ Password reset successfully! Redirecting to login...
        </div>
      )}

      {error && (
        <div className="bg-red-950/30 border border-red-900/50 text-red-400 text-xs p-2.5 mb-4 font-mono">
          ✕ {error}
        </div>
      )}

      {!success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Email Address</label>
            <input
              type="email"
              className="terminal-input opacity-60 block w-full bg-zinc-900 text-zinc-400 px-3 py-2 border border-zinc-800"
              value={email}
              disabled
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Reset Token</label>
            <input
              type="text"
              className="terminal-input opacity-60 block w-full bg-zinc-900 text-zinc-400 px-3 py-2 border border-zinc-800"
              value={token}
              disabled
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">New Security Key (Password)</label>
            <input
              type="password"
              className="terminal-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Confirm Security Key</label>
            <input
              type="password"
              className="terminal-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'RESETTING PASSWORD...' : 'RESET PASSWORD'}
          </button>
        </form>
      )}

      <div className="text-center mt-4">
        <Link href="/login" className="text-[10px] text-zinc-600 hover:text-zinc-400">← Back to login</Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-zinc-500 text-xs font-mono text-center p-6">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
