'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LivingWorldShell from '../../components/living-world/LivingWorldShell';

export default function DrenniaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1');
      const hasMotherland = !!localStorage.getItem('worldr_selected_motherland');
      const hasCitizenFile = !!localStorage.getItem('worldr_citizen_file_v1');

      if (granted !== 'true') {
        router.replace('/pre-alpha-access');
      } else if (!hasMotherland) {
        router.replace('/world-entry');
      } else if (!hasCitizenFile) {
        router.replace('/start/citizen-file');
      } else {
        setAuthorized(true);
      }
    }
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#07100D] flex items-center justify-center">
        <div className="text-[#D6B35F] text-xs font-mono uppercase tracking-widest animate-pulse">
          Verifying Clearance...
        </div>
      </div>
    );
  }

  return <LivingWorldShell>{children}</LivingWorldShell>;
}
