'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setAuth(data.user, data.accessToken, data.refreshToken);

      // Route based on onboarding state
      const user = data.user;
      if (!user.is_verified) {
        router.push(`/verify?email=${encodeURIComponent(user.email)}`);
      } else if (!user.display_name) {
        router.push('/onboarding/profile');
      } else if (!user.nation_id) {
        router.push('/onboarding/nation');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-sm animate-fade-in-up shadow-2xl relative overflow-hidden">
      <div className="flex items-center gap-1.5 mb-5 border-b border-white/10 pb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] shrink-0 animate-pulse" />
        <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-[0.25em] font-bold">FACTION LOGIN</span>
      </div>

      {/* WORLDr brand identity */}
      <div className="flex flex-col items-center justify-center my-5 py-4 bg-white/[0.01] border border-white/5 rounded-sm">
        <div className="w-14 h-14 border border-amber-500/20 bg-black/60 flex items-center justify-center mb-2 shadow-inner relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <span className="font-serif text-amber-400 text-lg font-extrabold tracking-[0.15em] relative z-10">WR</span>
        </div>
        <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-[0.3em]">
          Aethon Chronicle
        </div>
        <div className="text-[8px] font-mono text-zinc-700 uppercase tracking-widest mt-0.5">
          v0.1 Alpha
        </div>
      </div>

      {error && (
        <div className="bg-red-950/30 border border-red-900/50 text-red-400 text-xs p-2.5 mb-4 font-mono">
          ✕ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Username / Email</label>
          <input
            id="login-username"
            className="input-premium"
            placeholder="info@nationhoodgame.com"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            required
          />
        </div>
        <div>
          <label className="text-[9px] text-zinc-500 uppercase tracking-[0.2em] font-bold block mb-1">Password</label>
          <input
            id="login-password"
            type="password"
            className="input-premium"
            placeholder="••••••••"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            required
          />
        </div>
        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="btn-premium-primary w-full mt-2"
        >
          {loading ? 'AUTHENTICATING...' : 'ENTER THE CHRONICLE'}
        </button>
      </form>

      <div className="flex flex-col gap-2.5 items-center justify-center mt-6 border-t border-white/5 pt-4 text-center">
        <Link href="/forgot-password" className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
          Forgot password?
        </Link>
        <div className="text-[10px] text-zinc-500">
          New to Aethon?{' '}
          <Link href="/register" className="text-amber-500 hover:text-amber-400 font-bold transition-colors">
            Establish a Faction
          </Link>
        </div>
      </div>
    </div>
  );
}
