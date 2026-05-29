'use client';
import { useEffect, useRef } from 'react';

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Particles
    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.4 + 0.05,
      color: Math.random() > 0.6 ? '245,158,11' : '148,163,184',
    }));

    const draw = () => {
      time += 0.008;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle grid
      ctx.strokeStyle = 'rgba(255,255,255,0.018)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
        ctx.fill();
      });

      // Connection lines between close particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(245,158,11,${0.04 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animFrame = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-auto" style={{
      background: 'radial-gradient(ellipse at 20% 30%, rgba(15,15,35,1) 0%, rgba(6,6,12,1) 60%, rgba(3,3,8,1) 100%)',
    }}>
      {/* Ambient color bleeds */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.04) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 70%)' }} />

      <ParticleField />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 md:px-10 py-5 border-b border-white/[0.04]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)] rounded-sm shrink-0">
            <span className="text-black font-black text-base leading-none">W</span>
          </div>
          <div>
            <div className="text-zinc-100 font-extrabold text-sm tracking-[0.25em] leading-none">WORLDR</div>
            <div className="text-amber-500/50 font-mono text-[8px] tracking-[0.3em] uppercase leading-none mt-0.5">
              Life Simulator
            </div>
          </div>
        </div>
        <div className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest border border-zinc-800/60 px-2 py-1 rounded-sm">
          v0.1 Alpha
        </div>
      </div>

      {/* Page content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
