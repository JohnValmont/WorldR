'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Globe, MessageSquare, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { chatApi, getAccessToken, type ChatMessage } from '../../lib/api';
import ChatContextMenu from './ChatContextMenu';

const POLL_INTERVAL_MS = 5000;
const MAX_LENGTH = 500;
const MAX_KEPT_MESSAGES = 200;

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GameChat() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'world' | 'private'>('world');
  
  // Channels
  const [worldMessages, setWorldMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<ChatMessage[]>([]);
  
  // Unread indicators
  const [unreadWorld, setUnreadWorld] = useState(0);
  const [unreadPrivate, setUnreadPrivate] = useState(0);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState(false);

  // Private DM Target
  const [dmTargetId, setDmTargetId] = useState<string | null>(null);
  const [dmTargetName, setDmTargetName] = useState<string | null>(null);

  // Context Menu
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, id: string, name: string } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  
  const lastWorldIdRef = useRef<number>(0);
  const lastPrivateIdRef = useRef<number>(0);

  const openRef = useRef(open);
  openRef.current = open;

  const tabRef = useRef(activeTab);
  tabRef.current = activeTab;

  useEffect(() => {
    setHasToken(!!getAccessToken());
  }, []);

  const appendWorldMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setWorldMessages(prev => {
      const seen = new Set(prev.map(m => m.id));
      const fresh = incoming.filter(m => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      const next = [...prev, ...fresh].slice(-MAX_KEPT_MESSAGES);
      lastWorldIdRef.current = next[next.length - 1].id;
      if (!openRef.current || tabRef.current !== 'world') setUnreadWorld(u => u + fresh.length);
      return next;
    });
  }, []);

  const appendPrivateMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setPrivateMessages(prev => {
      const seen = new Set(prev.map(m => m.id));
      const fresh = incoming.filter(m => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      const next = [...prev, ...fresh].slice(-MAX_KEPT_MESSAGES);
      lastPrivateIdRef.current = next[next.length - 1].id;
      if (!openRef.current || tabRef.current !== 'private') setUnreadPrivate(u => u + fresh.length);
      return next;
    });
  }, []);

  // Poll for messages
  useEffect(() => {
    if (!hasToken) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const [worldData, privateData] = await Promise.all([
          chatApi.getMessages('world', lastWorldIdRef.current || undefined),
          chatApi.getMessages('private', lastPrivateIdRef.current || undefined)
        ]);
        if (!cancelled) {
          appendWorldMessages(worldData.messages);
          appendPrivateMessages(privateData.messages);
        }
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
  }, [hasToken, appendWorldMessages, appendPrivateMessages]);

  // Auto-scroll
  const currentMessages = activeTab === 'world' ? worldMessages : privateMessages;
  useEffect(() => {
    if (open && !minimized && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [currentMessages, open, minimized, activeTab]);

  useEffect(() => {
    if (open && !minimized) {
      if (activeTab === 'world') setUnreadWorld(0);
      if (activeTab === 'private') setUnreadPrivate(0);
    }
  }, [open, minimized, activeTab]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      if (activeTab === 'private' && !dmTargetId) {
        setError("Click a user's name in World chat to start a private message.");
        setSending(false);
        return;
      }
      
      const data = await chatApi.sendMessage(body, activeTab, activeTab === 'private' ? dmTargetId! : undefined);
      setDraft('');
      
      if (activeTab === 'world') {
        appendWorldMessages([data.message]);
      } else {
        appendPrivateMessages([data.message]);
      }
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) setError('Create a character to chat.');
      else if (status === 429) setError('Slow down — sending too fast.');
      else setError(e?.response?.data?.message || 'Could not send. Try again.');
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

  const handleUserClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, id, name });
  };

  const startDm = (id: string, name: string) => {
    setActiveTab('private');
    setDmTargetId(id);
    setDmTargetName(name);
    if (minimized) setMinimized(false);
  };

  if (!hasToken) return null;

  const totalUnread = unreadWorld + unreadPrivate;

  return (
    <>
      <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', pointerEvents: 'none' }}>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              drag
              dragMomentum={false}
              dragConstraints={{ left: -window.innerWidth + 350, right: 0, top: -window.innerHeight + 500, bottom: 0 }}
              style={{
                width: 350,
                height: minimized ? 44 : 480,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(13, 15, 22, 0.95)',
                backdropFilter: 'blur(12px)',
                border: '1px solid #23273A',
                borderRadius: 12,
                marginBottom: 16,
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0,0,0,0.8)',
                pointerEvents: 'auto',
                position: 'relative'
              }}
            >
              {/* Draggable Header */}
              <div 
                className="chat-drag-handle"
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                  padding: '10px 14px', borderBottom: '1px solid #23273A', background: '#11141F',
                  cursor: 'grab'
                }}
                onPointerDown={(e) => { (e.target as HTMLElement).style.cursor = 'grabbing'; }}
                onPointerUp={(e) => { (e.target as HTMLElement).style.cursor = 'grab'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageCircle size={14} color="#7FB4FF" />
                  <span style={{ color: '#E8EAF2', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em' }}>COMMS LINK</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setMinimized(!minimized)} style={{ background: 'none', border: 'none', color: '#8B90A8', cursor: 'pointer', padding: 0 }}>
                    {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                  </button>
                  <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#8B90A8', cursor: 'pointer', padding: 0 }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {!minimized && (
                <>
                  {/* Tabs */}
                  <div style={{ display: 'flex', background: '#090A0F', borderBottom: '1px solid #23273A' }}>
                    <button
                      onClick={() => setActiveTab('world')}
                      style={{
                        flex: 1, padding: '10px', border: 'none', background: activeTab === 'world' ? '#1A1E2E' : 'transparent',
                        color: activeTab === 'world' ? '#E8EAF2' : '#8B90A8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative'
                      }}
                    >
                      <Globe size={14} /> WORLD
                      {unreadWorld > 0 && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#FF4D4D', position: 'absolute', top: 10, right: 24 }} />}
                    </button>
                    <button
                      onClick={() => setActiveTab('private')}
                      style={{
                        flex: 1, padding: '10px', border: 'none', background: activeTab === 'private' ? '#1A1E2E' : 'transparent',
                        color: activeTab === 'private' ? '#E8EAF2' : '#8B90A8', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative'
                      }}
                    >
                      <MessageSquare size={14} /> PRIVATE
                      {unreadPrivate > 0 && <span style={{ width: 6, height: 6, borderRadius: 3, background: '#FF4D4D', position: 'absolute', top: 10, right: 20 }} />}
                    </button>
                  </div>

                  {/* Private DM Target Banner */}
                  {activeTab === 'private' && dmTargetName && (
                    <div style={{ padding: '6px 12px', background: '#2E5CFF1A', borderBottom: '1px solid #2E5CFF33', color: '#7FB4FF', fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Sending to: <strong>{dmTargetName}</strong></span>
                      <button onClick={() => { setDmTargetId(null); setDmTargetName(null); }} style={{ background: 'none', border: 'none', color: '#7FB4FF', cursor: 'pointer', fontSize: 10 }}>[CLEAR]</button>
                    </div>
                  )}

                  {/* Messages */}
                  <div ref={listRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {currentMessages.length === 0 ? (
                      <p style={{ color: '#5A5F76', fontSize: 13, textAlign: 'center', marginTop: 32 }}>
                        {activeTab === 'world' ? 'No messages in World chat.' : 'No private messages. Click a name in World chat to start a conversation.'}
                      </p>
                    ) : (
                      currentMessages.map(m => (
                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                            <span 
                              onClick={(e) => handleUserClick(e, m.character_id, m.character_name)}
                              style={{ color: '#F4CF82', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                              className="hover:underline"
                            >
                              {m.character_name}
                            </span>
                            {activeTab === 'private' && m.target_character_name && (
                              <>
                                <span style={{ color: '#5A5F76', fontSize: 10 }}>▶</span>
                                <span style={{ color: '#7FB4FF', fontSize: 12, fontWeight: 600 }}>{m.target_character_name}</span>
                              </>
                            )}
                            <span style={{ color: '#5A5F76', fontSize: 10 }}>{formatTime(m.created_at)}</span>
                          </div>
                          <p style={{ color: '#E8EAF2', fontSize: 13, lineHeight: 1.45, margin: 0, wordBreak: 'break-word' }}>{m.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Error */}
                  {error && (
                    <p style={{ color: '#FF7A7A', fontSize: 11, margin: 0, padding: '6px 12px', background: '#2A1418' }}>{error}</p>
                  )}

                  {/* Input */}
                  <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid #23273A', background: '#090A0F' }}>
                    <input
                      type="text"
                      value={draft}
                      maxLength={MAX_LENGTH}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={onKeyDown}
                      placeholder={activeTab === 'private' && !dmTargetId ? "Select a user to DM..." : "Secure transmission..."}
                      disabled={activeTab === 'private' && !dmTargetId}
                      style={{
                        flex: 1, background: '#11141F', border: '1px solid #23273A', borderRadius: 6,
                        color: '#E8EAF2', fontSize: 13, padding: '8px 12px', outline: 'none'
                      }}
                    />
                    <button
                      onClick={send}
                      disabled={sending || !draft.trim() || (activeTab === 'private' && !dmTargetId)}
                      style={{
                        background: (draft.trim() && !sending && (activeTab !== 'private' || dmTargetId)) ? '#2E5CFF' : '#1A1E2E',
                        border: 'none', borderRadius: 6,
                        color: (draft.trim() && !sending && (activeTab !== 'private' || dmTargetId)) ? '#FFFFFF' : '#5A5F76',
                        cursor: (draft.trim() && !sending && (activeTab !== 'private' || dmTargetId)) ? 'pointer' : 'default',
                        padding: '0 12px', display: 'flex', alignItems: 'center', transition: 'background 0.2s'
                      }}
                    >
                      <Send size={15} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle button */}
        <button
          onClick={() => { setOpen(o => !o); setMinimized(false); }}
          style={{
            position: 'relative', width: 52, height: 52, borderRadius: 26, background: '#2E5CFF',
            border: 'none', color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(46,92,255,0.4)', pointerEvents: 'auto'
          }}
        >
          <MessageCircle size={24} />
          {totalUnread > 0 && !open && (
            <span
              style={{
                position: 'absolute', top: -2, right: -2, minWidth: 20, height: 20, borderRadius: 10,
                background: '#FF4D4D', color: '#FFFFFF', fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
                border: '2px solid #090A0F'
              }}
            >
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
      </div>

      {contextMenu && (
        <ChatContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetCharacterId={contextMenu.id}
          targetCharacterName={contextMenu.name}
          onClose={() => setContextMenu(null)}
          onDirectMessage={startDm}
          onViewProfile={(id) => { alert(`Viewing profile for ${id}`); }}
        />
      )}
    </>
  );
}
