'use client';
// FROZEN POLITICS PROTOTYPE — preserve for later politics module. Do not use as active post-login core.
// Redirects to /drennia/chronicle (Business-First Chronicle).
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackBar from '../../components/ui/BackBar';
import GameChat from '../../components/chat/GameChat';

export default function DrenniaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasMotherland = !!localStorage.getItem('worldr_selected_motherland');
    const hasCitizenFile = !!localStorage.getItem('worldr_citizen_file_v1');
    const hasEntry = localStorage.getItem('worldr_living_world_entry_v1') === 'true';

    if (!hasMotherland) {
      router.replace('/world-entry');
    } else if (!hasCitizenFile || !hasEntry) {
      router.replace('/landing/onboarding.html?action=character');
    }
    // else: authorized — let child page render
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#090A0F', width: '100%' }}>
      <BackBar />
      {children}
      <GameChat />
    </div>
  );
}

