'use client';
import { livingWorldTheme as theme } from '../../styles/livingWorldTheme';

interface FactorMeterProps {
  label: string;
  value: number;
  max?: number;
}

export default function FactorMeter({ label, value, max = 100 }: FactorMeterProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="flex flex-col justify-center" style={{ height: '54px' }}>
      <div className="flex justify-between items-end mb-2">
        <div 
          className="text-xs uppercase tracking-wider font-semibold"
          style={{ color: theme.colors.text.textSecondary }}
        >
          {label}
        </div>
        <div 
          className="text-sm font-bold font-mono"
          style={{ color: theme.colors.accents.gold }}
        >
          {value}/{max}
        </div>
      </div>
      
      <div 
        className="w-full relative overflow-hidden"
        style={{
          height: '7px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.07)'
        }}
      >
        <div 
          className="absolute top-0 left-0 h-full transition-all duration-700 ease-out"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(90deg, #8F6D2A, #D6B35F)',
            borderRadius: '999px',
            boxShadow: '0 0 10px rgba(214,179,95,0.4)'
          }}
        />
      </div>
    </div>
  );
}
