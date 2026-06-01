'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';
import OpportunityPreviewCard from './OpportunityPreviewCard';

export default function OpportunityPreviewPanel() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const oppsStr = localStorage.getItem('worldr_active_opportunities_v1');
      if (oppsStr) {
        setOpportunities(JSON.parse(oppsStr));
      }
    }
  }, []);

  const displayOpps = opportunities.length > 0 
    ? opportunities.slice(0, 4).map(o => ({
        type: o.type.charAt(0).toUpperCase() + o.type.slice(1),
        location: o.state,
        text: o.shortDescription,
        gain: o.mainFactors.map((f: string) => f.charAt(0).toUpperCase() + f.slice(1)).join(' · '),
        risk: Object.keys(o.risks).length > 0 ? 'Various Risks' : 'Minimal'
      }))
    : [
        {
          type: 'Politics',
          location: 'Drennport State',
          text: 'A local party organizer is recruiting unknown young citizens into civic politics.',
          gain: 'Influence · Contact · Public Record',
          risk: 'Obligation to organizer'
        },
        {
          type: 'Work',
          location: 'Any State',
          text: 'Earn personal money and reduce early family pressure before choosing a path.',
          gain: 'Resources · Stability',
          risk: 'Slower public growth'
        },
        {
          type: 'Reputation',
          location: 'Drennport State',
          text: 'Build an early speaking record in front of students, organizers, and local journalists.',
          gain: 'Charisma · Credibility',
          risk: 'Public embarrassment if failed'
        },
        {
          type: 'Business',
          location: 'Westport State',
          text: 'A small business circle is looking for ambitious young people to support.',
          gain: 'Resources · Influence',
          risk: 'Business obligation'
        }
      ];

  return (
    <div 
      className="w-full flex flex-col"
      style={{
        minHeight: '560px',
        padding: '22px',
        borderRadius: theme.effects.radiusLarge,
        background: 'rgba(16,28,23,0.84)',
        border: `1px solid ${theme.colors.borders.borderMuted}`,
        boxShadow: theme.effects.shadowPanel
      }}
    >
      <div 
        style={{
          fontSize: '11px',
          letterSpacing: '0.14em',
          color: theme.colors.text.textMuted,
          textTransform: 'uppercase',
          fontWeight: 'bold',
          marginBottom: '4px'
        }}
      >
        AVAILABLE FIRST MOVES
      </div>
      
      <h2 
        style={{
          fontSize: '22px',
          fontWeight: 700,
          color: theme.colors.text.textPrimary,
          marginBottom: '4px'
        }}
      >
        Choose where your life starts moving.
      </h2>
      
      <p 
        style={{
          fontSize: '13px',
          color: theme.colors.text.textSecondary,
          maxWidth: '620px',
          lineHeight: 1.5
        }}
      >
        Opportunities are not tap actions. They are world situations with contacts, risks, obligations, and records.
      </p>

      <div 
        className="grid grid-cols-1 md:grid-cols-2"
        style={{
          gap: '14px',
          marginTop: '20px'
        }}
      >
        {displayOpps.map((opp, idx) => (
          <OpportunityPreviewCard 
            key={idx}
            type={opp.type}
            location={opp.location}
            text={opp.text}
            gain={opp.gain}
            risk={opp.risk}
          />
        ))}
      </div>

      <div className="mt-auto pt-6">
        <button
          onClick={() => router.push('/drennia/opportunities')}
          className="w-full transition-colors duration-200"
          style={{
            height: '44px',
            borderRadius: '999px',
            background: 'rgba(214,179,95,0.08)',
            border: `1px solid ${theme.colors.accents.gold}`,
            color: theme.colors.accents.gold,
            fontWeight: 'bold',
            fontSize: '14px',
            letterSpacing: '0.02em',
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(214,179,95,0.15)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(214,179,95,0.08)'}
        >
          Open Opportunity Board
        </button>
      </div>
    </div>
  );
}
