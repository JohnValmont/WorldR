'use client';

const SENIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  junior: { bg: '#3f3f4620', text: '#a1a1aa' },
  senior: { bg: '#1d355720', text: '#60a5fa' },
  expert: { bg: '#6a4c9320', text: '#c4b5fd' },
};

const ROLE_LABELS: Record<string, string> = {
  campaign_worker: 'Campaign Worker',
  media_advisor: 'Media Advisor',
  policy_economist: 'Policy Economist',
  party_strategist: 'Party Strategist',
  recruitment_officer: 'Recruitment Officer',
  fundraiser: 'Fundraiser',
  parliamentary_whip: 'Parl. Whip',
};

const ROLE_ICONS: Record<string, string> = {
  campaign_worker: '📣', media_advisor: '📡', policy_economist: '📊',
  party_strategist: '🎯', recruitment_officer: '🤝', fundraiser: '💰',
  parliamentary_whip: '⚖️',
};

interface StaffCardProps {
  staff: {
    id: string;
    role: string;
    name: string;
    seniority: string;
    is_ai: boolean;
    monthly_salary: number;
    loyalty: number;
    ideology_alignment: number;
    skill_level: number;
    experience_months: number;
    last_action?: string;
  };
  onFire?: (staffId: string) => void;
  canFire?: boolean;
}

function MicroBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-10 bg-zinc-900 h-1 border border-zinc-800">
      <div className="h-1" style={{ width: `${value * 100}%`, background: color }} />
    </div>
  );
}

export default function StaffCard({ staff, onFire, canFire }: StaffCardProps) {
  const sCol = SENIORITY_COLORS[staff.seniority] || SENIORITY_COLORS.junior;
  const salary = Number(staff.monthly_salary);
  const fmtSalary = salary >= 1000000 ? `$${(salary / 1000000).toFixed(1)}M` :
    salary >= 1000 ? `$${(salary / 1000).toFixed(0)}K` : `$${salary}`;

  return (
    <div className="border border-zinc-800 hover:border-zinc-700 transition-colors p-2.5 bg-zinc-950">
      <div className="flex items-start gap-2.5">
        {/* Role icon */}
        <div className="text-lg shrink-0 mt-0.5">{ROLE_ICONS[staff.role] || '👤'}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-zinc-200 text-xs font-bold truncate">{staff.name}</span>
            <span
              className="text-[8px] font-mono px-1 py-0.5 border uppercase shrink-0"
              style={{ background: sCol.bg, color: sCol.text, borderColor: sCol.text + '40' }}
            >
              {staff.seniority}
            </span>
            {staff.is_ai && (
              <span className="text-[7px] text-zinc-600 border border-zinc-800 px-1 py-0.5">AI</span>
            )}
          </div>
          <div className="text-[9px] text-zinc-500 mb-1.5">
            {ROLE_LABELS[staff.role] || staff.role}
            {staff.experience_months > 0 && ` · ${staff.experience_months}mo exp`}
          </div>

          <div className="grid grid-cols-3 gap-x-2 gap-y-0.5">
            <div>
              <div className="text-[7px] text-zinc-700 uppercase">Loyalty</div>
              <MicroBar value={staff.loyalty} color="#34d399" />
            </div>
            <div>
              <div className="text-[7px] text-zinc-700 uppercase">Skill</div>
              <MicroBar value={staff.skill_level} color="#60a5fa" />
            </div>
            <div>
              <div className="text-[7px] text-zinc-700 uppercase">Align.</div>
              <MicroBar value={staff.ideology_alignment} color="#c4b5fd" />
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[8px] text-zinc-600 uppercase">Salary</div>
          <div className="text-amber-400 text-xs font-mono font-bold">{fmtSalary}</div>
          <div className="text-[7px] text-zinc-700">/month</div>
        </div>
      </div>

      {staff.last_action && (
        <div className="mt-1.5 text-[8px] text-zinc-600 border-t border-zinc-900 pt-1 truncate">
          Last: {staff.last_action}
        </div>
      )}

      {canFire && onFire && (
        <button
          onClick={() => onFire(staff.id)}
          className="mt-2 w-full text-[9px] text-red-500 border border-red-900/50 hover:border-red-700 hover:bg-red-950/20 py-1 font-mono uppercase tracking-wider transition-colors"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
