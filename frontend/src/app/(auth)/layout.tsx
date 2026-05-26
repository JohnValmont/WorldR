export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full radial-ambient flex items-center justify-center relative overflow-hidden">
      {/* Ambient decorative elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      {/* Ambient grid */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: 'linear-gradient(#f59e0b 1px, transparent 1px), linear-gradient(90deg, #f59e0b 1px, transparent 1px)',
        backgroundSize: '80px 80px'
      }} />
      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.25)] rounded-sm">
            <span className="text-black font-black text-lg">W</span>
          </div>
          <div>
            <div className="text-zinc-100 font-extrabold text-lg tracking-widest leading-none">WORLDR</div>
            <div className="text-amber-500/80 font-mono text-[9px] tracking-[0.25em] uppercase leading-none mt-1">Sim Engine</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
