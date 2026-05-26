export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full text-amber-50" style={{ backgroundColor: '#111008' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        html, body {
          overflow: auto !important;
          height: auto !important;
          background-color: #111008 !important;
        }

        /* Subtle dot grid */
        .onboarding-bg::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: radial-gradient(circle, rgba(212,169,69,0.07) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
          z-index: 0;
        }

        /* Golden glow blobs */
        .onboarding-bg::after {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 60% 40% at 15% 10%, rgba(212,169,69,0.06) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 85% 90%, rgba(180,130,40,0.05) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .onboarding-card {
          background: rgba(20, 17, 5, 0.85);
          border: 1px solid rgba(212,169,69,0.18);
          box-shadow: 0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,169,69,0.08);
        }

        .onboarding-card-hover:hover {
          border-color: rgba(212,169,69,0.38);
          box-shadow: 0 4px 32px rgba(0,0,0,0.7), 0 0 20px rgba(212,169,69,0.06), inset 0 1px 0 rgba(212,169,69,0.12);
        }

        .golden-input {
          background: rgba(12, 10, 2, 0.7);
          border: 1px solid rgba(212,169,69,0.22);
          color: #f5e6c0;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .golden-input:focus {
          border-color: rgba(212,169,69,0.6);
          box-shadow: 0 0 0 3px rgba(212,169,69,0.08);
        }
        .golden-input::placeholder {
          color: rgba(212,169,69,0.25);
        }
        .golden-input option {
          background: #1a1505;
          color: #f5e6c0;
        }

        .golden-btn {
          background: linear-gradient(135deg, #c9951a 0%, #e8b830 50%, #c9951a 100%);
          color: #1a1000;
          font-weight: 700;
          transition: all 0.2s;
          box-shadow: 0 2px 12px rgba(212,169,69,0.25);
        }
        .golden-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #d9a520 0%, #f5cc40 50%, #d9a520 100%);
          box-shadow: 0 4px 20px rgba(212,169,69,0.4);
          transform: translateY(-1px);
        }
        .golden-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .golden-btn-ghost {
          background: rgba(212,169,69,0.08);
          border: 1px solid rgba(212,169,69,0.22);
          color: #d4a945;
          transition: all 0.2s;
        }
        .golden-btn-ghost:hover:not(:disabled) {
          background: rgba(212,169,69,0.14);
          border-color: rgba(212,169,69,0.40);
        }

        .golden-badge {
          background: rgba(212,169,69,0.12);
          border: 1px solid rgba(212,169,69,0.28);
          color: #d4a945;
        }

        .golden-tab-active {
          background: linear-gradient(135deg, #c9951a, #e8b830);
          color: #1a1000;
          box-shadow: 0 2px 10px rgba(212,169,69,0.3);
        }
        .golden-tab-inactive {
          background: rgba(212,169,69,0.07);
          border: 1px solid rgba(212,169,69,0.16);
          color: rgba(212,169,69,0.55);
        }
        .golden-tab-inactive:hover {
          background: rgba(212,169,69,0.12);
          border-color: rgba(212,169,69,0.28);
          color: rgba(212,169,69,0.8);
        }

        .nation-card-playable {
          background: rgba(20, 17, 5, 0.85);
          border: 1px solid rgba(212,169,69,0.22);
          transition: all 0.2s;
        }
        .nation-card-playable:hover {
          border-color: rgba(212,169,69,0.5);
          box-shadow: 0 0 24px rgba(212,169,69,0.08), inset 0 1px 0 rgba(212,169,69,0.1);
          transform: translateY(-1px);
        }
        .nation-card-locked {
          background: rgba(14, 12, 3, 0.6);
          border: 1px solid rgba(212,169,69,0.08);
          opacity: 0.55;
        }

        .step-badge {
          background: rgba(212,169,69,0.1);
          border: 1px solid rgba(212,169,69,0.25);
          color: #d4a945;
        }

        .color-swatch-active {
          ring: 2px solid rgba(212,169,69,0.9);
          box-shadow: 0 0 0 2px #111008, 0 0 0 4px rgba(212,169,69,0.8);
          transform: scale(1.1);
        }

        .section-box {
          background: rgba(15, 12, 2, 0.7);
          border: 1px solid rgba(212,169,69,0.14);
          border-radius: 16px;
        }

        .error-box {
          background: rgba(80, 10, 10, 0.4);
          border: 1px solid rgba(220,50,50,0.35);
          color: #fca5a5;
        }

        .divider-gold {
          background: linear-gradient(90deg, transparent, rgba(212,169,69,0.25), transparent);
          height: 1px;
        }

        .stat-box {
          background: rgba(20, 17, 5, 0.9);
          border: 1px solid rgba(212,169,69,0.14);
        }

        .ai-badge {
          background: rgba(180,130,40,0.15);
          border: 1px solid rgba(212,169,69,0.25);
          color: #d4a945;
        }

        .locked-badge {
          background: rgba(30, 25, 5, 0.8);
          border: 1px solid rgba(212,169,69,0.12);
          color: rgba(212,169,69,0.4);
        }

        .continent-tab-active {
          background: rgba(212,169,69,0.15);
          border: 1px solid rgba(212,169,69,0.4);
          box-shadow: 0 0 16px rgba(212,169,69,0.08);
        }
        .continent-tab-inactive {
          background: rgba(20,17,5,0.6);
          border: 1px solid rgba(212,169,69,0.1);
        }
        .continent-tab-inactive:hover {
          background: rgba(212,169,69,0.07);
          border-color: rgba(212,169,69,0.2);
        }
      `}} />

      <div className="onboarding-bg relative">
        <div className="relative z-10 w-full flex flex-col items-center justify-start pt-8 pb-20 px-4">

          {/* Nav / brand */}
          <div className="w-full max-w-5xl mb-12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #c9951a, #e8b830)', boxShadow: '0 2px 12px rgba(212,169,69,0.3)' }}>
                  <span className="text-amber-950 font-black text-sm tracking-tight">W</span>
                </div>
                <div>
                  <div className="font-black text-sm tracking-widest" style={{ color: '#d4a945' }}>WORLDR</div>
                  <div className="text-[9px] font-mono tracking-widest" style={{ color: 'rgba(212,169,69,0.35)' }}>AETHON CHRONICLE · v0.1</div>
                </div>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(212,169,69,0.35)' }}>
                Player Setup
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="relative z-10 w-full max-w-5xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
