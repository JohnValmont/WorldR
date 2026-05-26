'use client';
import React from 'react';

interface ModalOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export default function ModalOverlay({ isOpen, onClose, title, children, width = 'max-w-xl' }: ModalOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`w-full ${width} bg-zinc-950 border border-zinc-700 shadow-2xl animate-fade-in-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <h2 className="text-amber-500 font-bold text-xs uppercase tracking-widest">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 text-xs font-mono transition-colors"
          >
            [ESC]
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
