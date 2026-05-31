'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StartLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
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
      <div className="min-h-screen bg-[#111311] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
