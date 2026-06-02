'use client';

export default function StartPage() {
  return (
    <div className="min-h-screen bg-[#11131A] flex flex-col items-center justify-center p-6 selection:bg-amber-900/50">
      <div className="max-w-md w-full text-center">
        
        <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
          <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
          </svg>
        </div>

        <h1 className="text-3xl font-serif font-bold text-white mb-4 tracking-tight">
          Your WORLDr journey starts here.
        </h1>
        
        <p className="text-zinc-400 text-sm leading-relaxed mb-8">
          Character creation and Living World onboarding will appear here next.
        </p>

        <button 
          disabled 
          className="bg-zinc-800 text-zinc-500 font-semibold uppercase tracking-widest text-xs px-8 py-3.5 rounded-sm cursor-not-allowed border border-zinc-700/50"
        >
          Begin Character Creation
        </button>

      </div>
    </div>
  );
}
