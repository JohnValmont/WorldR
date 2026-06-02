'use client';
import { useRouter } from 'next/navigation';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

interface CitizenFileLivePreviewProps {
  formData: any;
}

// Logic isolated for clarity
export const calculateFactors = (data: any) => {
  let cred = 35;
  let cha = 35;
  let inf = 20;
  let res = 15;
  
  let npc = 'Pending selection';
  let obligation = 'Pending selection';
  let vuln = 'Pending selection';
  let fam = 'Pending selection';
  let earlyLeaning = 'Pending selection';

  // State
  if (data.homeState === 'Drennport State') fam = 'Capital politics, royal institutions, bureaucracy';
  else if (data.homeState === 'Ironvale State') fam = 'Factories, unions, manufacturing';
  else if (data.homeState === 'Greenmere State') fam = 'Rural communities, local councils, farms';
  else if (data.homeState === 'Westport State') fam = 'Ports, trade, stock market';

  // Household
  switch(data.householdBackground) {
    case 'Struggling Household': cred+=2; cha+=2; inf-=3; res-=6; obligation='Family pressure'; vuln='Low resources'; break;
    case 'Stable Middle-Class Household': cred+=3; cha+=1; inf+=1; res+=2; obligation='None'; vuln='Limited network'; break;
    case 'Business Household': cred+=1; inf+=5; res+=8; obligation='Business obligation risk'; vuln='Corporate-backed attack risk'; break;
    case 'Civil Service Household': cred+=5; cha-=1; inf+=4; res+=1; obligation='Institutional loyalty'; vuln='Insider reputation risk'; break;
    case 'Military Household': cred+=3; inf+=3; res+=1; obligation='Security establishment tie'; vuln='Rigid public image'; break;
    case 'Political Household': cred+=1; cha+=1; inf+=8; res+=3; obligation='Family political network'; vuln='Nepotism attack risk'; break;
  }

  // Childhood Mark
  switch(data.childhoodMark) {
    case 'Always Watching Adults Talk Power': inf+=2; cred+=1; break;
    case 'Had to Earn Money Early': res+=2; cred+=1; break;
    case 'Protected Younger Family Members': cred+=3; res-=1; break;
    case 'Moved Between Towns': cha+=3; inf+=1; break;
    case 'Lived Near Institutions': cred+=2; inf+=2; break;
  }

  // Reputation
  switch(data.pre18Reputation) {
    case 'School Representative': cred+=3; cha+=3; inf+=2; break;
    case 'Debate Winner': cred+=2; cha+=4; inf+=1; break;
    case 'Community Helper': cred+=4; cha+=1; inf+=2; break;
    case 'Young Hustler': cred-=1; cha+=2; inf+=1; res+=4; break;
    case 'Top Student': cred+=5; cha-=1; inf+=1; break;
    case 'Cadet / Youth Corps': cred+=3; cha+=1; inf+=2; break;
    case 'Online Creator': cred-=1; cha+=5; inf+=2; vuln='Public controversy risk'; break;
  }

  // Supporter
  switch(data.firstSupporter) {
    case 'Teacher Mentor': cred+=3; npc='Teacher Mentor'; break;
    case 'Local Councillor': inf+=4; npc='Local Councillor'; obligation=obligation==='None'||obligation==='Pending selection'?'Political favor obligation':obligation; break;
    case 'Business Patron': res+=5; inf+=3; npc='Business Patron'; obligation=obligation==='None'||obligation==='Pending selection'?'Business obligation':obligation; break;
    case 'Union Organizer': inf+=3; cha+=2; npc='Union Organizer'; obligation=obligation==='None'||obligation==='Pending selection'?'Labour obligation':obligation; break;
    case 'Journalist Contact': cha+=3; inf+=2; npc='Journalist Contact'; vuln=vuln==='None'||vuln==='Pending selection'?'Media exposure risk':vuln; break;
    case 'Military Officer': cred+=2; inf+=3; npc='Military Officer'; break;
    case 'Religious / Community Elder': cred+=2; cha+=1; inf+=2; npc='Community Elder'; break;
  }

  // Burden
  switch(data.earlyBurden) {
    case 'Family Debt': res-=5; obligation='Family debt'; vuln='Money pressure'; break;
    case 'Sick Parent / Family Care': cred+=2; res-=3; obligation='Family care'; vuln='High personal expenses'; break;
    case 'Public Embarrassment': cred-=2; cha-=1; vuln='Public embarrassment'; break;
    case 'Scholarship Pressure': cred+=3; res-=1; obligation='Academic pressure'; break;
    case 'No Major Burden': res+=1; vuln=vuln==='Pending selection'?'None recorded':vuln; break;
  }

  // First Ambition
  switch(data.firstAmbition) {
    case 'To Be Respected': cred+=2; earlyLeaning='Credibility focused'; break;
    case 'To Be Heard': cha+=2; earlyLeaning='Charisma focused'; break;
    case 'To Know Powerful People': inf+=2; earlyLeaning='Influence focused'; break;
    case 'To Never Be Poor Again': res+=2; earlyLeaning='Resource focused'; break;
    case 'To Build Something Own': res+=1; inf+=1; earlyLeaning='Business path'; break;
    case 'To Change the Country': cred+=1; cha+=1; earlyLeaning='Politics path'; break;
  }

  // Clamp
  const clamp = (val: number) => Math.max(0, Math.min(100, val));
  
  return {
    factors: { credibility: clamp(cred), charisma: clamp(cha), influence: clamp(inf), resources: clamp(res) },
    story: { firstNpcContact: npc, firstObligation: obligation, firstVulnerability: vuln, homeStateFamiliarity: fam, earlyLeaning }
  };
};

