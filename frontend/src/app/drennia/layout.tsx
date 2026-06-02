'use client';
// FROZEN POLITICS PROTOTYPE — preserve for later politics module. Do not use as active post-login core.
// Redirects to /drennia/chronicle (Business-First Chronicle).
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DrenniaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1');
    const hasMotherland = !!localStorage.getItem('worldr_selected_motherland');
    const hasCitizenFile = !!localStorage.getItem('worldr_citizen_file_v1');
    const hasEntry = localStorage.getItem('worldr_living_world_entry_v1') === 'true';

    if (granted !== 'true') {
      router.replace('/pre-alpha-access');
    } else if (!hasMotherland) {
      router.replace('/world-entry');
    } else if (!hasCitizenFile || !hasEntry) {
      router.replace('/start/character');
    }
    // else: authorized — let child page render
  }, [router]);

  return <>{children}</>;
}
