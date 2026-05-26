'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/auth.store';
import { authApi, getRefreshToken } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatusBadge from '../../../components/ui/StatusBadge';

const IDEOLOGIES: Record<string, string> = {
  far_left: 'Far Left', left: 'Left', centre_left: 'Centre Left', centrist: 'Centrist',
  centre_right: 'Centre Right', right: 'Right', far_right: 'Far Right',
  libertarian: 'Libertarian', green: 'Green', nationalist: 'Nationalist'
};

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { }
    }
    logout();
    router.push('/login');
  };

  return (
    <div className="space-y-4 animate-fade-in-up max-w-xl">
      <div>
        <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">Settings</h1>
        <div className="text-zinc-600 text-[10px]">Account and profile configuration</div>
      </div>

      {/* Account info */}
      <TerminalPanel title="Account">
        <div className="space-y-3">
          <Row label="Username" value={user?.username || '—'} />
          <Row label="Email" value={user?.email || '—'} />
          <Row label="Display Name" value={user?.display_name || '(not set)'} />
          <Row label="Role" value={user?.role || '—'} />
          <div className="flex justify-between items-center py-2 border-b border-zinc-900">
            <span className="text-zinc-500 text-xs">Email Verified</span>
            <StatusBadge label={user?.is_verified ? 'VERIFIED' : 'UNVERIFIED'} variant={user?.is_verified ? 'success' : 'warning'} dot />
          </div>
        </div>
      </TerminalPanel>

      {/* Political profile */}
      <TerminalPanel title="Political Profile">
        <div className="space-y-3">
          <Row label="Nation" value="Keldoria" />
          <Row label="Nation ID" value={user?.nation_id ? `${user.nation_id.slice(0, 8)}...` : '—'} />
        </div>
      </TerminalPanel>

      {/* Alpha info */}
      <TerminalPanel title="System Info">
        <div className="space-y-2 text-[10px] font-mono text-zinc-500">
          <div className="flex justify-between"><span>Version</span><span className="text-zinc-400">Alpha v0.1</span></div>
          <div className="flex justify-between"><span>Simulation Engine</span><span className="text-zinc-400">v1.0.0</span></div>
          <div className="flex justify-between"><span>Election System</span><span className="text-zinc-400">D'Hondt PR</span></div>
          <div className="flex justify-between"><span>Parliament Size</span><span className="text-zinc-400">450 seats</span></div>
          <div className="flex justify-between"><span>Election Cycle</span><span className="text-zinc-400">48 months</span></div>
          <div className="flex justify-between"><span>Nation</span><span className="text-zinc-400">Keldoria (single-nation alpha)</span></div>
        </div>
      </TerminalPanel>

      {/* Logout */}
      <TerminalPanel title="Session">
        {!confirmLogout ? (
          <button
            id="logout-btn"
            onClick={() => setConfirmLogout(true)}
            className="btn-danger w-full"
          >
            SIGN OUT
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-zinc-400 text-xs mb-2">Are you sure you want to end your governance session?</p>
            <div className="flex gap-2">
              <button onClick={handleLogout} className="btn-danger flex-1" id="confirm-logout-btn">
                CONFIRM SIGN OUT
              </button>
              <button onClick={() => setConfirmLogout(false)} className="btn-secondary flex-1">
                CANCEL
              </button>
            </div>
          </div>
        )}
      </TerminalPanel>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-zinc-900">
      <span className="text-zinc-500 text-xs">{label}</span>
      <span className="text-zinc-300 text-xs font-mono">{value}</span>
    </div>
  );
}
