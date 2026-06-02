'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const GOLD = '#D6B35F';

interface LifeRecord {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
}

function RecordCard({ record }: { record: LifeRecord }) {
  const date = new Date(record.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="rounded-sm p-4 flex flex-col gap-2.5" style={{
      background: 'rgba(12,22,18,0.7)',
      border: '1px solid rgba(255,255,255,0.06)'
    }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm" style={{ background: 'rgba(255,255,255,0.04)', color: '#7E8378', border: '1px solid rgba(255,255,255,0.07)' }}>
            {record.type.toUpperCase()}
          </span>
        </div>
        <span className="text-[9px] font-mono shrink-0" style={{ color: '#3f4b47' }}>{date}</span>
      </div>

      <p className="text-[12px] leading-relaxed" style={{ color: '#F4EBD6' }}>{record.summary}</p>
    </div>
  );
}

export default function RecordsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<LifeRecord[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
    if (!granted) { router.replace('/pre-alpha-access'); return; }
    setAuthorized(true);
    const raw = localStorage.getItem('worldr_records_v1');
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

  const filtered = filter === 'all' ? records : records.filter(r => r.type === filter);
  
  const FILTER_TABS = [
    { id: 'all', label: 'All' },
    { id: 'business', label: 'Business Filing' },
    { id: 'contract', label: 'Contract' },
    { id: 'financial', label: 'Financial' },
    { id: 'offer', label: 'Offer' },
    { id: 'failure', label: 'Failure' }
  ];

  return (
    <div className="flex flex-col h-full p-6 text-white overflow-hidden max-w-4xl mx-auto w-full">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#F4EBD6' }}>Public & Private Records</h1>
        <p className="text-[12px] mt-1" style={{ color: '#B9B09B' }}>
          Your history of business filings, registry actions, executed contracts, and market movements.
        </p>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap mb-6">
        <div className="px-4 py-3 rounded-sm flex-1" style={{ background: 'rgba(12,22,18,0.8)', border: '1px solid rgba(214,179,95,0.1)' }}>
          <div className="text-[8px] font-mono uppercase tracking-widest mb-0.5" style={{ color: '#7E8378' }}>Total Records</div>
          <div className="text-xl font-bold" style={{ color: '#F4EBD6' }}>{records.length}</div>
        </div>
        <div className="px-4 py-3 rounded-sm flex-1" style={{ background: 'rgba(12,22,18,0.8)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="text-[8px] font-mono uppercase tracking-widest mb-0.5" style={{ color: '#7E8378' }}>Contracts Won</div>
          <div className="text-xl font-bold" style={{ color: '#34d399' }}>{records.filter(r => r.type === 'contract').length}</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTER_TABS.map(tab => {
          const count = tab.id === 'all' ? records.length : records.filter(r => r.type === tab.id).length;
          return (
            <button key={tab.id} type="button" onClick={() => setFilter(tab.id)}
              className="px-4 py-1.5 text-[10px] font-mono uppercase tracking-widest rounded-sm transition-all"
              style={{
                background: filter === tab.id ? 'rgba(214,179,95,0.12)' : 'transparent',
                border: `1px solid ${filter === tab.id ? 'rgba(214,179,95,0.4)' : 'rgba(255,255,255,0.07)'}`,
                color: filter === tab.id ? GOLD : '#7E8378',
              }}>
              {tab.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Records list */}
      <div className="flex-1 overflow-y-auto pr-4 pb-12">
        {filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(214,179,95,0.06)', border: '1px solid rgba(214,179,95,0.12)' }}>
              <span style={{ color: `${GOLD}60` }}>📋</span>
            </div>
            <p className="text-sm" style={{ color: '#3f4b47' }}>
              {filter === 'all' ? 'No records yet. Incorporate a business or win a contract.' : `No ${filter} records yet.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map(record => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
