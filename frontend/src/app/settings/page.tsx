'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/auth.store';
import { authApi, getRefreshToken } from '../../lib/api';
import TerminalPanel from '../../components/ui/TerminalPanel';
import StatusBadge from '../../components/ui/StatusBadge';

export default function SettingsPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch (err) {
        // Silently ignore logout API failure and clear store anyway
      }
    }
    logout();
    router.push('/login');
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="h-screen w-full bg-[#050508] text-zinc-300 overflow-y-auto overflow-x-hidden font-sans relative selection:bg-amber-500/20 selection:text-amber-400">
      
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] rounded-full bg-indigo-950/10 blur-[150px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-amber-950/5 blur-[150px]" />
        
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)',
          backgroundSize: '80px 80px'
        }} />
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-zinc-900 bg-zinc-950/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] rounded-sm">
              <span className="text-black font-black text-base">W</span>
            </div>
            <div>
              <span className="text-zinc-100 font-extrabold text-sm tracking-[0.2em] uppercase">WORLDr</span>
              <span className="text-amber-500/70 font-mono text-[8px] tracking-[0.25em] block uppercase">System Gateway</span>
            </div>
          </div>

          <button
            onClick={() => setConfirmLogout(true)}
            className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 hover:text-red-400 border border-zinc-800 hover:border-red-950 bg-zinc-900/30 hover:bg-red-950/20 px-4 py-1.5 transition-all"
          >
            SIGN OUT
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-xl mx-auto px-6 py-12 space-y-6">
        <div>
          <h1 className="text-amber-400 font-black text-xl uppercase tracking-widest">Settings</h1>
          <div className="text-zinc-600 text-[10px] uppercase font-mono mt-1">Identity & Secure Gateway Console</div>
        </div>

        {/* Account panel */}
        <TerminalPanel title="User Account">
          <div className="space-y-4 font-mono">
            <Row label="Username" value={user.username} />
            <Row label="Email Address" value={user.email} />
            <Row label="Display Name" value={user.display_name || '(not set)'} />
            <Row label="Security Classification" value={user.role} />
            
            <div className="flex justify-between items-center py-2.5 border-b border-zinc-900/50">
              <span className="text-zinc-500 text-xs uppercase tracking-wider">Verification Status</span>
              <StatusBadge
                label={user.is_verified ? 'VERIFIED' : 'UNVERIFIED'}
                variant={user.is_verified ? 'success' : 'warning'}
                dot
              />
            </div>
          </div>
        </TerminalPanel>

        {/* System status panel */}
        <TerminalPanel title="Gateway Infrastructure">
          <div className="space-y-2 text-[10px] font-mono text-zinc-500">
            <div className="flex justify-between py-1 border-b border-zinc-900/30">
              <span>Security System</span>
              <span className="text-emerald-400">JWT Token Rotation (Active)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-900/30">
              <span>Database Engine</span>
              <span className="text-emerald-400">Supabase PostgreSQL (Connected)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-zinc-900/30">
              <span>Email Courier</span>
              <span className="text-emerald-400">Brevo API over HTTPS (Online)</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Gateway Node</span>
              <span className="text-zinc-400">v1.0.0 Alpha</span>
            </div>
          </div>
        </TerminalPanel>

        {/* Session panel */}
        <TerminalPanel title="Session Management">
          {!confirmLogout ? (
            <button
              id="logout-btn"
              onClick={() => setConfirmLogout(true)}
              className="w-full text-center text-xs font-mono font-bold tracking-widest text-red-400 border border-red-950/50 hover:border-red-800 bg-red-950/20 hover:bg-red-950/40 py-2.5 transition-all"
            >
              TERMINATE SESSION
            </button>
          ) : (
            <div className="space-y-3 font-mono">
              <p className="text-zinc-400 text-xs leading-relaxed">
                Confirm termination of current session. Your local token signatures will be revoked.
              </p>
              <div className="flex gap-2">
                <button
                  id="confirm-logout-btn"
                  onClick={handleLogout}
                  className="flex-1 text-center text-xs font-bold tracking-widest text-black bg-red-500 hover:bg-red-400 py-2 transition-all"
                >
                  CONFIRM SIGN OUT
                </button>
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="flex-1 text-center text-xs font-bold tracking-widest text-zinc-400 border border-zinc-800 hover:border-zinc-700 py-2 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </TerminalPanel>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-zinc-900/50">
      <span className="text-zinc-500 text-xs uppercase tracking-wider">{label}</span>
      <span className="text-zinc-300 text-xs font-mono">{value}</span>
    </div>
  );
}
