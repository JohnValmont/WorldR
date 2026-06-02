'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Company tab moved into Business hub. Redirecting to /drennia/business?tab=companies
export default function CompanyRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/drennia/business'); }, [router]);
  return null;
}
