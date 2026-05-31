'use client';

export default function WorldLockedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#11140f]">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center rounded-sm"
          style={{ background: 'rgba(212,169,31,0.08)', border: '1px solid rgba(212,169,31,0.2)' }}>
          <svg className="w-8 h-8 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-zinc-200 mb-3 tracking-tight">World Locked</h1>
        <p className="text-zinc-500 text-sm leading-relaxed max-w-sm mx-auto">
          Drennia is not active for play right now.
        </p>
      </div>
    </div>
  );
}
