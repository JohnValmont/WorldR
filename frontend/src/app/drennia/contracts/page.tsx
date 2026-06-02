'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Contracts tab moved into Business hub. Redirecting to /drennia/business.
export default function ContractsRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/drennia/business'); }, [router]);
  return null;
}
