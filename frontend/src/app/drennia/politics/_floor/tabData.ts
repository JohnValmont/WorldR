// Data the politics tabs fetch on their own (beyond GET /politics/desk), in one
// place: the tab and the background prefetch must use the same key and fetcher,
// or the prefetch is wasted. page.tsx preloads these once the desk is on screen,
// so switching tabs shows data at once instead of a loading screen.
import { preload } from 'swr';
import { agencyApi, politicsApi } from '@/lib/api';

export const TAB_DATA = {
  map: { key: 'political-map', fetch: () => politicsApi.getMap() },
  corridors: { key: 'corridors', fetch: () => politicsApi.getCorridors() },
  wire: { key: 'wire-front', fetch: () => agencyApi.getFront() },
  chronicle: { key: 'politics-chronicle', fetch: () => politicsApi.getChronicle() },
} as const;

/** Warm every tab's data in the background (errors are left for the tab to show). */
export function preloadTabs(): void {
  for (const d of Object.values(TAB_DATA)) {
    try { preload(d.key, d.fetch as () => Promise<unknown>)?.catch?.(() => {}); } catch { /* the tab will fetch it */ }
  }
}
