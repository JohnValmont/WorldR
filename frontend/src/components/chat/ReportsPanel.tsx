'use client';
// Admin-only list of reported chat messages (GET /chat/reports).
import useSWR from 'swr';
import { useState } from 'react';
import { chatApi, type ChatReport } from '../../lib/api';

function roomLabel(channel: string): string {
  if (channel === 'world') return 'World';
  if (channel === 'private') return 'Private message';
  if (channel.startsWith('nation:')) return 'Nation room';
  if (channel.startsWith('party:')) return 'Party room';
  return channel;
}

export default function ReportsPanel() {
  const { data, mutate, error } = useSWR('chat-reports', chatApi.reports, { refreshInterval: 30_000 });
  const [busy, setBusy] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const act = async (r: ChatReport, fn: () => Promise<unknown>) => {
    setBusy(r.message_id); setErr(null);
    try { await fn(); await mutate(); } catch (e: any) { setErr(e?.response?.data?.error || 'Could not do that.'); }
    finally { setBusy(null); }
  };
  const reports = data?.reports ?? [];
  const btn = 'rounded border border-line-strong px-2 py-1 text-[11px] text-ink hover:bg-raised disabled:cursor-not-allowed';
  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto" style={{ flex: 1 }}>
      <p className="text-[11px] text-ink-dim">Messages players reported. {`Hidden ones disappeared automatically after enough reports.`}</p>
      {error && <p className="text-xs text-bad">Could not load reports.</p>}
      {err && <p className="text-xs text-bad" role="alert">{err}</p>}
      {!error && reports.length === 0 && <p className="text-xs text-ink-faint">No open reports.</p>}
      {reports.map(r => (
        <div key={r.message_id} className="rounded-lg border border-line bg-surface p-2.5">
          <div className="text-[11px] text-ink-faint">
            <span className="font-semibold text-ink-dim">{r.author_name}</span> · {roomLabel(r.channel)} · {r.reports} report{r.reports === 1 ? '' : 's'}
            {r.hidden_at && <span className="text-warn"> · hidden</span>}
            {r.author_muted_until && <span className="text-warn"> · muted</span>}
          </div>
          <p className="mt-1 text-[13px] text-ink whitespace-pre-wrap break-words">{r.body}</p>
          {r.reasons && <p className="mt-1 text-[11px] text-ink-dim">Reasons: {r.reasons}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {!r.hidden_at && <button type="button" className={btn} disabled={busy === r.message_id} onClick={() => act(r, () => chatApi.moderate(r.message_id, 'hide'))}>Hide</button>}
            <button type="button" className={btn} disabled={busy === r.message_id} onClick={() => act(r, () => chatApi.moderate(r.message_id, 'dismiss'))}>{r.hidden_at ? 'Restore and close' : 'Keep and close'}</button>
            {r.author_muted_until
              ? <button type="button" className={btn} disabled={busy === r.message_id} onClick={() => act(r, () => chatApi.mute(r.author_character_id, 0))}>Lift mute</button>
              : <button type="button" className={btn} disabled={busy === r.message_id} onClick={() => act(r, () => chatApi.mute(r.author_character_id, 24, 'Reported chat message'))}>Mute 24h</button>}
          </div>
        </div>
      ))}
    </div>
  );
}
