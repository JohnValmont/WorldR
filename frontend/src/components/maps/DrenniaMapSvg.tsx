import { useState } from 'react';
import { type DrenniaState, type PowerRoom } from '../../data/livingWorld/drenniaPowerRooms';
import { DRENNIA_STATE_REGIONS, MAP_VIEWBOX, CITY_MARKERS, ROOM_PIN_LOCATIONS } from '../../data/livingWorld/drenniaMapData';

interface DrenniaMapSvgProps {
  rooms: PowerRoom[];
  selectedState: DrenniaState | null;
  onStateSelect: (state: DrenniaState) => void;
  onRoomSelect: (room: PowerRoom) => void;
}

const ROOM_TYPE_COLORS: Record<string, string> = {
  public_debate: '#fde047', // pale gold
  work_contract: '#60a5fa', // steel blue
  local_organizer: '#fb923c', // amber
  business_circle: '#34d399', // green
  community_issue: '#fb923c', // amber
  political_observation: '#fbbf24', // gold
};

export default function DrenniaMapSvg({ rooms, selectedState, onStateSelect, onRoomSelect }: DrenniaMapSvgProps) {
  const [hoveredState, setHoveredState] = useState<DrenniaState | null>(null);
  const [hoveredRoomId, setHoveredRoomId] = useState<string | null>(null);

  // Pre-alpha placeholder warning
  const isPlaceholder = true;

  return (
    <div className="relative w-full aspect-[5/4] sm:aspect-video rounded-xl overflow-hidden" style={{ background: '#07100D', border: '1px solid rgba(255,255,255,0.05)' }}>
      {isPlaceholder && (
        <div style={{ display: 'none' }}>
          {/* PRE-ALPHA PLACEHOLDER MAP — replace with extracted Azgaar/vector map later. */}
        </div>
      )}

      <svg
        viewBox={MAP_VIEWBOX}
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.5))' }}
      >
        {/* Render States */}
        <g className="states">
          {DRENNIA_STATE_REGIONS.map((region) => {
            const isSelected = selectedState === region.id;
            const isHovered = hoveredState === region.id;
            
            return (
              <path
                key={region.id}
                d={region.path}
                data-state={region.id}
                onClick={() => onStateSelect(region.id)}
                onMouseEnter={() => setHoveredState(region.id)}
                onMouseLeave={() => setHoveredState(null)}
                style={{
                  fill: isSelected || isHovered ? region.hoverColor : region.fillColor,
                  stroke: isSelected ? 'rgba(214,179,95,0.8)' : 'rgba(214,179,95,0.32)',
                  strokeWidth: isSelected ? 4 : 2,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  filter: isSelected ? 'drop-shadow(0 0 15px rgba(214,179,95,0.15))' : 'none'
                }}
              />
            );
          })}
          
          {/* Overall country border (simulated by drawing the outer outline if we had it, but for placeholder states border is enough) */}
        </g>

        {/* Render City Markers */}
        <g className="cities">
          {CITY_MARKERS.map(city => (
            <g key={city.id} transform={`translate(${city.x}, ${city.y})`}>
              {city.isCapital ? (
                <>
                  <circle cx="0" cy="0" r="8" fill="#07100D" stroke="#D6B35F" strokeWidth="2" />
                  <circle cx="0" cy="0" r="3" fill="#D6B35F" />
                  <text x="14" y="4" fill="#F4EBD6" fontSize="18" fontWeight="bold" fontFamily="serif" letterSpacing="1">{city.name}</text>
                  <text x="14" y="20" fill="#D6B35F" fontSize="10" fontFamily="mono" opacity="0.8">CAPITAL</text>
                </>
              ) : (
                <>
                  <circle cx="0" cy="0" r="5" fill="#F4EBD6" />
                  <text x="10" y="4" fill="#B9B09B" fontSize="14" fontWeight="600">{city.name}</text>
                </>
              )}
            </g>
          ))}
        </g>

        {/* Render Room Pins */}
        <g className="pins">
          {rooms.map(room => {
            const loc = ROOM_PIN_LOCATIONS[room.id];
            if (!loc) return null;
            
            const pinColor = ROOM_TYPE_COLORS[room.type] || '#D6B35F';
            const isHovered = hoveredRoomId === room.id;
            const isStateSelected = selectedState === room.state || !selectedState;

            if (!isStateSelected && !isHovered) return null;

            return (
              <g 
                key={room.id} 
                transform={`translate(${loc.x}, ${loc.y})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onRoomSelect(room);
                }}
                onMouseEnter={() => setHoveredRoomId(room.id)}
                onMouseLeave={() => setHoveredRoomId(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Pin shadow/glow */}
                <circle cx="0" cy="0" r={isHovered ? "20" : "12"} fill={pinColor} opacity={isHovered ? "0.2" : "0.1"} style={{ transition: 'all 0.2s' }} />
                
                {/* Pin core */}
                <circle cx="0" cy="0" r="6" fill={pinColor} stroke="#07100D" strokeWidth="1.5" />
                
                {/* Pulse effect if active room */}
                <circle cx="0" cy="0" r="6" fill="none" stroke={pinColor} strokeWidth="2">
                  <animate attributeName="r" values="6;16" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
                </circle>

                {/* Tooltip on hover */}
                {isHovered && (
                  <g transform="translate(0, -25)">
                    <rect x="-100" y="-50" width="200" height="40" rx="4" fill="#0C1612" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                    <text x="0" y="-32" fill="#F4EBD6" fontSize="12" fontWeight="bold" textAnchor="middle">{room.title}</text>
                    <text x="0" y="-16" fill="#7E8378" fontSize="10" fontFamily="mono" textAnchor="middle">
                      {room.roles.length} roles · {room.simulatedPlayers.length + 1} present
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
