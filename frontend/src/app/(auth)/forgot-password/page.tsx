'use client';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Stub — password reset requires email service
    setSent(true);
  };

  return (
    <div className="border border-zinc-800 bg-zinc-950 p-6 animate-fade-in-up">
      <div className="mb-5">
        <h1 className="text-zinc-100 font-bold text-sm uppercase tracking-wider">Forgot Password</h1>
        <p className="text-zinc-600 text-xs mt-1">Enter your email to receive a reset link.</p>
      </div>

      {sent ? (
        <div className="bg-emerald-950/30 border border-emerald-900 text-emerald-400 text-xs p-3 font-mono">
          ✓ If an account exists for <strong>{email}</strong>, a reset link will be sent shortly.
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
          <button type="submit" className="btn-primary w-full">SEND RESET LINK</button>
        </form>
      )}

      <div className="text-center mt-4">
        <Link href="/login" className="text-[10px] text-zinc-600 hover:text-zinc-400">← Back to login</Link>
      </div>
    </div>
  );
}
