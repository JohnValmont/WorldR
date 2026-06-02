// FROZEN POLITICS PROTOTYPE — preserve for later politics module. Do not use as active post-login core.
// Redirects to /drennia/chronicle (Business-First Chronicle)
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DrenniaHomeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/drennia/chronicle');
  }, [router]);
  return null;
}
