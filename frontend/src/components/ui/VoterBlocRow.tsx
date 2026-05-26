'use client';

interface VoterBlocRowProps {
  bloc: {
    code: string;
    name: string;
    population_share: number;
    primary_ideology: string;
    approval: number;
    inflation_sensitivity: number;
    unemployment_sensitivity: number;
    welfare_dependence: number;
    turnout_rate: number;
    issue_priorities: string[];
  };
  compact?: boolean;
}

const IDEOLOGY_COLORS: Record<string, string> = {
  social_democrat: '#e63946', socialist: '#9d0208', centrist: '#6b7280',
  conservative: '#457b9d', nationalist: '#1d3557', libertarian: '#f4a261',
  green: '#2d6a4f', technocratic: '#6a4c93', populist: '#92400e',
};

function SensBar({ value, color = '#f59e0b' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 bg-zinc-900 h-1 border border-zinc-800">
        <div className="h-1 transition-all" style={{ width: `${value * 100}%`, background: color }} />
      </div>
      <span className="text-[8px] font-mono text-zinc-600">{(value * 100).toFixed(0)}%</span>
    </div>
  );
}

export default function VoterBlocRow({ bloc, compact = false }: VoterBlocRowProps) {
  const approvalColor = bloc.approval > 0.6 ? '#34d399' : bloc.approval < 0.4 ? '#f87171' : '#f59e0b';
  const ideologyColor = IDEOLOGY_COLORS[bloc.primary_ideology] || '#6b7280';
  const pop = (bloc.population_share * 100).toFixed(1);

  return (
    <div className="border border-zinc-800 hover:border-zinc-700 transition-colors p-2.5 bg-zinc-950">
      <div className="flex items-start gap-3">
        {/* Ideology accent */}
        <div className="w-1 self-stretch shrink-0" style={{ background: ideologyColor }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-zinc-200 text-xs font-bold">{bloc.name}</span>
            <span className="text-zinc-600 text-[8px] font-mono">{pop}%</span>
            <span
              className="text-[8px] font-mono px-1 py-0.5 border"
              style={{ color: ideologyColor, borderColor: ideologyColor + '40', background: ideologyColor + '15' }}
            >
              {bloc.primary_ideology.replace(/_/g, ' ')}
            </span>
          </div>

          {!compact && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mb-1.5">
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-zinc-600 w-12">Inflation</span>
                <SensBar value={bloc.inflation_sensitivity} color="#f87171" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-zinc-600 w-12">Unemploy.</span>
                <SensBar value={bloc.unemployment_sensitivity} color="#fb923c" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-zinc-600 w-12">Welfare</span>
                <SensBar value={bloc.welfare_dependence} color="#60a5fa" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[8px] text-zinc-600 w-12">Turnout</span>
                <SensBar value={bloc.turnout_rate} color="#a78bfa" />
              </div>
            </div>
          )}

          {!compact && bloc.issue_priorities?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {bloc.issue_priorities.slice(0, 3).map(issue => (
                <span key={issue} className="text-[7px] text-zinc-500 border border-zinc-800 px-1 py-0.5">
                  {issue.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Approval */}
        <div className="text-right shrink-0">
          <div className="text-[8px] text-zinc-600 uppercase">Approval</div>
          <div className="font-mono font-bold text-sm" style={{ color: approvalColor }}>
            {(bloc.approval * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Approval bar */}
      <div className="mt-1.5 ml-4 w-full bg-zinc-900 h-0.5">
        <div
          className="h-0.5 gauge-fill"
          style={{ width: `${bloc.approval * 100}%`, background: approvalColor }}
        />
      </div>
    </div>
  );
}
