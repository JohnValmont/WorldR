'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const GOLD = '#D6B35F';

const ROOM_TYPE_LABELS: Record<string, string> = {
  public_debate:          'Public Debate',
  work_contract:          'Work Contract',
  local_organizer:        'Organizer',
  business_circle:        'Business Circle',
  community_issue:        'Community Issue',
  political_observation:  'Civic Observation',
  opportunity:            'Life Opportunity',
};

const RESULT_COLORS: Record<string, string> = {
  success: '#34d399',
  mixed:   '#f59e0b',
  failure: '#f87171',
};

interface LifeRecord {
  id: string;
  type: string;
  roomId?: string;
  roomTitle?: string;
  roomType?: string;
  title?: string;
  opportunityId?: string;
  roleId?: string;
  roleLabel?: string;
  result: 'success' | 'mixed' | 'failure';
  visibility: 'public' | 'private';
  state?: string;
  summary: string;
  effectsSummary?: string;
  npcWitnesses?: string[];
  createdAt: string;
}

function RecordCard({ record }: { record: LifeRecord }) {
  const rColor = RESULT_COLORS[record.result] || '#B9B09B';
  const title = record.roomTitle || record.title || 'Untitled Record';
  const typeLabel = ROOM_TYPE_LABELS[record.roomType || record.type] || record.type || '—';
  const date = new Date(record.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="rounded-sm p-4 flex flex-col gap-2.5" style={{
      background: 'rgba(12,22,18,0.7)',
      border: `1px solid ${record.visibility === 'public' ? 'rgba(214,179,95,0.18)' : 'rgba(255,255,255,0.06)'}`,
    }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm uppercase tracking-widest"
            style={{ background: `${rColor}18`, color: rColor, border: `1px solid ${rColor}40` }}>
            {record.result}
          </span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', color: '#7E8378', border: '1px solid rgba(255,255,255,0.07)' }}>
            {typeLabel}
          </span>
          <span className="text-[8px] font-mono" style={{ color: record.visibility === 'public' ? `${GOLD}70` : '#3f4b47' }}>
            {record.visibility === 'public' ? '📋 Public' : '🔒 Private'}
          </span>
        </div>
        <span className="text-[9px] font-mono shrink-0" style={{ color: '#3f4b47' }}>{date}</span>
      </div>

      <div className="text-sm font-semibold leading-snug" style={{ color: '#F4EBD6' }}>{title}</div>

      {record.state && (
        <div className="text-[9px] font-mono" style={{ color: '#7E8378' }}>{record.state}</div>
      )}

      {record.roleLabel && (
        <div className="text-[10px]" style={{ color: '#B9B09B' }}>
          Role: <span style={{ color: '#F4EBD6' }}>{record.roleLabel}</span>
        </div>
      )}

      <p className="text-[11px] leading-relaxed" style={{ color: '#7E8378' }}>{record.summary}</p>

      {record.effectsSummary && (
        <div className="text-[9px] font-mono" style={{ color: '#34d399' }}>↑ {record.effectsSummary}</div>
      )}

      {record.npcWitnesses && record.npcWitnesses.length > 0 && (
        <div className="text-[9px] font-mono" style={{ color: '#3f4b47' }}>
          Witnessed by: {record.npcWitnesses.join(', ')}
        </div>
      )}
    </div>
  );
}

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<LifeRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    setAuthorized(true);
    const raw = localStorage.getItem('worldr_life_records_v1');
    if (raw) setRecords(JSON.parse(raw));
  }, [router]);

  if (!authorized) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-[10px] font-mono uppercase tracking-widest animate-pulse" style={{ color: GOLD }}>
          Loading records…
        </div>
      </div>
    );
  }

  const filtered = filter === 'all' ? records : records.filter(r => r.visibility === filter);
  const publicCount  = records.filter(r => r.visibility === 'public').length;
  const privateCount = records.filter(r => r.visibility === 'private').length;
  const successCount = records.filter(r => r.result === 'success').length;

  return (
    <div className="w-full flex flex-col gap-5 pb-10">

      {/* Header */}
      <div>
        <div className="text-[9px] font-mono uppercase tracking-[0.25em] mb-1" style={{ color: `${GOLD}60` }}>
          Life Records · Drennia
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#F4EBD6' }}>Your Public and Private Record</h1>
        <p className="text-sm leading-relaxed" style={{ color: '#7E8378' }}>
          Every room you enter, every role you take, every moment that was witnessed — all of it is filed here. Public records travel. Private records remain between you and Drennia's data halls.
        </p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Total Records',    value: records.length, color: '#F4EBD6' },
          { label: 'Public Records',   value: publicCount,    color: GOLD      },
          { label: 'Private Records',  value: privateCount,   color: '#7E8378' },
          { label: 'Successful',       value: successCount,   color: '#34d399' },
        ].map(s => (
          <div key={s.label} className="px-4 py-3 rounded-sm" style={{ background: 'rgba(12,22,18,0.8)', border: '1px solid rgba(214,179,95,0.1)' }}>
            <div className="text-[8px] font-mono uppercase tracking-widest mb-0.5" style={{ color: '#7E8378' }}>{s.label}</div>
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'public', 'private'] as const).map(tab => (
          <button key={tab} type="button" onClick={() => setFilter(tab)}
            className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded-sm transition-all"
            style={{
              background: filter === tab ? 'rgba(214,179,95,0.12)' : 'transparent',
              border: `1px solid ${filter === tab ? 'rgba(214,179,95,0.4)' : 'rgba(255,255,255,0.07)'}`,
              color: filter === tab ? GOLD : '#7E8378',
            }}>
            {tab === 'all' ? `All (${records.length})` : tab === 'public' ? `Public (${publicCount})` : `Private (${privateCount})`}
          </button>
        ))}
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(214,179,95,0.06)', border: '1px solid rgba(214,179,95,0.12)' }}>
            <span style={{ color: `${GOLD}60` }}>📋</span>
          </div>
          <p className="text-sm" style={{ color: '#3f4b47' }}>
            {filter === 'all' ? 'No life records yet. Enter a Power Room to create your first record.' : `No ${filter} records yet.`}
          </p>
          <button onClick={() => router.push('/drennia/home')}
            className="text-[10px] font-mono uppercase tracking-widest px-4 py-2 rounded-sm transition-all"
            style={{ background: 'rgba(214,179,95,0.08)', border: '1px solid rgba(214,179,95,0.2)', color: GOLD }}>
            Go to Live Map
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map(record => (
            <RecordCard key={record.id} record={record} />
          ))}
        </div>
      )}

      <div className="text-[9px] font-mono text-center" style={{ color: '#3f4b47' }}>
        WORLDr · Pre-Alpha · Public records will later affect nominations, elections, scandals, and reputation.
      </div>
    </div>
  );
}
