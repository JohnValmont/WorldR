'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DrenniaMapSvg from '../../../components/maps/DrenniaMapSvg';

export default function WorldPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  return (
    <div className="w-full flex flex-col h-full overflow-hidden text-white">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold" style={{ color: '#F4EBD6' }}>World Map</h1>
        <p className="text-[12px] mt-1" style={{ color: '#B9B09B' }}>
          Drennia's sovereign states, institutions, and geographic boundaries.
        </p>
      </div>

      <div className="flex-1 w-full h-full p-4">
        <div className="w-full h-full rounded-sm overflow-hidden relative" style={{ background: 'rgba(12,18,14,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <DrenniaMapSvg
            selectedState={null}
            onStateSelect={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
