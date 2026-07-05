'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { characterApi, companyApi } from '@/lib/api';

const T = {
  bg: '#090A0F',
  panel: '#11131A',
  paper: '#1E1A15',
  border: '#2A2630',
  borderGold: 'rgba(201,162,74,0.22)',
  gold: '#C9A24A',
  ivory: '#F4EBD6',
  muted: '#A79D8C',
  faint: '#6B6358',
  mint: '#36D399',
};

const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: '11px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', color: T.gold, fontWeight: 700, marginBottom: '16px' }}>
    {children}
  </div>
);

const FieldRow = ({ label, value }: { label: string; value: string | number }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '7px 0', borderBottom: `1px solid ${T.border}` }}>
    <span style={{ fontSize: '11px', color: T.muted }}>{label}</span>
    <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 600, color: T.ivory }}>{value}</span>
  </div>
);

export default function CareerPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [company, setCompany] = useState<any | null>(null);
  const [careerData, setCareerData] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    characterApi.getMe()
      .then(res => {
        setCharacterName(res.data.name);
        companyApi.getMy().then(compRes => {
          const companies = compRes.data;
          if (companies.length > 0) {
            const myCompany = companies.sort((a: any, b: any) =>
              new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
            )[0];
            setCompany(myCompany);
          }
        }).catch(() => {});
      })
      .catch(() => {});
    
    const careerStr = localStorage.getItem('worldr_career_v1');
    if (careerStr) {
      setCareerData(JSON.parse(careerStr));
    }
    
    setAuthorized(true);
  }, [router]);

  if (!authorized) return null;

  const timelineEntries = careerData?.entries || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: T.bg, color: T.ivory, overflow: 'hidden' }}>
      
      {/* Title */}
      <div style={{ padding: '24px 24px 0', flexShrink: 0 }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: T.ivory, margin: '0 0 8px' }}>Career</h1>
        <p style={{ fontSize: '13px', color: T.muted, lineHeight: 1.6, maxWidth: '600px' }}>
          Every public path you enter becomes part of your permanent life record.
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
        
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Current Career Direction */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '24px' }}>
            <SectionHeader>Current Career Direction</SectionHeader>
            {!careerData?.activePath ? (
              <div>
                <p style={{ fontSize: '13px', color: T.muted, marginBottom: '16px' }}>No formal career path has been opened yet.</p>
                <p style={{ fontSize: '11px', color: T.faint, marginBottom: '16px' }}>Recommended action: Start a business from the Business Desk.</p>
                <Link href="/drennia/business" style={{ display: 'inline-block', padding: '10px 16px', background: `linear-gradient(135deg, ${T.gold}, #8A6E2A)`, color: '#0a0709', fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 700, textDecoration: 'none' }}>
                  Open Business Desk
                </Link>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: T.mint, marginBottom: '12px' }}>{careerData.activePath} Career Active</div>
                {timelineEntries.length > 0 && (
                  <p style={{ fontSize: '13px', color: T.ivory, lineHeight: 1.6 }}>{timelineEntries[0].text}</p>
                )}
              </div>
            )}
          </div>

          {/* Career Timeline */}
          <div style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '24px' }}>
            <SectionHeader>Career Timeline</SectionHeader>
            {timelineEntries.length === 0 ? (
              <p style={{ fontSize: '12px', color: T.faint, fontStyle: 'italic' }}>No career records yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {timelineEntries.map((e: any) => (
                  <div key={e.id} style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: T.gold, flexShrink: 0, marginTop: '2px' }}>
                      Year {e.year}
                    </div>
                    <div style={{ fontSize: '13px', color: T.muted, lineHeight: 1.5 }}>
                      {e.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Career Identity */}
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: '24px' }}>
            <SectionHeader>Career Identity</SectionHeader>
            {company ? (
              <div>
                <FieldRow label="Role" value="Founder / Owner" />
                <FieldRow label="Sector" value={company.industry_id || 'N/A'} />
                <FieldRow label="HQ State" value={company.headquarters_state_id || 'N/A'} />
                <FieldRow label="Companies Owned" value={1} />
                <FieldRow label="Reputation" value={company.reputation || 0} />
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: T.faint }}>Unattached citizen.</p>
            )}
          </div>

          {/* Career Paths */}
          <div style={{ background: T.paper, border: `1px solid ${T.border}`, padding: '24px' }}>
            <SectionHeader>Career Paths</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Business */}
              <div style={{ padding: '16px', background: 'rgba(201,162,74,0.05)', border: `1px solid ${T.borderGold}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>Business</span>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.mint }}>{careerData?.activePath === 'Business' ? 'ACTIVE' : 'AVAILABLE'}</span>
                </div>
              </div>

              {/* Politics */}
              <div style={{ padding: '16px', background: 'rgba(201,162,74,0.05)', border: `1px solid ${T.borderGold}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: T.ivory }}>Politics</span>
                  <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.mint }}>AVAILABLE</span>
                </div>
              </div>

              {/* Others */}
              {['Civil Service', 'Judiciary', 'Military'].map(path => (
                <div key={path} style={{ padding: '16px', background: T.panel, border: `1px solid ${T.border}`, opacity: 0.5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: T.faint }}>{path}</span>
                    <span style={{ fontSize: '9px', fontFamily: 'monospace', color: T.faint }}>LOCKED</span>
                  </div>
                </div>
              ))}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

