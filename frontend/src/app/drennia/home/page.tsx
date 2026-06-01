'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { livingWorldTheme as theme } from '../../../styles/livingWorldTheme';
import PersonalDossierPanel from '../../../components/living-world/PersonalDossierPanel';
import OpportunityPreviewPanel from '../../../components/living-world/OpportunityPreviewPanel';
import WorldPulsePanel from '../../../components/living-world/WorldPulsePanel';
import RecordsStrip from '../../../components/living-world/RecordsStrip';

function DeleteCharacterModal({ onClose, onRestartCharacter, onRestartMotherland }: { onClose: () => void, onRestartCharacter: () => void, onRestartMotherland: () => void }) {
  const [input, setInput] = useState('');
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-sm rounded-sm p-6 flex flex-col gap-4" style={{ background: 'rgba(12,12,24,0.98)', border: '1px solid rgba(239,68,68,0.28)', boxShadow: '0 0 40px rgba(239,68,68,0.12), 0 20px 60px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
          </div>
          <div>
            <div className="text-white font-bold text-sm">Delete Character?</div>
            <div className="text-zinc-500 text-[10px] font-mono mt-0.5">This cannot be undone locally.</div>
          </div>
        </div>

        <div className="rounded-sm p-3 text-[10px] font-mono text-zinc-500 leading-relaxed" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)' }}>
          To confirm deletion, type <strong>RESTART</strong> below.
        </div>

        <input 
          type="text" 
          placeholder="RESTART"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-sm px-4 py-2.5 text-sm font-sans outline-none bg-black/30 border border-white/[0.07] text-white focus:border-red-500/70 focus:ring-1 focus:ring-red-500/15 uppercase placeholder:normal-case"
        />

        <div className="flex flex-col gap-2 pt-1 mt-2 border-t border-white/10">
          <button
            type="button"
            disabled={input.trim().toUpperCase() !== 'RESTART'}
            onClick={onRestartCharacter}
            className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all duration-150 disabled:opacity-40"
            style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(245,158,11,0.40)', color: '#fbbf24' }}
          >
            Restart Character Only
          </button>
          
          <button
            type="button"
            disabled={input.trim().toUpperCase() !== 'RESTART'}
            onClick={onRestartMotherland}
            className="w-full py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-sm transition-all duration-150 disabled:opacity-40"
            style={{ background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.40)', color: '#f87171' }}
          >
            Restart From Motherland Selection
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 py-2.5 text-[10px] font-semibold uppercase tracking-widest rounded-sm transition-all duration-150"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#a1a1aa' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DrenniaHomePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
      const entered = localStorage.getItem('worldr_living_world_entry_v1') === 'true';
      const fileStr = localStorage.getItem('worldr_citizen_file_v1');
      
      if (!granted) {
        router.replace('/pre-alpha-access');
      } else if (!fileStr || !entered) {
        router.replace('/start/character');
      } else {
        setAuthorized(true);
      }
    }
  }, [router]);

  const handleRestartCharacter = () => {
    localStorage.removeItem('worldr_citizen_file_v1');
    localStorage.removeItem('worldr_living_world_entry_v1');
    router.push('/start/character');
  };

  const handleRestartMotherland = () => {
    localStorage.removeItem('worldr_citizen_file_v1');
    localStorage.removeItem('worldr_living_world_entry_v1');
    localStorage.removeItem('worldr_selected_continent');
    localStorage.removeItem('worldr_selected_motherland');
    router.push('/world-entry');
  };

  if (!authorized) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col pb-12">
      {showDeleteModal && (
        <DeleteCharacterModal 
          onClose={() => setShowDeleteModal(false)}
          onRestartCharacter={handleRestartCharacter}
          onRestartMotherland={handleRestartMotherland}
        />
      )}

      <div className="mb-[18px] flex justify-between items-start">
        <div>
          <h1 className="tracking-tight" style={{ fontSize: '28px', fontWeight: 700, color: theme.colors.text.textPrimary, marginBottom: '4px' }}>
            Drennia Life Desk
          </h1>
          <p style={{ fontSize: '14px', color: theme.colors.text.textSecondary }}>
            Your first view of Drennia’s living world — your identity, first opportunities, records, and the country around you.
          </p>
        </div>
        
        <button 
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-red-400 hover:bg-red-500/10 rounded-sm border border-red-500/20 transition-all"
        >
          Delete Character
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)_360px] gap-[18px] items-start">
        <div className="order-1">
          <PersonalDossierPanel />
        </div>
        <div className="order-2">
          <OpportunityPreviewPanel />
        </div>
        <div className="order-3">
          <WorldPulsePanel />
        </div>
      </div>

      <RecordsStrip />
    </div>
  );
}
