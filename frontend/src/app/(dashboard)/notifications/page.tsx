'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { notificationsApi } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatusBadge from '../../../components/ui/StatusBadge';
import { Notification } from '../../../types/game';

const TYPE_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  success: 'success', warning: 'warning', danger: 'danger', info: 'info'
};

const CAT_ICONS: Record<string, string> = {
  economy: '📈', politics: '🏛️', law: '⚖️', election: '🗳️',
  party: '🎯', crisis: '⚡', tick: '⏱️', system: '⚙️'
};

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = () => {
    notificationsApi.get(100)
      .then(r => setNotifications(r.data.notifications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">Notifications</h1>
          <div className="text-zinc-600 text-[10px]">{unreadCount} unread alerts</div>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn-ghost">
              Mark All Read
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 mb-2">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors ${filter === f ? 'border-amber-500 text-amber-400 bg-amber-950/20' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
            {f} ({f === 'all' ? notifications.length : unreadCount})
          </button>
        ))}
      </div>

      <TerminalPanel title="Alert Feed" subtitle={`${filtered.length} notifications`}>
        {loading ? (
          <div className="text-zinc-600 text-xs text-center py-8">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-zinc-600 text-xs text-center py-8">
            {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet. Advance months to generate alerts.'}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(n => (
              <div
                key={n.id}
                className={`p-3 border transition-colors cursor-pointer hover:border-zinc-700 ${
                  n.is_read ? 'border-zinc-900 opacity-60' : 'border-zinc-800'
                }`}
                onClick={() => !n.is_read && handleMarkRead(n.id)}
              >
                <div className="flex items-start gap-2">
                  <span className="text-base shrink-0 mt-0.5">{CAT_ICONS[n.category] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <StatusBadge label={n.type.toUpperCase()} variant={TYPE_VARIANT[n.type] || 'info'} />
                      <span className={`text-xs font-bold ${n.is_read ? 'text-zinc-400' : 'text-zinc-200'}`}>
                        {n.title}
                      </span>
                      {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
                    </div>
                    <p className="text-zinc-500 text-[10px] leading-relaxed">{n.message}</p>
                    <span className="text-zinc-700 text-[9px] mt-1 block">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TerminalPanel>
    </div>
  );
}
