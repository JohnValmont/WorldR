'use client';
import { useState } from 'react';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';
import { Opportunity } from '../../lib/opportunityEngine';
import OpportunityCard from './OpportunityCard';

interface Props {
  opportunities: Opportunity[];
  citizenFile: any;
  onTakeOpportunity: (opp: Opportunity) => void;
  onRefresh: () => void;
}

const CATEGORIES = ['All', 'Survival', 'Reputation', 'Network', 'Politics', 'Business'];
const STATES = ['All States', 'Drennport State', 'Ironvale State', 'Greenmere State', 'Westport State'];
const SORTS = ['Recommended', 'Low Risk', 'High Reward', 'Money First', 'Political First'];

export default function OpportunityBoardPanel({ opportunities, citizenFile, onTakeOpportunity, onRefresh }: Props) {
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All States');
  const [sortMode, setSortMode] = useState('Recommended');

  let filtered = [...opportunities];
  
  if (categoryFilter !== 'All') {
    filtered = filtered.filter(o => o.type.toLowerCase() === categoryFilter.toLowerCase());
  }
  if (stateFilter !== 'All States') {
    filtered = filtered.filter(o => o.state === stateFilter || o.state === 'Any State');
  }

  // Simple sorting logic
  filtered.sort((a, b) => {
    if (sortMode === 'Low Risk') {
      const riskRank = { 'Low': 1, 'Medium': 2, 'High': 3 };
      return riskRank[a.riskLevel] - riskRank[b.riskLevel];
    } else if (sortMode === 'High Reward') {
      const sumRewards = (o: Opportunity) => Object.values(o.rewards).reduce((acc: number, val) => acc + (val as number), 0);
      return sumRewards(b) - sumRewards(a);
    } else if (sortMode === 'Money First') {
      return (b.rewards.money || 0) - (a.rewards.money || 0);
    } else if (sortMode === 'Political First') {
      if (a.type === 'politics' && b.type !== 'politics') return -1;
      if (b.type === 'politics' && a.type !== 'politics') return 1;
      return 0;
    }
    return 0; // Recommended (default sort from generation)
  });

  return (
    <div className="w-full flex flex-col h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                background: categoryFilter === cat ? 'rgba(214,179,95,0.1)' : 'rgba(255,255,255,0.05)',
                border: categoryFilter === cat ? '1px solid rgba(214,179,95,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: categoryFilter === cat ? theme.colors.accents.gold : theme.colors.text.textSecondary,
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Dropdowns */}
        <div className="flex gap-2">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: theme.colors.text.textSecondary,
              fontSize: '13px',
              outline: 'none'
            }}
          >
            {STATES.map(s => <option key={s} value={s} style={{ background: '#07100D' }}>{s}</option>)}
          </select>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: theme.colors.text.textSecondary,
              fontSize: '13px',
              outline: 'none'
            }}
          >
            {SORTS.map(s => <option key={s} value={s} style={{ background: '#07100D' }}>{s}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/10 rounded-2xl">
          <div style={{ color: theme.colors.text.textMuted, fontSize: '15px' }}>No opportunities match these filters.</div>
          <button 
            onClick={() => { setCategoryFilter('All'); setStateFilter('All States'); }}
            style={{ color: theme.colors.accents.gold, marginTop: '12px', fontSize: '14px' }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
          {filtered.map(opp => (
            <OpportunityCard 
              key={opp.id} 
              opportunity={opp} 
              citizenFile={citizenFile}
              onTake={() => onTakeOpportunity(opp)} 
            />
          ))}
        </div>
      )}

      {/* Refresh Board */}
      <div className="mt-8 flex flex-col items-center pt-8 border-t border-white/5">
        <button
          onClick={onRefresh}
          className="transition-colors"
          style={{
            padding: '8px 20px',
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: theme.colors.text.textSecondary,
            fontSize: '13px'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        >
          Refresh Board
        </button>
        <div style={{ fontSize: '11px', color: theme.colors.text.textFaint, marginTop: '8px' }}>
          Pre-alpha board refresh.
        </div>
      </div>
    </div>
  );
}
