'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

interface PlaceholderPanelProps {
  title: string;
  text: string;
}

export default function PlaceholderPanel({ title, text }: PlaceholderPanelProps) {
  return (
    <div className="w-full flex justify-center items-center py-20 px-4">
      <div 
        className="w-full max-w-2xl flex flex-col items-center text-center relative overflow-hidden"
        style={{
          padding: '60px 40px',
          borderRadius: theme.effects.radiusLarge,
          background: 'rgba(16,28,23,0.6)',
          border: `1px solid ${theme.colors.borders.borderMuted}`,
          boxShadow: theme.effects.shadowPanel
        }}
      >
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle at 50% -20%, ${theme.colors.accents.gold} 0%, transparent 60%)`
          }}
        />

        <div 
          style={{
            fontSize: '11px',
            letterSpacing: '0.14em',
            color: theme.colors.accents.gold,
            textTransform: 'uppercase',
            fontWeight: 'bold',
            marginBottom: '16px',
            padding: '4px 12px',
            background: 'rgba(214,179,95,0.06)',
            border: '1px solid rgba(214,179,95,0.15)',
            borderRadius: '999px'
          }}
        >
          Coming in next build
        </div>

        <h1 
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: theme.colors.text.textPrimary,
            marginBottom: '16px',
            letterSpacing: '-0.02em'
          }}
        >
          {title}
        </h1>

        <p 
          style={{
            fontSize: '15px',
            lineHeight: 1.6,
            color: theme.colors.text.textSecondary,
            maxWidth: '480px'
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
