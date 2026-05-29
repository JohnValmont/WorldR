'use client';

// ── Aethon World Map — detailed country SVG paths ──────────────────────────────
// Coordinate space: 1024 × 512 (equirectangular world map)
// All colours are dark-navy variants so land stands out clearly from ocean.

const BORDER = 'rgba(68,148,255,0.78)';
const BORDER_SM = 'rgba(68,148,255,0.65)';
// strokeWidth values are large because the SVG is scaled down inside a ~300px circle
// (scale ≈ 0.30×, so SW 4 → ~1.2 px on screen, SW 6 → ~1.8 px on screen)
const SW = '4';   // major nations
const SW2 = '3.5'; // medium
const SW3 = '3';  // tiny

function MapPaths() {
  return (
    <>
      {/* ═══════ VARELIA ═══════ */}
      {/* Norhaven */}
      <path fill="#172c5e" stroke={BORDER} strokeWidth={SW2} d="M18,38 L44,30 L72,28 L90,40 L94,58 L84,74 L60,87 L38,90 L18,76 L10,58 Z"/>
      {/* Arkenfall */}
      <path fill="#122348" stroke={BORDER} strokeWidth={SW} d="M84,40 L112,34 L142,33 L164,44 L170,66 L160,90 L142,110 L116,117 L95,104 L84,74 L86,58 Z"/>
      {/* Orinth (tiny) */}
      <path fill="#162a58" stroke={BORDER_SM} strokeWidth={SW3} d="M58,72 L80,67 L87,82 L73,92 L54,90 L49,78 Z"/>
      {/* Talmere */}
      <path fill="#102040" stroke={BORDER_SM} strokeWidth={SW2} d="M40,90 L66,92 L73,108 L70,128 L52,138 L36,130 L30,114 L34,98 Z"/>
      {/* Torland */}
      <path fill="#152958" stroke={BORDER} strokeWidth={SW} d="M10,130 L36,128 L70,126 L80,144 L77,164 L63,180 L44,190 L20,184 L8,166 L6,148 Z"/>
      {/* Keldoria — large */}
      <path fill="#1a3068" stroke={BORDER} strokeWidth={SW} d="M95,104 L116,117 L142,110 L168,120 L192,128 L214,146 L222,168 L225,196 L218,222 L200,242 L180,256 L154,268 L126,272 L100,260 L80,242 L76,214 L73,186 L74,163 L78,142 L88,122 Z"/>
      {/* Silveria (narrow strip) */}
      <path fill="#0e1e3e" stroke={BORDER_SM} strokeWidth={SW3} d="M0,164 L14,160 L20,178 L17,220 L13,256 L6,274 L0,285 Z"/>
      {/* Eryndor */}
      <path fill="#142756" stroke={BORDER} strokeWidth={SW} d="M18,268 L46,260 L78,264 L104,272 L112,290 L110,316 L98,342 L78,358 L54,370 L26,364 L10,350 L6,324 L10,296 Z"/>
      {/* Greyport (tiny) */}
      <path fill="#162a5a" stroke={BORDER_SM} strokeWidth={SW3} d="M123,250 L150,244 L156,260 L140,270 L120,267 L114,256 Z"/>
      {/* Drennia */}
      <path fill="#112246" stroke={BORDER} strokeWidth={SW} d="M118,267 L154,267 L180,260 L190,282 L184,308 L166,326 L140,332 L118,318 L108,300 L112,280 Z"/>
      {/* Westmark */}
      <path fill="#1a3068" stroke={BORDER} strokeWidth={SW} d="M110,300 L140,332 L166,326 L178,344 L170,360 L150,372 L126,372 L100,362 L93,344 L98,320 Z"/>
      {/* Vestria */}
      <path fill="#142756" stroke={BORDER} strokeWidth={SW} d="M194,152 L220,148 L248,158 L266,180 L266,208 L254,232 L235,252 L213,256 L192,242 L188,218 L190,188 Z"/>
      {/* Valdoria — large */}
      <path fill="#112246" stroke={BORDER} strokeWidth={SW} d="M164,44 L198,36 L230,33 L262,36 L286,52 L292,78 L288,106 L273,132 L251,152 L228,162 L202,166 L176,158 L163,140 L160,114 L162,86 Z"/>

      {/* ═══════ AZHARA ═══════ */}
      {/* Drakoria — large */}
      <path fill="#0e2245" stroke={BORDER} strokeWidth={SW} d="M238,212 L270,204 L312,200 L344,208 L372,224 L382,250 L378,278 L365,304 L347,326 L323,344 L296,352 L268,348 L248,330 L238,308 L232,280 L232,254 Z"/>
      {/* Zehra */}
      <path fill="#132550" stroke={BORDER} strokeWidth={SW} d="M278,318 L322,313 L350,326 L358,348 L344,368 L320,382 L292,384 L272,370 L267,350 L272,330 Z"/>
      {/* Solmere */}
      <path fill="#0e2245" stroke={BORDER} strokeWidth={SW} d="M344,344 L380,341 L412,350 L418,368 L411,386 L390,399 L364,402 L340,391 L332,371 L336,353 Z"/>
      {/* Astralis — large */}
      <path fill="#142858" stroke={BORDER} strokeWidth={SW} d="M340,208 L370,198 L406,192 L436,196 L462,210 L472,234 L468,262 L455,288 L440,308 L420,326 L397,339 L370,346 L347,340 L323,326 L318,302 L322,276 L330,250 L338,232 Z"/>
      {/* Velis (tiny) */}
      <path fill="#0e2245" stroke={BORDER_SM} strokeWidth={SW3} d="M370,120 L393,115 L403,128 L400,142 L380,146 L368,135 Z"/>
      {/* Asterra / Corwyn area */}
      <path fill="#132550" stroke={BORDER_SM} strokeWidth={SW3} d="M395,120 L430,115 L448,125 L448,142 L432,150 L408,152 L395,140 Z"/>
      {/* Terenis */}
      <path fill="#0e2040" stroke={BORDER} strokeWidth={SW2} d="M450,110 L488,107 L522,110 L535,124 L533,142 L512,150 L483,154 L458,147 L447,132 L448,117 Z"/>
      {/* Virelia */}
      <path fill="#162a58" stroke={BORDER} strokeWidth={SW} d="M426,142 L462,137 L496,137 L512,150 L513,166 L502,182 L480,190 L457,186 L437,175 L424,161 Z"/>
      {/* Novara — large */}
      <path fill="#1a3268" stroke={BORDER} strokeWidth={SW} d="M448,144 L482,139 L513,137 L546,141 L578,155 L594,178 L596,207 L591,236 L579,262 L562,283 L543,299 L519,312 L493,316 L468,311 L449,296 L438,272 L432,246 L436,217 L441,192 L444,168 Z"/>
      {/* Kitaros */}
      <path fill="#0e2040" stroke={BORDER} strokeWidth={SW2} d="M560,234 L591,230 L606,245 L603,263 L588,276 L563,274 L547,261 L547,245 Z"/>
      {/* Lumos */}
      <path fill="#132550" stroke={BORDER} strokeWidth={SW2} d="M546,265 L580,261 L600,276 L597,298 L580,313 L558,316 L541,302 L538,283 Z"/>
      {/* Altaria */}
      <path fill="#0e2245" stroke={BORDER} strokeWidth={SW} d="M452,319 L490,313 L525,316 L550,330 L553,355 L545,378 L527,395 L503,403 L478,403 L455,390 L445,366 L444,342 Z"/>

      {/* ═══════ NORVANE ═══════ */}
      {/* Norvane Federation — large */}
      <path fill="#162a58" stroke={BORDER} strokeWidth={SW} d="M661,30 L702,26 L741,26 L775,32 L806,42 L832,58 L839,80 L834,107 L820,130 L800,148 L772,164 L743,169 L714,165 L686,152 L666,133 L656,108 L653,81 L657,57 Z"/>
      {/* Aragua */}
      <path fill="#0e2245" stroke={BORDER} strokeWidth={SW} d="M617,168 L656,162 L686,156 L714,170 L724,196 L720,224 L710,248 L693,264 L667,274 L641,276 L620,262 L610,238 L610,210 Z"/>
      {/* Oceara */}
      <path fill="#142756" stroke={BORDER} strokeWidth={SW} d="M722,172 L763,168 L799,176 L816,194 L816,220 L807,244 L788,261 L764,272 L737,274 L712,260 L709,234 L714,207 Z"/>
      {/* South Coralis */}
      <path fill="#0e2040" stroke={BORDER_SM} strokeWidth={SW2} d="M697,277 L735,272 L753,285 L752,306 L738,320 L712,322 L696,310 L692,294 Z"/>
      {/* Veloria (north right) */}
      <path fill="#1a3268" stroke={BORDER} strokeWidth={SW} d="M942,50 L974,44 L1000,56 L1021,74 L1024,104 L1017,134 L1001,158 L978,172 L953,175 L940,159 L937,126 L936,90 Z"/>
      {/* Elanis / Noralis cluster */}
      <path fill="#0e2040" stroke={BORDER_SM} strokeWidth={SW2} d="M803,292 L840,289 L858,302 L856,320 L841,334 L818,337 L800,324 L798,307 Z"/>
      {/* Sylvari / Temza (tiny SE cluster) */}
      <path fill="#112246" stroke={BORDER_SM} strokeWidth={SW3} d="M826,342 L854,340 L868,352 L866,366 L851,375 L830,374 L818,362 L820,348 Z"/>
      {/* Belvar */}
      <path fill="#132550" stroke={BORDER} strokeWidth={SW2} d="M880,300 L916,296 L939,312 L940,332 L930,348 L909,356 L886,352 L873,337 L872,316 Z"/>
      {/* Zorathia — large */}
      <path fill="#1a3268" stroke={BORDER} strokeWidth={SW} d="M650,322 L698,314 L745,317 L782,323 L820,330 L857,340 L890,352 L900,374 L896,401 L881,428 L858,448 L825,462 L789,468 L756,465 L722,457 L692,442 L667,424 L649,404 L641,380 L641,352 Z"/>
      {/* Dravenor */}
      <path fill="#0e2245" stroke={BORDER} strokeWidth={SW} d="M762,403 L803,394 L845,391 L883,396 L919,407 L947,423 L954,444 L944,468 L926,484 L899,494 L868,500 L837,502 L806,498 L778,488 L760,470 L751,450 L750,424 Z"/>
      {/* Rethoria (far right, partial) */}
      <path fill="#142756" stroke={BORDER} strokeWidth={SW} d="M947,265 L980,272 L1004,294 L1021,326 L1024,360 L1021,396 L1012,426 L1001,452 L983,472 L960,484 L938,492 L933,465 L936,438 L940,408 L938,374 L936,342 L940,312 L947,285 Z"/>

      {/* ═══════ SOLKAR ═══════ */}
      {/* Solmura (tiny) */}
      <path fill="#102040" stroke={BORDER_SM} strokeWidth={SW3} d="M226,363 L255,360 L262,378 L256,402 L240,414 L222,405 L220,388 L224,370 Z"/>
      {/* Korvath */}
      <path fill="#0e2245" stroke={BORDER} strokeWidth={SW} d="M256,364 L290,360 L318,364 L328,381 L323,404 L309,420 L282,427 L261,420 L250,403 L250,382 Z"/>
      {/* Osendi */}
      <path fill="#142756" stroke={BORDER} strokeWidth={SW2} d="M294,382 L330,376 L360,381 L370,400 L362,422 L343,434 L318,436 L293,426 L283,408 L287,394 Z"/>
      {/* Voleari */}
      <path fill="#0e2040" stroke={BORDER_SM} strokeWidth={SW2} d="M347,377 L384,372 L408,384 L413,404 L404,424 L383,436 L355,436 L339,422 L338,402 Z"/>
      {/* Kaelvar — large */}
      <path fill="#1a3268" stroke={BORDER} strokeWidth={SW} d="M226,432 L270,424 L313,422 L350,428 L384,436 L412,446 L438,460 L444,478 L437,498 L420,510 L395,518 L362,520 L326,517 L292,514 L261,508 L238,496 L225,479 L220,458 Z"/>
      {/* Aurelia */}
      <path fill="#112246" stroke={BORDER} strokeWidth={SW} d="M239,438 L279,432 L323,432 L362,438 L400,447 L416,466 L411,488 L397,504 L369,516 L335,520 L300,518 L261,510 L238,498 L227,481 L230,460 Z"/>
      {/* Tyralis */}
      <path fill="#0e2040" stroke={BORDER} strokeWidth={SW} d="M462,444 L495,440 L526,446 L533,464 L524,488 L507,506 L483,513 L462,505 L449,486 L448,464 Z"/>
      {/* Caldris */}
      <path fill="#142756" stroke={BORDER} strokeWidth={SW} d="M510,440 L548,436 L575,444 L582,464 L576,488 L561,504 L534,514 L509,512 L494,496 L491,472 L498,453 Z"/>
      {/* Myrath */}
      <path fill="#0e2245" stroke={BORDER} strokeWidth={SW} d="M540,438 L571,432 L598,442 L607,460 L601,484 L585,500 L562,506 L538,500 L524,483 L523,461 Z"/>
      {/* Zelvat */}
      <path fill="#112246" stroke={BORDER} strokeWidth={SW} d="M548,401 L582,394 L612,404 L619,422 L612,444 L591,454 L562,453 L540,440 L538,421 Z"/>
      {/* Nareth */}
      <path fill="#142756" stroke={BORDER} strokeWidth={SW} d="M572,365 L606,360 L630,373 L634,393 L628,414 L610,428 L582,431 L561,420 L556,402 L560,381 Z"/>
      {/* Valtor */}
      <path fill="#0e2040" stroke={BORDER_SM} strokeWidth={SW2} d="M594,334 L624,329 L646,342 L649,362 L640,378 L621,384 L599,380 L585,366 L584,349 Z"/>
      {/* Kharon */}
      <path fill="#112246" stroke={BORDER_SM} strokeWidth={SW2} d="M609,350 L641,347 L654,363 L653,382 L641,398 L620,403 L604,392 L598,375 Z"/>
      {/* Vastara — large */}
      <path fill="#1a3268" stroke={BORDER} strokeWidth={SW} d="M552,413 L594,408 L632,408 L664,416 L677,434 L676,462 L665,488 L644,506 L619,518 L591,522 L566,518 L544,508 L529,490 L526,467 L530,445 Z"/>

      {/* ═══════ ISLANDS ═══════ */}
      {/* Zahara Isles */}
      <path fill="#112246" stroke={BORDER_SM} strokeWidth={SW3} d="M30,428 L70,422 L102,428 L122,442 L124,458 L113,472 L88,482 L61,483 L36,475 L23,460 L24,444 Z"/>
      {/* Frostholm */}
      <path fill="#142756" stroke={BORDER_SM} strokeWidth={SW3} d="M474,30 L502,26 L528,30 L541,44 L535,62 L516,72 L491,72 L472,61 L469,46 Z"/>
    </>
  );
}

