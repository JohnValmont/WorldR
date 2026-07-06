'use client';
import React, { useState } from 'react';
import { DOCTRINES, type Doctrine, type Tenet } from '../_lib/doctrines';
import { SEGMENT_PERSONAS } from '../_lib/identity';
import PlatformBars from './PlatformBars';

interface DoctrineGalleryProps {
  selectedDoctrineId: string | null;
  selectedTenetId: string | null;
  onSelectDoctrine: (id: string) => void;
  onSelectTenet: (id: string | null) => void;
}

export default function DoctrineGallery({
  selectedDoctrineId,
  selectedTenetId,
  onSelectDoctrine,
  onSelectTenet,
}: DoctrineGalleryProps) {
  const selected = DOCTRINES.find((d) => d.id === selectedDoctrineId) ?? null;

  return (
    <div className="space-y-6">
      {/* ── Doctrine grid ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {DOCTRINES.map((doctrine) => {
          const isSelected = selectedDoctrineId === doctrine.id;
          return (
            <button
              key={doctrine.id}
              onClick={() => {
                onSelectDoctrine(doctrine.id);
                onSelectTenet(null); // reset tenet on doctrine change
              }}
              className={[
                'relative text-left p-4 rounded-xl border transition-all duration-150 focus:outline-none',
                isSelected
                  ? 'border-[#e8752a] bg-[#1e1a14] shadow-[0_0_0_1px_rgba(232,117,42,0.3)]'
                  : 'border-[#252637] bg-[#1c1d2e] hover:border-[#e8752a]/40 hover:bg-[#1e1f30]',
              ].join(' ')}
            >
              {/* Selected indicator dot */}
              {isSelected && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#e8752a]" />
              )}

              {/* Glyph + name */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl leading-none">{doctrine.glyph}</span>
                <div
                  className={[
                    'text-sm font-bold leading-tight',
                    isSelected ? 'text-white' : 'text-[#c4c6d8]',
                  ].join(' ')}
                >
                  {doctrine.name}
                </div>
              </div>

              {/* Blurb */}
              <p className="text-[11px] text-[#6b6d8a] leading-relaxed mb-3">
                {doctrine.blurb}
              </p>

              {/* Natural segment affinity tags */}
              <div className="flex flex-wrap gap-1">
                {doctrine.naturalSegments.length === 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-[#1a1b2e] text-[#4a4c60] border border-[#252637]">
                    No strong lean
                  </span>
                ) : (
                  doctrine.naturalSegments.map((seg) => {
                    const persona = SEGMENT_PERSONAS[seg];
                    return (
                      <span
                        key={seg}
                        className="text-[10px] px-2 py-0.5 rounded font-medium"
                        style={{
                          background: `${persona?.color}22`,
                          color: persona?.color || '#8b8da8',
                          border: `1px solid ${persona?.color}44`,
                        }}
                      >
                        {persona?.nickname || seg}
                      </span>
                    );
                  })
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Preview panel (shown when a doctrine is selected) ── */}
      {selected && (
        <div className="rounded-xl border border-[#e8752a]/30 bg-[#1a1b2e] p-5 space-y-5">
          {/* Platform preview */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#e8752a] font-semibold mb-3">
              {selected.name} · Platform Preview
            </div>
            <PlatformBars platform={selected.platform} />
          </div>

          {/* Tenet picker */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#6b6d8a] font-semibold mb-2">
              Choose a Tenet <span className="text-[#4a4c60] normal-case tracking-normal">(optional — can be set later)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selected.tenets.map((tenet) => {
                const isChosen = selectedTenetId === tenet.id;
                const persona = SEGMENT_PERSONAS[tenet.targetSegment];
                return (
                  <button
                    key={tenet.id}
                    onClick={() => onSelectTenet(isChosen ? null : tenet.id)}
                    className={[
                      'text-left p-3 rounded-lg border transition-all duration-150 focus:outline-none',
                      isChosen
                        ? 'border-[#e8752a]/70 bg-[#1e1a14]'
                        : 'border-[#252637] bg-[#13141f] hover:border-[#e8752a]/30',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={[
                          'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                          tenet.type === 'intensify'
                            ? 'bg-[#3A6A8A]/20 text-[#5a9aba]'
                            : 'bg-[#4D8C6A]/20 text-[#4D8C6A]',
                        ].join(' ')}
                      >
                        {tenet.type}
                      </span>
                      {isChosen && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#e8752a] ml-auto" />
                      )}
                    </div>
                    <div
                      className={[
                        'text-sm font-semibold leading-tight mb-1',
                        isChosen ? 'text-white' : 'text-[#c4c6d8]',
                      ].join(' ')}
                    >
                      {tenet.name}
                    </div>
                    <p className="text-[10px] text-[#6b6d8a] leading-relaxed mb-2">
                      {tenet.description}
                    </p>
                    {persona && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{
                          background: `${persona.color}22`,
                          color: persona.color,
                          border: `1px solid ${persona.color}44`,
                        }}
                      >
                        → {persona.nickname}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedTenetId && (
              <button
                onClick={() => onSelectTenet(null)}
                className="mt-2 text-[10px] text-[#4a4c60] hover:text-[#6b6d8a] underline"
              >
                Clear tenet selection
              </button>
            )}
          </div>

          {/* Signature action preview */}
          <div className="pt-3 border-t border-[#252637]">
            <div className="text-[10px] uppercase tracking-widest text-[#6b6d8a] font-semibold mb-2">
              Signature Action
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-[#13141f] border border-[#e8752a]/20">
              <div className="flex-1">
                <div className="text-sm font-bold text-white mb-0.5">
                  {selected.signatureAction.title}
                </div>
                <div className="text-[10px] text-[#8b8da8] mb-1">
                  {selected.signatureAction.description}
                </div>
              </div>
              <span className="shrink-0 px-2 py-1 rounded bg-[#e8752a] text-white text-[11px] font-bold">
                {selected.signatureAction.apCost} AP
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
