/**
 * Product analytics (PostHog).
 *
 * Off unless NEXT_PUBLIC_POSTHOG_KEY is set. Deliberately minimal and
 * privacy-friendly: no autocapture, no session recording, no emails sent —
 * only page views and the named funnel events we call explicitly.
 *
 * The static landing/onboarding pages (public/landing) send events through
 * /analytics-event using the same anonymous id stored under ANON_ID_KEY, so a
 * visitor can be followed from first landing view to playing.
 */
import posthog from 'posthog-js';

export const ANON_ID_KEY = 'worldr_anon_id';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialised = false;

function getAnonId(): string | undefined {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export function initAnalytics(): void {
  if (initialised || !POSTHOG_KEY || typeof window === 'undefined') return;
  const anonId = getAnonId();
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false,
    capture_pageview: false, // sent manually on route change
    capture_pageleave: true,
    disable_session_recording: true,
    person_profiles: 'identified_only',
    ...(anonId ? { bootstrap: { distinctID: anonId } } : {}),
  });
  initialised = true;
}

export function trackPageview(path: string): void {
  if (!initialised) return;
  posthog.capture('$pageview', { $current_url: window.location.origin + path });
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!initialised) return;
  posthog.capture(event, properties);
}

/** Link this browser's anonymous history to the logged-in account. Never sends the email. */
export function identifyUser(user: { id: number | string; email?: string | null; role?: string }): void {
  if (!initialised) return;
  const isGuest = !!user.email && user.email.toLowerCase().endsWith('@guest.worldr.game');
  posthog.identify(String(user.id), { is_guest: isGuest, role: user.role });
}

export function resetAnalytics(): void {
  if (!initialised) return;
  posthog.reset();
}
