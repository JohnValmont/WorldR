'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../../store/auth.store';
import { lawsApi, KELDORIA_ID } from '../../../lib/api';
import TerminalPanel from '../../../components/ui/TerminalPanel';
import StatusBadge from '../../../components/ui/StatusBadge';
import ModalOverlay from '../../../components/ui/ModalOverlay';
import { Law } from '../../../types/game';

const VALDORIA_ID = KELDORIA_ID;

const EFFECT_TARGETS = ['sector', 'population_group', 'tax', 'budget_item', 'nation'];
const TARGET_NAMES: Record<string, string[]> = {
  sector: ['Agriculture', 'Industry', 'Services', 'Energy', 'Construction'],
  population_group: ['Poor', 'Working', 'Middle', 'Wealthy', 'Elite'],
  tax: ['Income Tax', 'Corporate Tax', 'Sales Tax', 'Property Tax', 'Tariffs'],
  budget_item: ['Education', 'Healthcare', 'Infrastructure', 'Welfare', 'Administration'],
  nation: ['approval', 'stability', 'gdp'],
};
const PARAMS: Record<string, string[]> = {
  sector: ['productivity', 'output', 'wages', 'growth'],
  population_group: ['approval', 'income', 'inflation_sensitivity'],
  tax: ['rate'],
  budget_item: ['allocation'],
  nation: ['approval', 'stability'],
};

interface EffectRow { target_type: string; target_name: string; parameter_name: string; modifier_type: string; modifier_value: string; }

