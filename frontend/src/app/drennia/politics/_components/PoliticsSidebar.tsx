'use client';
import React from 'react';
import {
  LayoutDashboard, Vote, ScrollText, Users, Flag, Swords, Briefcase,
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
  sublabel: string;
  Icon: React.ElementType;
}

const ITEMS: SidebarItem[] = [
  { id: 'overview',    label: 'Overview',    sublabel: 'Cross-State Summary',  Icon: LayoutDashboard },
  { id: 'elections',   label: 'Elections',   sublabel: 'The Electorate',        Icon: Vote            },
  { id: 'legislature', label: 'Legislature', sublabel: 'Bills & Votes',         Icon: ScrollText      },
  { id: 'assembly',    label: 'Assembly',    sublabel: 'Chamber Composition',   Icon: Users           },
  { id: 'party',       label: 'Party',       sublabel: 'Platform & Members',    Icon: Flag            },
  { id: 'warroom',     label: 'War Room',    sublabel: 'Campaign Actions',      Icon: Swords          },
  { id: 'lobby',       label: 'Lobby',       sublabel: 'Tenders & Petitions',   Icon: Briefcase       },
];

interface PoliticsSidebarProps {
  active: PoliticsSection;
  onSelect: (id: PoliticsSection) => void;
}

export default function PoliticsSidebar({ active, onSelect }: PoliticsSidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-52 shrink-0 border-r border-[#2A2630] bg-[#0D0F14] min-h-full">
      {/* Header label */}
      <div className="px-4 pt-5 pb-3 border-b border-[#2A2630]">
        <div className="text-[9px] font-mono uppercase tracking-[0.28em] text-[#6B6358]">Function</div>
      </div>

      <nav className="flex flex-col py-2">
        {ITEMS.map(({ id, label, sublabel, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={[
                'flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 border-l-2 group',
                isActive
                  ? 'border-terminal-amber bg-terminal-amber/5 text-[#F4EBD6]'
                  : 'border-transparent text-[#A79D8C] hover:text-[#E4DBCA] hover:bg-[#161820]',
              ].join(' ')}
            >
              <Icon
                size={14}
                className={isActive ? 'text-terminal-amber' : 'text-[#6B6358] group-hover:text-[#A79D8C]'}
              />
              <div className="min-w-0">
                <div className={[
                  'text-[11px] font-mono uppercase tracking-[0.12em] leading-none',
                  isActive ? 'text-terminal-amber font-bold' : '',
                ].join(' ')}>
                  {label}
                </div>
                <div className="text-[9px] text-[#6B6358] mt-0.5 truncate">{sublabel}</div>
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
