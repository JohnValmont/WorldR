'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Registry tab moved into Business hub. Redirecting to /drennia/business.
export default function RegistryRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/drennia/business'); }, [router]);
  return null;
}
