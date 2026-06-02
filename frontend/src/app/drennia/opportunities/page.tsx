'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OpportunitiesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/drennia/home');
  }, [router]);
  return (
    <div className="w-full py-24 flex flex-col items-center justify-center gap-4">
      <div className="text-[9px] font-mono uppercase tracking-[0.25em] animate-pulse" style={{ color: '#D6B35F' }}>
        Life Moves are now handled through Power Rooms
      </div>
      <div className="text-[10px] font-mono" style={{ color: '#3f4b47' }}>
        Redirecting to Drennia Live Map…
      </div>
    </div>
  );
}
