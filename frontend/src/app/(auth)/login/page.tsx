'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi, characterApi } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth.store';
import { getFlowRedirectPath } from '../../../lib/flow';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleGuestLogin = async () => {
    setShowGuestModal(false);
    setGuestLoading(true);
    setError('');
    try {
      const { data } = await authApi.guestLogin();

      if (typeof window !== 'undefined') {
        const STATE_KEYS = [
          'worldr_citizen_file_v1',
          'worldr_selected_motherland',
          'worldr_living_world_entry_v1',
          'worldr_ledger_v1',
          'worldr_finance_history_v1',
          'worldr_companies_v1',
          'worldr_fleet_v1',
          'worldr_contracts_v1',
          'worldr_contract_history_v1',
          'worldr_business_offers_v1',
          'worldr_records_v1',
          'worldr_route_familiarity_v1'
        ];
        STATE_KEYS.forEach(k => localStorage.removeItem(k));
      }

      if (data.user && data.user.character) {
        localStorage.setItem('worldr_selected_motherland', data.user.character.motherland_country_id || 'drennia');
        localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(data.user.character));
      }

      setAuth(data.user, data.accessToken, data.refreshToken);
      // AuthLayout will handle the redirect via getFlowRedirectPath()
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create guest session. Please try again.');
    } finally {
      setGuestLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });

      // Wipe any stale game-state from a previous account on this device.
      // This guards against the case where the user didn't explicitly log out.
      if (typeof window !== 'undefined') {
        const STATE_KEYS = [
          'worldr_citizen_file_v1',
          'worldr_selected_motherland',
          'worldr_living_world_entry_v1',
          'worldr_ledger_v1',
          'worldr_finance_history_v1',
          'worldr_companies_v1',
          'worldr_fleet_v1',
          'worldr_contracts_v1',
          'worldr_contract_history_v1',
          'worldr_business_offers_v1',
          'worldr_records_v1',
          'worldr_route_familiarity_v1'
        ];
        STATE_KEYS.forEach(k => localStorage.removeItem(k));
      }

      const user = data.user;
      
      if (user && user.character) {
        localStorage.setItem('worldr_selected_motherland', user.character.motherland_country_id || 'drennia');
        localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(user.character));
      }

      setAuth(user, data.accessToken, data.refreshToken);

      if (!user.is_verified) {
        router.push(`/verify?email=${encodeURIComponent(user.email)}`);
      }
      // Otherwise AuthLayout will handle the redirect via getFlowRedirectPath()

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
          disabled={loading || !form.email.trim() || !form.password}
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

        {/* Guest Login Button */}
        <motion.button
          type="button"
          onClick={() => setShowGuestModal(true)}
          disabled={loading || guestLoading}
          className="w-full mt-3 py-3 px-4 rounded-lg border border-zinc-700/50 bg-zinc-800/30 hover:bg-zinc-800/80 hover:border-zinc-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 font-semibold text-sm tracking-wide flex items-center justify-center gap-2 shadow-sm"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {guestLoading ? (
            <>
              <motion.svg
                className="w-4 h-4 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </motion.svg>
              Starting Session...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Play as Guest
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

      {/* Guest Confirmation Modal */}
      <AnimatePresence>
        {showGuestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowGuestModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-700/50 rounded-xl p-6 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600" />
              <h3 className="text-lg font-bold text-zinc-100 mb-2">Play as Guest</h3>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                You are about to start a temporary session. Please note that <strong className="text-amber-400 font-semibold">your progress will not be saved permanently</strong> and may be lost if you clear your browser data or switch devices.
                <br /><br />
                For a permanent experience, we recommend creating an account.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowGuestModal(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-sm font-bold shadow-lg shadow-amber-500/20 transition-all"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
