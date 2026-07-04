'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, X, Check, Trash2,
  Briefcase, FileText, TrendingUp, ScrollText, Globe, Settings, type LucideIcon,
} from 'lucide-react';
import {
  getNotifications, getUnreadCount, subscribeNotifications,
  markAllRead, markRead, clearNotifications, relativeTime,
  type GameNotification, type NotificationCategory,
} from '../../lib/notifications';

// ── Per-category presentation ──────────────────────────────────────────────
const CATEGORY_META: Record<NotificationCategory, { label: string; icon: LucideIcon; color: string }> = {
  business: { label: 'BUSINESS',  icon: Briefcase,  color: '#ff9f0a' },
  contract: { label: 'CONTRACT',  icon: FileText,   color: '#0a84ff' },
  market:   { label: 'MARKET',    icon: TrendingUp, color: '#30d158' },
  record:   { label: 'RECORD',    icon: ScrollText, color: '#a1a1aa' },
  world:    { label: 'WORLD',     icon: Globe,      color: '#c9a24a' },
  system:   { label: 'SYSTEM',    icon: Settings,   color: '#71717a' },
};

export default function NotificationBell() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<GameNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    setItems(getNotifications());
    setUnread(getUnreadCount());
  }, []);

  // Mount + subscribe to feed changes (same-tab + cross-tab).
  useEffect(() => {
    setMounted(true);
    refresh();
    const unsub = subscribeNotifications(refresh);
    return unsub;
  }, [refresh]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    setOpen((v) => {
      const next = !v;
      if (next && getUnreadCount() > 0) {
        // Opening the panel clears the badge; individual read state persists.
        setTimeout(() => { markAllRead(); }, 1200);
      }
      return next;
    });
  };

  const handleItemClick = (n: GameNotification) => {
    markRead(n.id);
    if (n.href) {
      setOpen(false);
      router.push(n.href);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      {/* Bell trigger */}
      <button
        type="button"
        onClick={toggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-terminal-amber hover:bg-white/5 transition-colors"
      >
        <Bell size={16} />
        {mounted && unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 flex items-center justify-center rounded-full bg-terminal-red text-white text-[9px] font-mono font-bold leading-none shadow-red-glow">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 sm:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Panel: full-width sheet on mobile, anchored dropdown on sm+ */}
          <div
            className="animate-slide-in z-50 flex flex-col border border-[#23232b] bg-[#0c0d13] shadow-card
                       fixed inset-x-2 top-14 max-h-[75vh] rounded-xl
                       sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-[380px] sm:max-h-[70vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#23232b] shrink-0">
              <div className="flex items-center gap-2">
                <Bell size={12} className="text-terminal-amber opacity-80" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-terminal-amber">
                  Notifications
                </span>
                {unread > 0 && (
                  <span className="text-[9px] font-mono text-zinc-500">{unread} new</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {items.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => markAllRead()}
                      title="Day all read"
                      className="flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-mono uppercase tracking-wider text-zinc-500 hover:text-terminal-green transition-colors"
                    >
                      <Check size={11} /> Read
                    </button>
                    <button
                      type="button"
                      onClick={() => clearNotifications()}
                      title="Clear all"
                      className="flex items-center gap-1 px-1.5 py-1 rounded text-[9px] font-mono uppercase tracking-wider text-zinc-500 hover:text-terminal-red transition-colors"
                    >
                      <Trash2 size={11} /> Clear
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors sm:hidden"
                  aria-label="Close notifications"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Feed */}
            <div className="overflow-y-auto scrollbar-hide divide-y divide-[#1c1c24]">
              {items.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <Bell size={20} className="mx-auto mb-2 text-zinc-700" />
                  <div className="text-[12px] text-zinc-500">You're all caught up.</div>
                  <div className="text-[10px] text-zinc-600 mt-1">
                    New movements in Drennia will appear here.
                  </div>
                </div>
              )}

              {items.map((n) => {
                const meta = CATEGORY_META[n.category] ?? CATEGORY_META.system;
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]
                                ${n.href ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="shrink-0 pt-0.5">
                      <span
                        className="flex items-center justify-center w-7 h-7 rounded-lg border"
                        style={{ color: meta.color, borderColor: `${meta.color}44`, background: `${meta.color}12` }}
                      >
                        <Icon size={13} />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[8px] font-mono uppercase tracking-[0.15em]"
                          style={{ color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-terminal-amber shrink-0" />
                        )}
                      </div>
                      <div className={`text-[12px] leading-snug mt-0.5 ${n.read ? 'text-zinc-400' : 'text-zinc-100 font-medium'}`}>
                        {n.title}
                      </div>
                      {n.body && (
                        <div className="text-[11px] text-zinc-500 leading-snug mt-0.5 line-clamp-2">
                          {n.body}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-zinc-600">
                        <span>{relativeTime(n.createdAt)}</span>
                        {n.gameDate && (
                          <>
                            <span className="text-zinc-700">·</span>
                            <span className="uppercase tracking-wider">{n.gameDate}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