export default function LawsPage() {
  const { user } = useAuthStore();
  const nationId = user?.nation_id || VALDORIA_ID;
  const [laws, setLaws] = useState<Law[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [effects, setEffects] = useState<EffectRow[]>([]);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'proposed' | 'repealed'>('all');

  const load = () => {
    setLoading(true);
    lawsApi.getLaws(nationId).then(r => setLaws(r.data.laws || [])).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [nationId]);

  const addEffect = () => setEffects(prev => [...prev, { target_type: 'sector', target_name: 'Agriculture', parameter_name: 'productivity', modifier_type: 'multiplier', modifier_value: '1.05' }]);
  const removeEffect = (i: number) => setEffects(prev => prev.filter((_, idx) => idx !== i));
  const updateEffect = (i: number, key: keyof EffectRow, val: string) => {
    setEffects(prev => prev.map((e, idx) => {
      if (idx !== i) return e;
      const updated = { ...e, [key]: val };
      if (key === 'target_type') {
        updated.target_name = TARGET_NAMES[val]?.[0] || '';
        updated.parameter_name = PARAMS[val]?.[0] || '';
      }
      return updated;
    }));
  };

  const handlePropose = async () => {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setProposing(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        effects: effects.map(e => ({ ...e, modifier_value: parseFloat(e.modifier_value) }))
      };
      await lawsApi.proposeLaw(nationId, payload);
      setShowModal(false);
      setForm({ title: '', description: '' });
      setEffects([]);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to propose law.');
    } finally {
      setProposing(false);
    }
  };

  const handleStatusChange = async (lawId: string, status: string) => {
    try {
      await lawsApi.getLaws(nationId); // Refresh
      // TODO: expose patch endpoint
    } catch { }
  };

  const filtered = statusFilter === 'all' ? laws : laws.filter(l => l.status === statusFilter);

  const statusCounts = { all: laws.length, passed: laws.filter(l => l.status === 'passed').length, proposed: laws.filter(l => l.status === 'proposed').length, repealed: laws.filter(l => l.status === 'repealed').length };

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-amber-400 font-black text-base uppercase tracking-widest">Laws & Legislation</h1>
          <div className="text-zinc-600 text-[10px]">Propose, pass, and manage national laws</div>
        </div>
        <button id="propose-law-btn" onClick={() => setShowModal(true)} className="btn-primary">+ PROPOSE LAW</button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(['all', 'passed', 'proposed', 'repealed'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 text-[10px] font-mono uppercase tracking-wider border transition-colors ${statusFilter === s ? 'border-amber-500 text-amber-400 bg-amber-950/20' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
            {s} ({statusCounts[s]})
          </button>
        ))}
      </div>

      <TerminalPanel title="Law Registry" subtitle={`${filtered.length} laws`}>
        {loading ? (
          <div className="text-zinc-600 text-xs text-center py-8">Loading laws...</div>
        ) : filtered.length === 0 ? (
          <div className="text-zinc-600 text-xs text-center py-8">
            No laws found. {statusFilter === 'all' && 'Propose the first law to begin legislating.'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(law => (
              <div key={law.id} className="border border-zinc-800 p-3 hover:border-zinc-700 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge
                        label={law.status.toUpperCase()}
                        variant={law.status === 'passed' ? 'success' : law.status === 'proposed' ? 'warning' : 'neutral'}
                        dot
                      />
                      <span className="text-zinc-200 text-xs font-bold truncate">{law.title}</span>
                    </div>
                    {law.description && (
                      <p className="text-zinc-500 text-[10px] leading-relaxed">
                        {law.description.split('[METADATA:')[0].trim()}
                      </p>
                    )}
                    {law.effects && law.effects.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {law.effects.map((e, i) => (
                          <span key={i} className="text-[9px] font-mono border border-zinc-800 px-1.5 py-0.5 text-zinc-500">
                            {e.target_name}.{e.parameter_name} {e.modifier_type === 'multiplier' ? '×' : '+'}{e.modifier_value}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-[9px] text-zinc-600 font-mono shrink-0">{new Date(law.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TerminalPanel>

      <ModalOverlay isOpen={showModal} onClose={() => setShowModal(false)} title="Propose New Law" width="max-w-2xl">
        <div className="space-y-3">
          {error && <div className="bg-red-950/30 border border-red-900 text-red-400 text-xs p-2 font-mono">✕ {error}</div>}
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Title *</label>
            <input id="law-title" className="terminal-input" placeholder="National Renewable Energy Act" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Description</label>
            <textarea id="law-description" className="terminal-input resize-none" rows={2} placeholder="Mandates transition to 40% renewable energy by 2030..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Effects */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest">Simulation Effects</label>
              <button type="button" onClick={addEffect} className="text-[10px] text-amber-500 hover:text-amber-400 font-mono">+ ADD EFFECT</button>
            </div>
            {effects.map((e, i) => (
              <div key={i} className="grid grid-cols-5 gap-1 mb-1.5 items-center">
                <select className="terminal-input text-[10px]" value={e.target_type} onChange={ev => updateEffect(i, 'target_type', ev.target.value)}>
                  {EFFECT_TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select className="terminal-input text-[10px]" value={e.target_name} onChange={ev => updateEffect(i, 'target_name', ev.target.value)}>
                  {(TARGET_NAMES[e.target_type] || []).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <select className="terminal-input text-[10px]" value={e.parameter_name} onChange={ev => updateEffect(i, 'parameter_name', ev.target.value)}>
                  {(PARAMS[e.target_type] || []).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select className="terminal-input text-[10px]" value={e.modifier_type} onChange={ev => updateEffect(i, 'modifier_type', ev.target.value)}>
                  <option value="multiplier">× multiplier</option>
                  <option value="additive">+ additive</option>
                </select>
                <div className="flex gap-1">
                  <input className="terminal-input text-[10px] flex-1" type="number" step="0.01" value={e.modifier_value} onChange={ev => updateEffect(i, 'modifier_value', ev.target.value)} />
                  <button type="button" onClick={() => removeEffect(i)} className="text-red-600 hover:text-red-400 text-xs px-1">✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handlePropose} disabled={proposing} className="btn-primary flex-1" id="submit-law-btn">
              {proposing ? 'PROPOSING...' : 'PROPOSE LAW'}
            </button>
            <button onClick={() => setShowModal(false)} className="btn-secondary">CANCEL</button>
          </div>
        </div>
      </ModalOverlay>
    </div>
  );
}
