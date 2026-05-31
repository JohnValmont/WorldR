'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FEATURES } from '../../config/features';

export default function VareliaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!FEATURES.LEGACY_DRENNIA_FRONTEND_ENABLED) {
      router.replace('/world-locked');
    }
  }, [router]);

  // Prevent old UI flashing while the client-side redirect happens
  if (!FEATURES.LEGACY_DRENNIA_FRONTEND_ENABLED) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#11140f]">
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
