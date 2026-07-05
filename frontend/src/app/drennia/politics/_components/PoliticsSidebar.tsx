'use client';
import React from 'react';
import {
  Home, Flag, Vote, Landmark, Users, Swords, Briefcase,
} from 'lucide-react';

export type PoliticsSection =
  | 'overview'
  | 'elections'
  | 'legislature'
  | 'assembly'
  | 'party'
  | 'warroom'
  | 'lobby';

interface SidebarItem {
  id: PoliticsSection;
  label: string;
  Icon: React.ElementType;
}

const ITEMS: SidebarItem[] = [
  { id: 'overview',    label: 'Home',        Icon: Home     },
  { id: 'party',       label: 'Party',       Icon: Flag     },
  { id: 'elections',   label: 'Elections',   Icon: Vote     },
  { id: 'legislature', label: 'Legislature', Icon: Landmark },
  { id: 'assembly',    label: 'Assembly',    Icon: Users    },
  { id: 'warroom',     label: 'War Room',    Icon: Swords   },
  { id: 'lobby',       label: 'Lobby',       Icon: Briefcase },
];

interface PoliticsSidebarProps {
  active: PoliticsSection;
  onSelect: (id: PoliticsSection) => void;
  myPartyName?: string;
  myPartyNation?: string;
}

export default function PoliticsSidebar({
  active,
  onSelect,
  myPartyName = 'Your Party',
  myPartyNation = 'Ironvale',
}: PoliticsSidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-[168px] shrink-0 bg-[#13141f] min-h-full border-r border-[#252637]">
      {/* Party identity header */}
      <div className="px-4 pt-5 pb-4 border-b border-[#252637]">
        <div className="text-[11px] font-bold text-white leading-tight truncate">{myPartyName}</div>
        <div className="text-[10px] text-[#6b6d8a] mt-0.5 truncate uppercase tracking-wider">{myPartyNation}</div>
      </div>

      <nav className="flex flex-col py-3 gap-0.5 px-2">
        {ITEMS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 w-full text-sm font-medium',
                isActive
                  ? 'bg-[#e8752a] text-white'
                  : 'text-[#8b8da8] hover:text-white hover:bg-[#1e1f30]',
              ].join(' ')}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom spacer */}
      <div className="mt-auto px-4 py-4 border-t border-[#252637]">
        <div className="text-[10px] text-[#4a4c60] uppercase tracking-wider">Political Desk</div>
      </div>
    </aside>
  );
}
