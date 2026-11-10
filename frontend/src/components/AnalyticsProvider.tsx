'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { initAnalytics, trackPageview, identifyUser } from '../lib/analytics';
import { useAuthStore } from '../store/auth.store';

/** Starts analytics (if configured), records page views and links the logged-in user. */
export default function AnalyticsProvider() {
  const pathname = usePathname();
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (pathname) trackPageview(pathname);
  }, [pathname]);

  useEffect(() => {
    if (user?.id) identifyUser(user);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
