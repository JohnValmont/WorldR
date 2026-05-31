'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import WorldEntryHeader from '../../components/world-entry/WorldEntryHeader';
import ContinentRegistryPanel from '../../components/world-entry/ContinentRegistryPanel';
import NationSelectionBoard from '../../components/world-entry/NationSelectionBoard';
import MotherlandDossierPanel from '../../components/world-entry/MotherlandDossierPanel';

export default function WorldEntryPage() {
  const router = useRouter();
  const [selectedNation, setSelectedNation] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1');
      if (granted === 'true') {
        setAuthorized(true);
      } else {
        router.replace('/pre-alpha-access');
      }
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07100D]">
        <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen w-full relative overflow-x-hidden"
      style={{
        backgroundColor: '#07100D',
        backgroundImage: 'radial-gradient(circle at 50% -20%, rgba(35, 60, 48, 0.4) 0%, rgba(7, 16, 13, 0) 50%)',
      }}
    >
      <div className="max-w-[1560px] mx-auto p-4 sm:p-7 z-10 relative">
        <WorldEntryHeader />

        <div className="flex flex-col lg:grid lg:grid-cols-[280px_minmax(0,1fr)_420px] gap-[22px]">
          
          {/* Left Column */}
          <div className="w-full">
            <ContinentRegistryPanel />
          </div>

          {/* Center Column */}
          <div className="w-full">
            <NationSelectionBoard 
              selectedNation={selectedNation} 
              onSelectNation={setSelectedNation} 
            />
          </div>

          {/* Right Column */}
          <div className="w-full">
            <MotherlandDossierPanel selectedNation={selectedNation} />
          </div>

        </div>
      </div>
    </div>
  );
}
