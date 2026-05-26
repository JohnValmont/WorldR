'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verifyToken, setVerifyToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      if (data.verificationToken) setVerifyToken(data.verificationToken);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-panel p-6 rounded-sm animate-fade-in-up shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-1.5 mb-5 border-b border-white/10 pb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] shrink-0" />
          <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.25em] font-bold">REGISTRATION SUCCESSFUL</span>
        </div>

        <p className="text-zinc-400 text-xs mb-4 leading-relaxed font-sans">
          A verification code has been sent to <strong className="text-zinc-200">{form.email}</strong>.
          Please enter this code on the next screen to verify your email.
        </p>

        {verifyToken && (
          <div className="bg-white/[0.02] border border-white/10 p-3 mb-4 rounded-sm">
            <div className="text-[8px] text-zinc-500 uppercase tracking-widest mb-1 font-mono">Dev Mode Verification Code</div>
            <div className="text-amber-400 text-xs font-mono break-all font-bold select-all">{verifyToken}</div>
          </div>
        )}

        <Link
          href={`/verify?email=${encodeURIComponent(form.email)}`}
          className="btn-premium-primary w-full text-center block"
        >
          VERIFY EMAIL →
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-sm animate-fade-in-up shadow-2xl relative overflow-hidden">
      <div className="flex items-center gap-1.5 mb-5 border-b border-white/10 pb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] shrink-0 animate-pulse" />
        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.25em] font-bold">ESTABLISH FACTION</span>
      </div>

      <div className="text-zinc-400 text-xs mb-6 leading-relaxed">
        Establish a new political faction to compete for seats, formulate laws, and steer national policy.
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/50 text-red-400 text-xs p-2.5 mb-4 font-mono">
          ✕ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Faction Handle (Username)</label>
          <input
            id="register-username"
            className="input-premium"
            placeholder="e.g. keldoria_patriot"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            required minLength={3}
          />
        </div>
        <div>
          <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Email Address</label>
          <input
            id="register-email"
            type="email"
            className="input-premium"
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Security Key (Password)</label>
          <input
            id="register-password"
            type="password"
            className="input-premium"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required minLength={6}
          />
        </div>
        <button
          id="register-submit"
          type="submit"
          disabled={loading}
          className="btn-premium-primary w-full mt-2"
        >
          {loading ? 'CREATING FACTION...' : 'ESTABLISH FACTION'}
        </button>
      </form>

      <p className="text-center text-zinc-500 text-[10px] mt-6 border-t border-white/5 pt-4">
        Already have a faction?{' '}
        <Link href="/login" className="text-amber-500 hover:text-amber-400 font-bold transition-colors">Sign in</Link>
      </p>
    </div>
  );
}
