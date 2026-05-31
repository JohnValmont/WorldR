'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

export default function WorldEntryHeader() {
  return (
    <div 
      className="w-full flex flex-col md:flex-row md:items-center justify-between z-20 mb-6 gap-4"
      style={{
        borderRadius: '24px',
        background: 'rgba(16, 28, 23, 0.88)',
        border: '1px solid rgba(219,191,128,0.16)',
        padding: '18px 22px',
      }}
    >
      {/* Left Section */}
      <div className="flex flex-col">
        <h1 
          className="text-2xl font-bold tracking-tight"
          style={{ color: theme.colors.text.textPrimary }}
        >
          WORLDr Entry Registry
        </h1>
        <p 
          className="text-sm mt-1 max-w-xl leading-relaxed"
          style={{ color: theme.colors.text.textSecondary }}
        >
          Choose where your life begins. Your motherland shapes your first institutions, contacts, economy, politics, and opportunities.
        </p>
      </div>

      {/* Right Section */}
      <div className="flex flex-wrap items-center gap-2">
        <div 
          className="flex items-center justify-center whitespace-nowrap"
          style={{
            height: '34px',
            padding: '0 12px',
            borderRadius: '999px',
            border: '1px solid rgba(219,191,128,0.18)',
            background: 'rgba(214,179,95,0.07)',
            fontSize: '12px',
            color: '#B9B09B'
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse mr-2" />
          Pre-Alpha Access Granted
        </div>
        
        <div 
          className="flex items-center justify-center whitespace-nowrap"
          style={{
            height: '34px',
            padding: '0 12px',
            borderRadius: '999px',
            border: '1px solid rgba(219,191,128,0.18)',
            background: 'rgba(214,179,95,0.07)',
            fontSize: '12px',
            color: '#B9B09B'
          }}
        >
          World Build: Drennia Active
        </div>
        
        <div 
          className="flex items-center justify-center whitespace-nowrap"
          style={{
            height: '34px',
            padding: '0 12px',
            borderRadius: '999px',
            border: '1px solid rgba(219,191,128,0.18)',
            background: 'rgba(214,179,95,0.07)',
            fontSize: '12px',
            color: '#B9B09B'
          }}
        >
          Continents: 4
        </div>
      </div>
    </div>
  );
}
