/**
 * Optional keep-awake for hosts that sleep when idle (Render's free plan sleeps
 * after about 15 minutes without a request). A sleeping server cannot run the
 * world clock, so months turned late (tick-health logs, 2026-11-23/24).
 *
 * Off unless KEEP_AWAKE_URL is set to this server's PUBLIC address: the request
 * has to come in through the host's front door to count as traffic. A paid plan
 * that never sleeps is the better fix; then leave KEEP_AWAKE_URL empty.
 */
import { logger } from '../../utils/logger';
import { KEEP_AWAKE_INTERVAL_MINUTES, KEEP_AWAKE_TIMEOUT_MS } from '../constants/world';

export function startKeepAwake(baseUrl: string | undefined): NodeJS.Timeout | null {
  if (!baseUrl) return null;
  const url = baseUrl.replace(/\/+$/, '') + '/health';
  let failuresInARow = 0;
  const ping = async () => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(KEEP_AWAKE_TIMEOUT_MS) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (failuresInARow > 0) logger.info(`[keep-awake] ${url} reachable again.`);
      failuresInARow = 0;
    } catch (err: any) {
      failuresInARow++;
      // Log the first failure and then every 6th, so a long outage does not flood the log.
      if (failuresInARow === 1 || failuresInARow % 6 === 0) {
        logger.warn(`[keep-awake] could not reach ${url} (${failuresInARow} in a row): ${err?.message ?? err}`);
      }
    }
  };
  const timer = setInterval(ping, KEEP_AWAKE_INTERVAL_MINUTES * 60_000);
  logger.info(`[keep-awake] pinging ${url} every ${KEEP_AWAKE_INTERVAL_MINUTES} minutes.`);
  return timer;
}
