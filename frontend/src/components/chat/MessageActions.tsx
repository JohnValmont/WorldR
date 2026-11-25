'use client';
// Moderation controls under a chat message: "Report" for other players'
// messages; "Hide" and "Mute 24h" for admins. Used by GameChat and Corridors.
import { useState } from 'react';
import { chatApi, type ChatMe, type ChatMessage } from '../../lib/api';

export default function MessageActions({ message, me, onHidden }: {
  message: ChatMessage;
  me: ChatMe | null | undefined;
  onHidden?: (id: number) => void;
}) {
  const [state, setState] = useState<'idle' | 'busy' | 'reported' | 'done'>('idle');
  const [note, setNote] = useState<string | null>(null);
  if (!me || message.character_id === me.characterId) return null;

  const run = async (fn: () => Promise<string | null>) => {
    setState('busy'); setNote(null);
    try { setNote(await fn()); setState('done'); }
    catch (e: any) { setNote(e?.response?.data?.error || 'Could not do that.'); setState('idle'); }
  };
  const report = () => run(async () => {
    if (!window.confirm('Report this message to the moderators?')) { setState('idle'); return null; }
    const r = await chatApi.report(message.id);
    setState('reported');
    if (r.hidden) onHidden?.(message.id);
    return r.hidden ? 'Reported. Hidden while a moderator looks.' : 'Reported. Thank you.';
  });
  const hide = () => run(async () => { await chatApi.moderate(message.id, 'hide'); onHidden?.(message.id); return 'Hidden for everyone.'; });
  const mute = () => run(async () => {
    const r = await chatApi.mute(message.character_id, 24, 'Muted from chat');
    return `${r.name} muted for 24 hours.`;
  });

  const btn = 'text-[11px] text-ink-faint hover:text-ink underline-offset-2 hover:underline disabled:cursor-not-allowed';
  return (
    <span className="inline-flex items-center gap-3">
      {state !== 'reported' && <button type="button" className={btn} disabled={state === 'busy'} onClick={report} aria-label={`Report message from ${message.character_name}`}>Report</button>}
      {me.canModerate && <button type="button" className={btn} disabled={state === 'busy'} onClick={hide} aria-label={`Hide message from ${message.character_name}`}>Hide</button>}
      {me.canModerate && <button type="button" className={btn} disabled={state === 'busy'} onClick={mute} aria-label={`Mute ${message.character_name} for 24 hours`}>Mute 24h</button>}
      {note && <span className="text-[11px] text-ink-dim" role="status">{note}</span>}
    </span>
  );
}
