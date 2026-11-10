/**
 * POST /analytics-event
 *
 * Lets the static landing/onboarding pages (public/landing) record funnel
 * events without loading a third-party script. Forwards to PostHog server-side.
 * No-op (204) when NEXT_PUBLIC_POSTHOG_KEY is not set.
 */
import { NextResponse } from 'next/server';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

const EVENT_NAME = /^[a-z][a-z0-9_]{0,63}$/;
const MAX_BODY_BYTES = 4_000;

export async function POST(request: Request) {
  if (!POSTHOG_KEY) return new NextResponse(null, { status: 204 });

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

    const body = JSON.parse(raw) as { event?: unknown; distinct_id?: unknown; properties?: unknown };
    const event = typeof body.event === 'string' ? body.event : '';
    const distinctId = typeof body.distinct_id === 'string' ? body.distinct_id.slice(0, 100) : '';
    if (!EVENT_NAME.test(event) || !distinctId) return new NextResponse(null, { status: 400 });

    const properties = body.properties && typeof body.properties === 'object' ? body.properties : {};

    await fetch(`${POSTHOG_HOST.replace(/\/$/, '')}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: { ...properties, source: 'landing', $process_person_profile: false },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Analytics must never surface errors to players.
  }
  return new NextResponse(null, { status: 204 });
}
