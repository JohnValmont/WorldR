'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { livingWorldTheme as theme } from '../../../styles/livingWorldTheme';
import { CitizenFile, Opportunity, OpportunityResult, generateAvailableOpportunities, resolveOpportunity } from '../../../lib/opportunityEngine';
import OpportunityCitizenSnapshot from '../../../components/opportunities/OpportunityCitizenSnapshot';
import OpportunityBoardPanel from '../../../components/opportunities/OpportunityBoardPanel';
import OpportunityModal from '../../../components/opportunities/OpportunityModal';
import OpportunityResultModal from '../../../components/opportunities/OpportunityResultModal';

export default function OpportunitiesPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [citizenFile, setCitizenFile] = useState<CitizenFile | null>(null);
  const [activeOpportunities, setActiveOpportunities] = useState<Opportunity[]>([]);
  
  const [featuredOppId, setFeaturedOppId] = useState<string | null>(null);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [oppResult, setOppResult] = useState<OpportunityResult | null>(null);

  const [recordCount, setRecordCount] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const granted = localStorage.getItem('worldr_pre_alpha_access_granted_v1') === 'true';
      const hasMotherland = localStorage.getItem('worldr_selected_motherland') === 'Drennia';
      const fileStr = localStorage.getItem('worldr_citizen_file_v1');
      
      if (!granted) {
        router.replace('/pre-alpha-access');
      } else if (!hasMotherland) {
        router.replace('/world-entry');
      } else if (!fileStr) {
        router.replace('/start/character');
      } else {
        const file = JSON.parse(fileStr);
        // ensure personalMoney exists
        if (typeof file.personalMoney !== 'number') file.personalMoney = 0;
        
        setCitizenFile(file);
        setAuthorized(true);

        const recordsStr = localStorage.getItem('worldr_life_records_v1');
        if (recordsStr) {
          const records = JSON.parse(recordsStr);
          setRecordCount(records.length);
        }

        // load or generate opportunities
        const activeOppsStr = localStorage.getItem('worldr_active_opportunities_v1');
        if (activeOppsStr) {
          const opps = JSON.parse(activeOppsStr);
          setActiveOpportunities(opps);
          if (opps.length > 0) setFeaturedOppId(opps[0].id);
        } else {
          const newOpps = generateAvailableOpportunities(file);
          setActiveOpportunities(newOpps);
          if (newOpps.length > 0) setFeaturedOppId(newOpps[0].id);
          localStorage.setItem('worldr_active_opportunities_v1', JSON.stringify(newOpps));
        }
      }
    }
  }, [router]);

  if (!authorized || !citizenFile) {
    return (
      <div className="w-full h-[600px] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  const handleRefreshBoard = () => {
    const newOpps = generateAvailableOpportunities(citizenFile);
    setActiveOpportunities(newOpps);
    if (newOpps.length > 0) setFeaturedOppId(newOpps[0].id);
    localStorage.setItem('worldr_active_opportunities_v1', JSON.stringify(newOpps));
  };

  const handleTakeOpportunity = (opp: Opportunity) => {
    setSelectedOpp(opp);
  };

  const handleResolve = () => {
    if (!selectedOpp) return;
    
    const result = resolveOpportunity(selectedOpp, citizenFile);
    
    // Update Citizen File
    const updatedFile = { ...citizenFile };
    updatedFile.factors = {
      credibility: Math.max(0, Math.min(100, updatedFile.factors.credibility + (result.factorChanges.credibility || 0))),
      charisma: Math.max(0, Math.min(100, updatedFile.factors.charisma + (result.factorChanges.charisma || 0))),
      influence: Math.max(0, Math.min(100, updatedFile.factors.influence + (result.factorChanges.influence || 0))),
      resources: Math.max(0, Math.min(100, updatedFile.factors.resources + (result.factorChanges.resources || 0))),
    };
    updatedFile.personalMoney = (updatedFile.personalMoney || 0) + result.moneyChange;
    
    if (result.newObligation) {
      if (!updatedFile.obligations) updatedFile.obligations = [];
      updatedFile.obligations.push({ source: selectedOpp.title, label: result.newObligation, createdAt: new Date().toISOString() });
    }
    if (result.newVulnerability) {
      if (!updatedFile.vulnerabilities) updatedFile.vulnerabilities = [];
      updatedFile.vulnerabilities.push({ source: selectedOpp.title, label: result.newVulnerability, createdAt: new Date().toISOString() });
    }

    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(updatedFile));
    setCitizenFile(updatedFile);

    // Create Life Record
    const recordId = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const newRecord = {
      id: recordId,
      type: 'opportunity',
      title: result.recordCreated.title,
      opportunityId: selectedOpp.id,
      result: result.resultType,
      summary: result.recordCreated.summary,
      visibility: result.recordCreated.visibility,
      state: selectedOpp.state,
      createdAt: new Date().toISOString()
    };

    const existingRecords = JSON.parse(localStorage.getItem('worldr_life_records_v1') || '[]');
    const updatedRecords = [newRecord, ...existingRecords];
    localStorage.setItem('worldr_life_records_v1', JSON.stringify(updatedRecords));
    setRecordCount(updatedRecords.length);

    // Create History Record
    const historyRecord = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      opportunityId: selectedOpp.id,
      title: selectedOpp.title,
      type: selectedOpp.type,
      state: selectedOpp.state,
      result: result.resultType,
      factorChanges: result.factorChanges,
      moneyChange: result.moneyChange,
      createdRecordId: recordId,
      createdAt: new Date().toISOString()
    };
    const existingHistory = JSON.parse(localStorage.getItem('worldr_opportunity_history_v1') || '[]');
    localStorage.setItem('worldr_opportunity_history_v1', JSON.stringify([historyRecord, ...existingHistory]));

    // Refresh Board (remove taken, generate new)
    const newBoard = generateAvailableOpportunities(updatedFile);
    setActiveOpportunities(newBoard);
    if (newBoard.length > 0) setFeaturedOppId(newBoard[0].id);
    localStorage.setItem('worldr_active_opportunities_v1', JSON.stringify(newBoard));

    setSelectedOpp(null);
    setOppResult(result);
  };

  const handleCloseResult = () => {
    setOppResult(null);
  };

  // Calculations for Right Panel
  const currentDirectionCounts = activeOpportunities.reduce((acc, opp) => {
    acc[opp.type] = (acc[opp.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-full flex flex-col pb-12">
      <div className="mb-[24px]">
        <h1 
          style={{ fontSize: '30px', fontWeight: 800, color: theme.colors.text.textPrimary, marginBottom: '6px' }}
        >
          Opportunity Board
        </h1>
        <p style={{ fontSize: '14px', color: theme.colors.text.textSecondary, maxWidth: '760px', lineHeight: 1.5 }}>
          Choose world situations that shape your reputation, money, contacts, obligations, and future path.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_360px] gap-[20px] items-start">
        
        {/* Left: Citizen Snapshot */}
        <div className="order-1 lg:order-1">
          <OpportunityCitizenSnapshot citizenFile={citizenFile} />
        </div>

        {/* Center: Board */}
        <div className="order-2 lg:order-2">
          <OpportunityBoardPanel 
            opportunities={activeOpportunities}
            citizenFile={citizenFile}
            featuredOppId={featuredOppId}
            onSelectFeatured={setFeaturedOppId}
            onTakeOpportunity={handleTakeOpportunity}
            onRefresh={handleRefreshBoard}
          />
        </div>

        {/* Right: Board Consequences / Records */}
        <div className="order-3 lg:order-3 flex flex-col gap-5">
          <div 
            style={{
              padding: '18px',
              borderRadius: '22px',
              background: 'rgba(16,28,23,0.86)',
              border: '1px solid rgba(219,191,128,0.14)',
            }}
          >
            <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '12px' }}>
              Current Direction
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[13px]">
                <span style={{ color: theme.colors.text.textSecondary }}>Survival Pressure</span>
                <span style={{ color: theme.colors.text.textPrimary, fontWeight: 'bold' }}>{currentDirectionCounts['survival'] || 0}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span style={{ color: theme.colors.text.textSecondary }}>Reputation Building</span>
                <span style={{ color: theme.colors.text.textPrimary, fontWeight: 'bold' }}>{currentDirectionCounts['reputation'] || 0}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span style={{ color: theme.colors.text.textSecondary }}>Political Exposure</span>
                <span style={{ color: theme.colors.text.textPrimary, fontWeight: 'bold' }}>{currentDirectionCounts['politics'] || 0}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span style={{ color: theme.colors.text.textSecondary }}>Business Exposure</span>
                <span style={{ color: theme.colors.text.textPrimary, fontWeight: 'bold' }}>{currentDirectionCounts['business'] || 0}</span>
              </div>
              <div className="flex justify-between items-center text-[13px]">
                <span style={{ color: theme.colors.text.textSecondary }}>Networking</span>
                <span style={{ color: theme.colors.text.textPrimary, fontWeight: 'bold' }}>{currentDirectionCounts['network'] || 0}</span>
              </div>
            </div>
          </div>

          <div 
            style={{
              padding: '18px',
              borderRadius: '22px',
              background: 'rgba(16,28,23,0.86)',
              border: '1px solid rgba(219,191,128,0.14)',
            }}
          >
            <div style={{ fontSize: '11px', letterSpacing: '0.14em', color: theme.colors.text.textMuted, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '12px' }}>
              Recent Life Records
            </div>
            {recordCount === 0 ? (
              <div style={{ fontSize: '13px', color: theme.colors.text.textMuted, fontStyle: 'italic' }}>
                No life records yet. Your first opportunity will create one.
              </div>
            ) : (
              <div style={{ fontSize: '13px', color: theme.colors.text.textSecondary }}>
                You have {recordCount} life records. Check your Home dossier to review them.
              </div>
            )}
          </div>

          <div 
            style={{
              padding: '14px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              fontSize: '11px',
              color: theme.colors.text.textMuted,
              lineHeight: 1.5
            }}
          >
            Later versions will add NPC competitors, deadlines, player competition, party invitations, and business openings.
          </div>
        </div>
      </div>

      {selectedOpp && (
        <OpportunityModal 
          opportunity={selectedOpp} 
          onClose={() => setSelectedOpp(null)} 
          onResolve={handleResolve} 
        />
      )}

      {oppResult && (
        <OpportunityResultModal 
          result={oppResult} 
          onClose={handleCloseResult} 
        />
      )}
    </div>
  );
}
