'use client';

import React, { useEffect, useState } from 'react';
import { X, TrendingUp, Building2, ShieldCheck, Scale, Banknote } from 'lucide-react';

const STORAGE_KEY = 'worldr_seen_v0_2';

export default function WhatsNewModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Only check localStorage on the client
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      // Small delay to allow initial page render to finish before popping the modal
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setIsClosing(true);
    setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, 'true');
      setIsVisible(false);
    }, 300); // Wait for fade out animation
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleDismiss}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-[#0a0a0a] border border-[#2a2a2a] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />
        
        {/* Header Content */}
        <div className="px-8 pt-8 pb-6 border-b border-[#1a1a1a] flex justify-between items-start bg-gradient-to-b from-amber-900/10 to-transparent">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-500 font-mono mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Pre-Alpha V0.2 Deployed
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 font-serif tracking-wide">
              The Corporate Finance Update
            </h2>
          </div>
          <button 
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-zinc-100 transition-colors p-2 -mr-2 -mt-2 bg-[#111] hover:bg-[#222] rounded-full border border-transparent hover:border-[#333]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-transparent to-black/50">
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            Over the last 1.5 weeks, we have completely overhauled the corporate finance, accounting, and business progression systems in WORLDr. Your economic empire just got a lot more realistic.
          </p>

          <div className="space-y-6">
            <FeatureRow 
              icon={<Building2 size={18} className="text-amber-400" />}
              title="Corporate Banking System"
              desc="Secure capital from the Drennia National Bank. We've introduced Senior Term Loans (TLA) for rapid expansion, Growth Capital for proven operators, and Distressed Bailout Facilities to save failing businesses."
            />
            
            <FeatureRow 
              icon={<Scale size={18} className="text-blue-400" />}
              title="Dynamic Credit Dossiers"
              desc="The banking engine now actively analyzes your company's Character (Reputation), Capacity (Cashflow), Capital (Book Value), and Collateral to dynamically assign a Credit Rating (AAA to D). This rating directly dictates your borrowing power and interest rates."
            />
            
            <FeatureRow 
              icon={<TrendingUp size={18} className="text-emerald-400" />}
              title="Automated Debt Amortization"
              desc="Your corporate debt is now automatically serviced at the end of every month. Principal repayments are mathematically segregated from your operating profit margins to provide accurate, real-world accounting."
            />
            
            <FeatureRow 
              icon={<Banknote size={18} className="text-indigo-400" />}
              title="True Book Value Capitalization"
              desc="Your physical assets (Land Plots, Factories, Production Lines) are now properly capitalized on your balance sheet. Purchasing property no longer 'vaporizes' your cash—it accurately preserves your Net Worth on the ledger."
            />
            
            <FeatureRow 
              icon={<ShieldCheck size={18} className="text-zinc-300" />}
              title="Security & Economy Integrity"
              desc="We've locked down the banking endpoints to prevent infinite money exploits, unauthorized dossier snooping, and race-condition double-dipping. The simulation is mathematically sound."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#1a1a1a] bg-[#050505] flex justify-end">
          <button 
            onClick={handleDismiss}
            className="px-8 py-3 bg-zinc-100 hover:bg-white text-black text-xs uppercase tracking-widest font-bold font-mono transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Acknowledge & Continue
          </button>
        </div>

      </div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex gap-4 items-start p-4 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.1] transition-colors">
      <div className="p-2.5 bg-black rounded-md border border-[#222] shadow-inner flex-shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-zinc-200 text-sm font-semibold mb-1">{title}</h3>
        <p className="text-zinc-500 text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
