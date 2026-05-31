'use client';
import { livingWorldTheme as theme } from '../../../styles/livingWorldTheme';
import PersonalDossierPanel from '../../../components/living-world/PersonalDossierPanel';
import OpportunityPreviewPanel from '../../../components/living-world/OpportunityPreviewPanel';
import WorldPulsePanel from '../../../components/living-world/WorldPulsePanel';
import RecordsStrip from '../../../components/living-world/RecordsStrip';

export default function DrenniaHomePage() {
  return (
    <div className="w-full flex flex-col pb-12">
      {/* Page Title Area */}
      <div className="mb-[18px]">
        <h1 
          className="tracking-tight"
          style={{
            fontSize: '28px', // Tailwind will handle mobile sizing if needed, or we rely on CSS, but inline is fine for demo
            fontWeight: 700,
            color: theme.colors.text.textPrimary,
            marginBottom: '4px'
          }}
        >
          Drennia Life Desk
        </h1>
        <p 
          style={{
            fontSize: '14px',
            color: theme.colors.text.textSecondary
          }}
        >
          Your first view of Drennia’s living world — your identity, first opportunities, records, and the country around you.
        </p>
      </div>

      {/* Main Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)_360px] gap-[18px] items-start">
        {/* Left Column: Dossier */}
        <div className="order-1">
          <PersonalDossierPanel />
        </div>
        
        {/* Center Column: Opportunity Preview */}
        <div className="order-2">
          <OpportunityPreviewPanel />
        </div>
        
        {/* Right Column: World Pulse */}
        <div className="order-3">
          <WorldPulsePanel />
        </div>
      </div>

      {/* Bottom: Records Strip */}
      <RecordsStrip />
    </div>
  );
}
