'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RoomsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/drennia/home');
  }, [router]);
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-[10px] font-mono uppercase tracking-widest animate-pulse" style={{ color: '#D6B35F' }}>
        Opening Live Map…
      </div>
    </div>
  );
}
