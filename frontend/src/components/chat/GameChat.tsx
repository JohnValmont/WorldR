'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { chatApi, getAccessToken, type ChatMessage } from '../../lib/api';

const POLL_INTERVAL_MS = 5000;
const MAX_LENGTH = 500;
const MAX_KEPT_MESSAGES = 200;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GameChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [hasToken, setHasToken] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number>(0);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    setHasToken(!!getAccessToken());
  }, []);

  const appendMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages(prev => {
      const seen = new Set(prev.map(m => m.id));
      const fresh = incoming.filter(m => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      const next = [...prev, ...fresh].slice(-MAX_KEPT_MESSAGES);
      lastIdRef.current = next[next.length - 1].id;
      if (!openRef.current) setUnread(u => u + fresh.length);
      return next;
    });
  }, []);

  // Poll for messages
  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await chatApi.getMessages(lastIdRef.current || undefined);
        if (!cancelled) appendMessages(data.messages);
      } catch {
        // silent — retry on next poll
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [hasToken, appendMessages]);

  // Auto-scroll to bottom when messages change while open
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const data = await chatApi.sendMessage(body);
      setDraft('');
      appendMessages([data.message]);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) setError('Create a character to chat.');
      else if (status === 429) setError('Slow down — sending too fast.');
      else setError('Could not send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      send();
    }
  };

  if (!hasToken) return null;

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      {open && (
        <div
          style={{
            width: 320,
            height: 420,
            maxWidth: 'calc(100vw - 32px)',
            display: 'flex',
            flexDirection: 'column',
            background: '#0D0F16',
            border: '1px solid #23273A',
            borderRadius: 12,
            marginBottom: 10,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #23273A', background: '#11141F' }}>
            <span style={{ color: '#E8EAF2', fontSize: 14, fontWeight: 600 }}>World Chat</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{ background: 'none', border: 'none', color: '#8B90A8', cursor: 'pointer', padding: 4, display: 'flex' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {messages.length === 0 ? (
              <p style={{ color: '#5A5F76', fontSize: 13, textAlign: 'center', marginTop: 24 }}>No messages yet. Say hello!</p>
            ) : (
              messages.map(m => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ color: '#7FB4FF', fontSize: 12, fontWeight: 600 }}>{m.character_name}</span>
                    <span style={{ color: '#5A5F76', fontSize: 10 }}>{formatTime(m.created_at)}</span>
                  </div>
                  <p style={{ color: '#C9CCDA', fontSize: 13, lineHeight: 1.45, margin: 0, wordBreak: 'break-word' }}>{m.body}</p>
                </div>
              ))
            )}
          </div>

          {/* Error */}
          {error && (
            <p style={{ color: '#FF7A7A', fontSize: 11, margin: 0, padding: '4px 12px' }}>{error}</p>
          )}

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, padding: 10, borderTop: '1px solid #23273A', background: '#11141F' }}>
            <input
              type="text"
              value={draft}
              maxLength={MAX_LENGTH}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message..."
              aria-label="Chat message"
              style={{
                flex: 1,
                background: '#0D0F16',
                border: '1px solid #23273A',
                borderRadius: 8,
                color: '#E8EAF2',
                fontSize: 13,
                padding: '8px 10px',
                outline: 'none'
              }}
            />
            <button
              onClick={send}
              disabled={sending || !draft.trim()}
              aria-label="Send message"
              style={{
                background: draft.trim() && !sending ? '#2E5CFF' : '#1A1E2E',
                border: 'none',
                borderRadius: 8,
                color: draft.trim() && !sending ? '#FFFFFF' : '#5A5F76',
                cursor: draft.trim() && !sending ? 'pointer' : 'default',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat' : 'Open chat'}
        style={{
          position: 'relative',
          width: 48,
          height: 48,
          borderRadius: 24,
          background: '#2E5CFF',
          border: 'none',
          color: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(46,92,255,0.4)'
        }}
      >
        <MessageCircle size={22} />
        {unread > 0 && !open && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              background: '#FF4D4D',
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px'
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