export default function LiveCitizenDossier({ formData }: CitizenFileLivePreviewProps) {
  const router = useRouter();
  const { factors, story } = calculateFactors(formData);

  const isComplete = formData.name && formData.homeState && formData.householdBackground && formData.childhoodMark && formData.pre18Reputation && formData.firstSupporter && formData.earlyBurden && formData.firstAmbition;

  const handleCreate = () => {
    if (!isComplete) return;

    const file = {
      id: `cit_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: formData.name,
      age: 18,
      motherland: 'Drennia',
      capital: 'Drennport',
      continent: 'Varelia',
      homeState: formData.homeState,
      householdBackground: formData.householdBackground,
      childhoodMark: formData.childhoodMark,
      pre18Reputation: formData.pre18Reputation,
      firstSupporter: formData.firstSupporter,
      earlyBurden: formData.earlyBurden,
      firstAmbition: formData.firstAmbition,
      factors,
      firstNpcContact: story.firstNpcContact,
      firstObligation: story.firstObligation,
      firstVulnerability: story.firstVulnerability,
      homeStateFamiliarity: story.homeStateFamiliarity,
      earlyLeaning: story.earlyLeaning,
      personalMoney: 1000000,
      wealth: 1000000, // alias — business layer reads `wealth`
      obligations: [],
      vulnerabilities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(file));
    localStorage.setItem('worldr_character_origin_v1', JSON.stringify(file));
    localStorage.setItem('worldr_living_world_entry_v1', 'true');

    router.push('/drennia/home');
  };

  const renderMeter = (label: string, value: number, color: string) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span style={{ fontSize: '11px', color: theme.colors.text.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontSize: '12px', color: theme.colors.text.textPrimary, fontWeight: 'bold' }}>{value}</span>
      </div>
      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
        <div 
          style={{ 
            height: '100%', 
            width: `${value}%`, 
            background: color,
            borderRadius: '3px',
            boxShadow: `0 0 8px ${color}80`
          }} 
        />
      </div>
    </div>
  );

  return (
    <div 
      className="w-full flex flex-col sticky top-7"
      style={{
        padding: '20px',
        borderRadius: '24px',
        background: 'rgba(16, 28, 23, 0.90)',
        border: '1px solid rgba(219,191,128,0.16)',
        minHeight: '640px'
      }}
    >
      <div 
        style={{
          fontSize: '11px',
          letterSpacing: '0.14em',
          color: theme.colors.text.textMuted,
          textTransform: 'uppercase',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}
      >
        LIVE DOSSIER
      </div>

      <div className="flex-1 flex flex-col">
        {/* Core Identity */}
        <div className="mb-6">
          <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: theme.colors.text.textPrimary, minHeight: '32px' }}>
            {formData.name || 'Pending...'}
          </h3>
          <div style={{ fontSize: '13px', color: theme.colors.text.textSecondary, marginTop: '4px' }}>
            Age 18 · {formData.homeState || 'Unknown State'}
          </div>
          <div style={{ fontSize: '13px', color: theme.colors.text.textSecondary, marginTop: '2px' }}>
            Motherland: Drennia · Capital: Drennport
          </div>
        </div>

        {/* Factors */}
        <div className="mb-6 p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
          {renderMeter('Credibility', factors.credibility, theme.colors.accents.gold)}
          {renderMeter('Charisma', factors.charisma, '#9d7ad4')}
          {renderMeter('Influence', factors.influence, '#4b83cc')}
          {renderMeter('Resources', factors.resources, theme.colors.accents.emerald)}
        </div>

        {/* Story */}
        <div className="space-y-3 mb-8">
          <div>
            <div style={{ fontSize: '10px', color: theme.colors.text.textMuted, textTransform: 'uppercase' }}>First NPC Contact</div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>{story.firstNpcContact}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: theme.colors.text.textMuted, textTransform: 'uppercase' }}>First Obligation</div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>{story.firstObligation}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: theme.colors.text.textMuted, textTransform: 'uppercase' }}>First Vulnerability</div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>{story.firstVulnerability}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: theme.colors.text.textMuted, textTransform: 'uppercase' }}>Home-State Familiarity</div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>{story.homeStateFamiliarity}</div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: theme.colors.text.textMuted, textTransform: 'uppercase' }}>Early Leaning</div>
            <div style={{ fontSize: '13px', color: theme.colors.text.textPrimary }}>{story.earlyLeaning}</div>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={!isComplete}
          className="w-full transition-all duration-200 mt-auto"
          style={{
            height: '48px',
            borderRadius: '999px',
            background: isComplete ? 'linear-gradient(90deg, #B9853D, #D6B35F)' : 'rgba(255,255,255,0.05)',
            color: isComplete ? '#09130F' : theme.colors.text.textMuted,
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontSize: '14px',
            boxShadow: isComplete ? '0 4px 14px rgba(214,179,95,0.25)' : 'none',
            cursor: isComplete ? 'pointer' : 'not-allowed'
          }}
          onMouseOver={(e) => {
            if (isComplete) e.currentTarget.style.filter = 'brightness(1.1)';
          }}
          onMouseOut={(e) => {
            if (isComplete) e.currentTarget.style.filter = 'brightness(1)';
          }}
        >
          Create Citizen File
        </button>
      </div>
    </div>
  );
}