// ── WorldMapGlobe — flat-scroll with sphere shading ────────────────────────────

function WorldMapGlobe() {
  return (
    <div className="relative w-full h-full flex items-center justify-center">

      {/* Keyframe for horizontal scroll */}
      <style>{`
        @keyframes worldScroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      {/* Outer ambient glow behind the globe */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 'clamp(220px, 60%, 350px)',
          aspectRatio: '1 / 1',
          background: 'radial-gradient(circle, rgba(18,60,200,0.12) 0%, transparent 70%)',
          transform: 'scale(1.55)',
        }}
      />

      {/* ── Globe circle ── */}
      <div
        className="relative rounded-full overflow-hidden shrink-0"
        style={{
          width:  'clamp(220px, 60%, 350px)',
          aspectRatio: '1 / 1',
        }}
      >
        {/* Scrolling flat map — two copies for seamless loop */}
        <div
          style={{
            display: 'flex',
            width: '200%',
            height: '100%',
            animation: 'worldScroll 72s linear infinite',
          }}
        >
          {([0, 1] as const).map((idx) => (
            <svg
              key={idx}
              viewBox="0 0 1024 512"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
              style={{ width: '50%', height: '100%', flexShrink: 0, display: 'block' }}
            >
              {/* Ocean */}
              <rect width="1024" height="512" fill="#020917"/>
              {/* All countries */}
              <MapPaths />
            </svg>
          ))}
        </div>

        {/* ── Sphere shading overlay ── */}
        {/* Dark vignette around the edge — creates the 3D globe illusion */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              'radial-gradient(circle at 38% 36%,',
              '  transparent 20%,',
              '  rgba(1,4,18,0.32) 48%,',
              '  rgba(1,3,14,0.72) 70%,',
              '  rgba(0,2,10,0.96) 90%,',
              '  rgba(0,1,8,1) 100%)',
            ].join(' '),
          }}
        />

        {/* ── Fixed grid overlay (lat/lon lines, non-scrolling) ── */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ opacity: 0.14 }}
        >
          {/* Latitude lines (horizontal) */}
          <line x1="0" y1="16.7" x2="100" y2="16.7" stroke="rgba(50,120,240,1)" strokeWidth="0.5"/>
          <line x1="0" y1="33.3" x2="100" y2="33.3" stroke="rgba(50,120,240,1)" strokeWidth="0.5"/>
          <line x1="0" y1="50"   x2="100" y2="50"   stroke="rgba(50,120,240,1)" strokeWidth="0.7"/>
          <line x1="0" y1="66.7" x2="100" y2="66.7" stroke="rgba(50,120,240,1)" strokeWidth="0.5"/>
          <line x1="0" y1="83.3" x2="100" y2="83.3" stroke="rgba(50,120,240,1)" strokeWidth="0.5"/>
        </svg>

        {/* ── Specular highlight (upper-left glint) ── */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '8%', left: '10%',
            width: '38%', height: '38%',
            background: 'radial-gradient(circle at 40% 40%, rgba(255,255,255,0.055) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* ── Globe rim circle ── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width:  'clamp(220px, 60%, 350px)',
          aspectRatio: '1 / 1',
          border: '1.5px solid rgba(52,118,240,0.38)',
          boxShadow: '0 0 28px rgba(22,78,220,0.18), inset 0 0 28px rgba(10,40,180,0.06)',
        }}
      />
    </div>
  );
}

// ── Game pillars ────────────────────────────────────────────────────────────────

const PILLARS = [
  { icon: '🏛️', text: 'Politics & Government' },
  { icon: '📈', text: 'Business & Economy' },
  { icon: '⚔️', text: 'Military & Defense' },
  { icon: '🌍', text: 'Society & Culture' },
];

// ── Auth layout ────────────────────────────────────────────────────────────────

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#050508]">

      {/* ── Left hero panel ─── */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-[#050508] to-[#050508]" />

        {/* Subtle gold grid */}
        <div
          className="absolute inset-0 opacity-[0.016]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(245,158,11,1) 1px, transparent 1px),' +
              'linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />

        {/* Globe — centred in the panel */}
        <div className="absolute inset-0 flex items-center justify-center">
          <WorldMapGlobe />
        </div>

        {/* Top brand */}
        <div className="relative z-10 p-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.28)] rounded-sm shrink-0">
              <span className="text-black font-black text-lg leading-none">W</span>
            </div>
            <div>
              <div className="text-zinc-100 font-extrabold text-xl tracking-[0.2em] leading-none">WORLDr</div>
              <div className="text-amber-500/60 font-mono text-[9px] tracking-[0.25em] uppercase leading-none mt-1">
                Life Simulator
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copy */}
        <div className="relative z-10 mt-auto p-8 pb-10">
          <div className="max-w-xs">
            <div className="text-[10px] text-amber-500/45 font-mono uppercase tracking-[0.25em] mb-3">
              Return to Your Life
            </div>
            <h2 className="text-2xl font-bold text-zinc-100 leading-tight mb-3">
              Welcome Back to<br />
              <span className="text-amber-400">WORLDr</span>
            </h2>
            <p className="text-zinc-500 text-xs leading-relaxed mb-6">
              Continue your political, economic, and social journey in a living world
              where your decisions shape your legacy.
            </p>

            {/* Game pillars */}
            <div className="grid grid-cols-2 gap-2">
              {PILLARS.map((p) => (
                <div
                  key={p.text}
                  className="flex items-center gap-2 px-3 py-2 rounded-sm text-[10px] text-zinc-400"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <span>{p.icon}</span>
                  <span className="font-mono tracking-wide">{p.text}</span>
                </div>
              ))}
            </div>

            <p className="text-zinc-600 font-mono text-[9px] uppercase tracking-widest mt-6">
              One life. One origin. Many paths.
            </p>
          </div>
        </div>

        {/* Version badge */}
        <div className="absolute top-8 right-8 z-10">
          <span className="text-[9px] font-mono text-zinc-700 uppercase tracking-widest border border-zinc-800 px-2 py-1 rounded-sm">
            v0.1 Alpha
          </span>
        </div>
      </div>

      {/* ── Right form panel ─── */}
      <div className="flex flex-col w-full lg:w-[420px] xl:w-[460px] relative overflow-y-auto overflow-x-hidden">
        {/* Panel background */}
        <div className="absolute inset-0 bg-[#080810] border-l border-white/[0.04]" />

        {/* Top gradient stripe */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />

        {/* Mobile logo */}
        <div className="relative z-10 flex lg:hidden items-center gap-3 p-6 pb-0">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center rounded-sm shrink-0">
            <span className="text-black font-black text-base leading-none">W</span>
          </div>
          <div className="text-zinc-100 font-extrabold text-base tracking-[0.2em]">WORLDr</div>
        </div>

        <div className="relative z-10 flex flex-col flex-1 justify-center p-6 lg:p-8 xl:p-10">
          {children}
        </div>

        {/* Bottom footer */}
        <div className="relative z-10 px-6 lg:px-8 pb-4 pt-2">
          <p className="text-zinc-700 text-[10px] font-mono text-center">
            © {new Date().getFullYear()} WORLDr · Political Life Simulator
          </p>
        </div>
      </div>
    </div>
  );
}
