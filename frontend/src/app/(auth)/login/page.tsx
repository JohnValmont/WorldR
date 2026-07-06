'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { getFlowRedirectPath } from '../../../lib/flow';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      setAuth(data.user, data.accessToken, data.refreshToken);

      const user = data.user;
      if (!user.is_verified) {
        router.push(`/verify?email=${encodeURIComponent(user.email)}`);
      } else {
        router.push(getFlowRedirectPath());
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full"
    >
      {/* Header */}
      <div className="mb-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-2.5 mb-4"
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-[0.35em]">Return to the world</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="text-3xl font-bold text-zinc-100 tracking-tight leading-tight mb-3"
        >
          Welcome back to<br />
          <span className="bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">WORLDr</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-zinc-500 text-xs leading-relaxed max-w-xs"
        >
          Sign in to your account and continue shaping your destiny in the world.
        </motion.p>
      </div>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="flex items-start gap-3 bg-gradient-to-r from-red-950/40 to-red-950/20 border border-red-900/50 backdrop-blur-sm text-red-300 text-xs p-4 mb-6 rounded-lg overflow-hidden relative"
          >
            <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-red-500 to-red-600" />
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <span className="font-mono text-xs">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <label htmlFor="login-email" className="block text-xs font-semibold text-zinc-300 mb-2.5 tracking-wide">
            Email Address
          </label>
          <motion.div
            className={`relative rounded-lg border transition-all duration-200 ${
              focusedField === 'email'
                ? 'border-amber-500/60 bg-amber-500/5 shadow-[0_0_16px_rgba(245,158,11,0.12)]'
                : 'border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600/50'
            }`}
            animate={focusedField === 'email' ? { scale: 1.01 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                focusedField === 'email' ? 'text-amber-400' : 'text-zinc-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <input
              id="login-email"
              type="email"
              className="w-full bg-transparent pl-10 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none font-mono"
              placeholder="you@example.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              autoComplete="email"
              required
            />
          </motion.div>
        </motion.div>

        {/* Password Field */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-2.5">
            <label htmlFor="login-password" className="block text-xs font-semibold text-zinc-300 tracking-wide">
              Password
            </label>
            <Link href="/forgot-password" className="text-[10px] text-zinc-500 hover:text-amber-400 transition-colors font-mono tracking-wide">
              Forgot?
            </Link>
          </div>
          <motion.div
            className={`relative rounded-lg border transition-all duration-200 ${
              focusedField === 'password'
                ? 'border-amber-500/60 bg-amber-500/5 shadow-[0_0_16px_rgba(245,158,11,0.12)]'
                : 'border-zinc-700/50 bg-zinc-900/30 hover:border-zinc-600/50'
            }`}
            animate={focusedField === 'password' ? { scale: 1.01 } : { scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <span
              className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${
                focusedField === 'password' ? 'text-amber-400' : 'text-zinc-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="w-full bg-transparent pl-10 pr-12 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none font-mono"
              placeholder="••••••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              autoComplete="current-password"
              required
            />
            <motion.button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-amber-400 transition-colors p-1"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Submit Button */}
        <motion.button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="w-full mt-7 py-3 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm tracking-wide shadow-lg hover:shadow-[0_0_24px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          whileHover={!loading ? { scale: 1.02 } : {}}
          whileTap={!loading ? { scale: 0.98 } : {}}
        >
          {loading ? (
            <>
              <motion.svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </motion.svg>
              Authenticating...
            </>
          ) : (
            <>
              <span>Sign In</span>
              <motion.svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </motion.svg>
            </>
          )}
        </motion.button>
      </form>

      {/* Divider */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex items-center gap-3 my-7"
      >
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
        <span className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />
      </motion.div>

      {/* Register CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent p-4"
        whileHover={{ borderColor: 'rgba(245, 158, 11, 0.4)' }}
      >
        <p className="text-center text-zinc-400 text-xs leading-relaxed">
          New to WORLDr?{' '}
          <Link href="/register" className="text-amber-400 font-semibold hover:text-amber-300 transition-colors underline">
            Create your account
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
}
