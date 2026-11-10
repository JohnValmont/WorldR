'use client';
// Retired in Phase 1 (revival plan): this screen showed placeholder or
// browser-only data, not the real simulation. Old version is in git history.
// Redirects to the Chronicle, the real home screen.
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MarketRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/drennia/chronicle');
  }, [router]);
  return null;
}
