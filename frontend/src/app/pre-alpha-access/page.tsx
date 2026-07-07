'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getFlowRedirectPath } from '../../lib/flow';

export default function PreAlphaAccessPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      router.replace(getFlowRedirectPath());
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#11131A] flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
    </div>
  );
}
