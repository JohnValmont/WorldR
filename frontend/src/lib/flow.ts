/**
 * Where to send someone arriving at a generic entry point.
 * The game layout (app/drennia/layout.tsx) then confirms with the server
 * whether they have a character — see lib/session.ts.
 */
import { getEntryPath } from './session';

export const getFlowRedirectPath = (): string => {
  if (typeof window === 'undefined') return '/landing/index.html';
  return getEntryPath();
};
