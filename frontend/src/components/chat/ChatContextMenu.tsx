'use client';

import React from 'react';
import { MessageSquare, User, ShieldAlert } from 'lucide-react';

interface ChatContextMenuProps {
  x: number;
  y: number;
  targetCharacterId: string;
  targetCharacterName: string;
  onClose: () => void;
  onDirectMessage: (id: string, name: string) => void;
  onViewProfile: (id: string) => void;
}

export default function ChatContextMenu({
  x, y, targetCharacterId, targetCharacterName, onClose, onDirectMessage, onViewProfile
}: ChatContextMenuProps) {
  return (
    <>
      <div 
        style={{ position: 'fixed', inset: 0, zIndex: 99998 }} 
        onClick={onClose} 
      />
      <div
        style={{
          position: 'fixed',
          left: Math.min(x, window.innerWidth - 180),
          top: Math.min(y, window.innerHeight - 150),
          width: 160,
          background: '#11141F',
          border: '1px solid #2E5CFF',
          borderRadius: 8,
          zIndex: 99999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #23273A', background: '#090A0F' }}>
          <span style={{ color: '#E8EAF2', fontSize: 12, fontWeight: 700, display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {targetCharacterName}
          </span>
        </div>
        
        <button
          onClick={() => { onDirectMessage(targetCharacterId, targetCharacterName); onClose(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'transparent', border: 'none', color: '#C9CCDA', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #23273A' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#1A1E2E'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <MessageSquare size={14} color="#7FB4FF" /> Direct Message
        </button>

        <button
          onClick={() => { onViewProfile(targetCharacterId); onClose(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'transparent', border: 'none', color: '#C9CCDA', fontSize: 12, cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #23273A' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#1A1E2E'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <User size={14} color="#F4CF82" /> View Profile
        </button>

        <button
          onClick={() => { alert(`Blocked ${targetCharacterName}`); onClose(); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'transparent', border: 'none', color: '#FF7A7A', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#2A1418'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <ShieldAlert size={14} /> Block User
        </button>
      </div>
    </>
  );
}
