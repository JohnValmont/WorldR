// WORLDr Closed Alpha trailer: timeline + compositor. renderAt(t) draws the frame at time t.
const CUT = new URLSearchParams(location.search).get('cut') || 'main';
const FPS = 30;
const $ = s => document.querySelector(s);
const tl = gsap.timeline({ paused: true });
let CLIPS = {};

// ── seeded random (deterministic frames) ────────────────────────────────────
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const lerp = (a, b, p) => a + (b - a) * p;

// ── the edit ────────────────────────────────────────────────────────────────
// shot: { at, dur, src, in (s), rate, cam: [s0, s1, ox%, oy%, dx, dy], cap: [label, text] }
const P = 'POLITICS', B = 'BUSINESS', M = 'MULTIPLAYER';
const EDITS = {
  main: {
    dur: 75,
    shots: [
      { at: 12, dur: 3, src: 'nations', in: 1.2, cam: [1.0, 1.07, 50, 45], cap: [P, 'CHOOSE YOUR NATION'] },
      { at: 15, dur: 3, src: 'chamber', in: 0.3, cam: [1.12, 1.2, 85, 40], cap: [P, 'TAKE YOUR SEAT'] },
      { at: 18, dur: 3, src: 'election', in: 3.5, rate: 1.6, cam: [1.24, 1.3, 50, 18], cap: [P, 'WIN YOUR DISTRICT'] },
      { at: 21, dur: 3, src: 'vote', in: 0.9, cam: [1.0, 1.08, 30, 55], cap: [P, 'EVERY VOTE COUNTS'] },
      { at: 24, dur: 3, src: 'coalition', in: 0.4, cam: [1.06, 1.0, 50, 40], cap: [P, 'FORM A COALITION'] },
      { at: 27, dur: 3, src: 'cabinet', in: 0.6, cam: [1.0, 1.07, 45, 40], cap: [P, 'RUN THE COUNTRY'] },
      { at: 30, dur: 3, src: 'economy', in: 0.6, cam: [1.07, 1.0, 55, 45], cap: [P, 'EVERY LAW MOVES THE ECONOMY'] },
      // stutter montage, no captions
      { at: 33.0, dur: 0.625, src: 'desk', in: 2.6, cam: [1.1, 1.14, 40, 50] },
      { at: 33.625, dur: 0.625, src: 'map', in: 1.0, cam: [1.15, 1.2, 45, 50] },
      { at: 34.25, dur: 0.625, src: 'voters', in: 2.0, cam: [1.1, 1.16, 50, 60] },
      { at: 34.875, dur: 0.625, src: 'wire', in: 1.5, cam: [1.12, 1.18, 40, 30] },
      { at: 35.5, dur: 0.625, src: 'budget', in: 2.0, cam: [1.15, 1.2, 40, 40] },
      { at: 36.125, dur: 0.625, src: 'laws', in: 2.5, cam: [1.12, 1.18, 45, 40] },
      { at: 36.75, dur: 0.625, src: 'world', in: 1.0, cam: [1.12, 1.18, 50, 30] },
      { at: 37.375, dur: 0.625, src: 'election', in: 13.5, cam: [1.3, 1.36, 50, 18] },
      { at: 38, dur: 4, src: 'designer', in: 0.6, rate: 1.0, cam: [1.0, 1.06, 60, 45], cap: [B, "BUILD THE CARS THEY'LL BUY"] },
      { at: 42, dur: 4, src: 'intel', in: 0.6, cam: [1.0, 1.07, 50, 35], cap: [B, "SELL IN YOUR NATION'S OWN MARKET"] },
      { at: 46, dur: 4, src: 'sales', in: 0.6, cam: [1.08, 1.0, 45, 35], cap: [B, 'THE LAWS YOU PASS HIT YOUR SALES'] },
      { at: 50, dur: 4, src: 'corridors', in: 0.2, cam: [1.05, 1.12, 55, 55], cap: [M, 'MAKE DEALS. BREAK THEM.'] },
      { at: 54, dur: 4, src: 'world', in: 0.4, cam: [1.0, 1.06, 50, 35], cap: [M, 'THE WORLD IS WATCHING'] },
    ],
    flashes: [5.0, 6.333, 7.667, 9.0, 12, 33.0, 38.0, 58.0, 67.0, 70.0],
    cuts: [15, 18, 21, 24, 27, 30, 42, 46, 50, 54],
    open: [0, 5], flags: [5, 9], logo: [9, 12], road: [58, 67, [58, 60.5, 63, 65]], tag: [67, 70], end: [70, 75],
  },
  short: {
    dur: 30,
    shots: [
      { at: 4.5, dur: 2.0, src: 'nations', in: 2.0, cam: [1.0, 1.06, 50, 45], cap: [P, 'CHOOSE YOUR NATION'] },
      { at: 6.5, dur: 2.0, src: 'election', in: 4.0, rate: 1.8, cam: [1.24, 1.3, 50, 18], cap: [P, 'WIN YOUR DISTRICT'] },
      { at: 8.5, dur: 2.0, src: 'vote', in: 1.6, cam: [1.0, 1.07, 30, 55], cap: [P, 'EVERY VOTE COUNTS'] },
      { at: 10.5, dur: 2.0, src: 'coalition', in: 0.6, cam: [1.06, 1.0, 50, 40], cap: [P, 'FORM A COALITION'] },
      { at: 12.5, dur: 2.0, src: 'cabinet', in: 1.0, cam: [1.0, 1.06, 45, 40], cap: [P, 'RUN THE COUNTRY'] },
      { at: 14.5, dur: 2.2, src: 'designer', in: 1.2, cam: [1.0, 1.05, 60, 45], cap: [B, 'BUILD THE CARS'] },
      { at: 16.7, dur: 2.1, src: 'sales', in: 0.8, cam: [1.07, 1.0, 45, 35], cap: [B, 'FEEL EVERY LAW IN YOUR SALES'] },
      { at: 18.8, dur: 2.2, src: 'corridors', in: 1.4, cam: [1.05, 1.1, 55, 55], cap: [M, 'MAKE DEALS. BREAK THEM.'] },
    ],
    flashes: [3.0, 4.5, 21.0, 24.0],
    cuts: [6.5, 8.5, 10.5, 12.5, 14.5, 16.7, 18.8],
    open: [0, 3], flags: null, logo: [3, 4.5], road: [21, 24, [21, 21.75, 22.5, 23.25]], tag: null, end: [24, 30],
  },
};
const E = EDITS[CUT];

// ── build clip layers and captions ──────────────────────────────────────────
function buildShots() {
  E.shots.forEach((s, i) => {
    const d = document.createElement('div'); d.className = 'clip'; d.id = 'clip' + i;
    d.innerHTML = '<img>'; $('#clips').appendChild(d); s.el = d; s.img = d.firstChild;
    if (s.cap) {
      const c = document.createElement('div'); c.className = 'cap';
      c.innerHTML = `<div class="label"><i></i>${s.cap[0]}</div><div class="text">${s.cap[1]}</div><div class="rule"></div>`;
      $('#captions').appendChild(c);
      const t0 = s.at + 0.12, t1 = s.at + s.dur - 0.22;
      tl.set(c, { visibility: 'visible' }, t0).set(c, { visibility: 'hidden' }, s.at + s.dur);
      tl.fromTo(c.querySelector('.label'), { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.35, ease: 'power3.out' }, t0);
      tl.fromTo(c.querySelector('.text'), { opacity: 0, y: 26, letterSpacing: '0.12em' }, { opacity: 1, y: 0, letterSpacing: '0.02em', duration: 0.55, ease: 'power3.out' }, t0 + 0.06);
      tl.fromTo(c.querySelector('.rule'), { scaleX: 0 }, { scaleX: 1, duration: 0.7, ease: 'power2.out' }, t0 + 0.15);
      tl.to(c, { opacity: 0, duration: 0.18, ease: 'power1.in' }, t1);
      tl.set(c, { opacity: 1 }, s.at + s.dur);
    }
  });
  // caption shade only while gameplay with captions is up
  for (const s of E.shots) if (s.cap) { tl.set('#capshade', { opacity: 1 }, s.at); tl.set('#capshade', { opacity: 0 }, s.at + s.dur); }
}

// ── flashes, cuts ───────────────────────────────────────────────────────────
function buildFx() {
  for (const t of E.flashes) tl.fromTo('#flash', { opacity: 0.85 }, { opacity: 0, duration: 0.45, ease: 'power2.out', immediateRender: false }, t);
  const end = E.end;
  tl.to('#black', { opacity: 1, duration: 1.2, ease: 'power1.in' }, end[1] - 1.2);
}

// ── scenes ──────────────────────────────────────────────────────────────────
function show(id, a, b) { tl.set(id, { visibility: 'visible' }, a).set(id, { visibility: 'hidden' }, b); }
const DUST = [];
function buildOpen() {
  const [a, b] = E.open; show('#s-open', a, b);
  const r = mulberry(11);
  for (let i = 0; i < 70; i++) { const d = document.createElement('div'); d.className = 'dust'; $('#dust').appendChild(d); DUST.push({ el: d, x: r() * 1920, y: r() * 1080, v: 10 + r() * 40, s: .3 + r() * .9, ph: r() * 6.28 }); }
  tl.fromTo('#map', { opacity: 0, scale: 1.0 }, { opacity: 0.55, scale: 1.08, duration: b - a, ease: 'none' }, a);
  const half = (b - a) / 2;
  const line = (id, t0, t1) => {
    tl.fromTo(id, { opacity: 0, y: 18, letterSpacing: '0.16em', filter: 'blur(8px)' }, { opacity: 1, y: 0, letterSpacing: '0.06em', filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' }, t0);
    tl.to(id, { opacity: 0, y: -10, filter: 'blur(6px)', duration: 0.45, ease: 'power2.in' }, t1 - 0.45);
  };
  if (CUT === 'main') { line('#l1', a + 0.3, a + half); line('#l2', a + half + 0.15, b); }
  else { line('#l1', a + 0.1, a + 1.5); line('#l2', a + 1.55, b); }
}
function buildFlags() {
  if (!E.flags) return;
  const [a, b] = E.flags; show('#s-flags', a, b);
  [['#f1', 5.0], ['#f2', 6.333], ['#f3', 7.667]].forEach(([id, t]) => {
    tl.fromTo(id, { opacity: 0, scale: 1.35, y: -30, filter: 'blur(10px)' }, { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power4.out' }, t);
  });
  tl.fromTo('#flagline', { opacity: 0, letterSpacing: '0.6em' }, { opacity: 1, letterSpacing: '0.3em', duration: 0.8, ease: 'power3.out' }, 8.0);
  tl.to('#s-flags', { opacity: 0, duration: 0.3 }, b - 0.3); tl.set('#s-flags', { opacity: 1 }, b);
}
function buildLogo() {
  const [a, b] = E.logo; show('#s-logo', a, b);
  tl.fromTo('#logo', { opacity: 0, scale: 1.25, letterSpacing: '0.45em', filter: 'blur(14px)' }, { opacity: 1, scale: 1, letterSpacing: '0.18em', filter: 'blur(0px)', duration: 1.0, ease: 'expo.out' }, a);
  tl.fromTo('#logo', { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: b - a, ease: 'none' }, a);
  tl.fromTo('#logotag', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, a + 0.45);
  tl.to('#s-logo', { opacity: 0, duration: 0.25 }, b - 0.25); tl.set('#s-logo', { opacity: 1 }, b);
}
function buildRoad() {
  const [a, b, beats] = E.road; show('#s-road', a, b);
  tl.fromTo('#banner', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }, a);
  const ids = ['#rm1', '#rm2', '#rm3', '#rm4'];
  beats.forEach((t0, i) => {
    const t1 = beats[i + 1] ?? b; show(ids[i], t0, t1);
    tl.fromTo(ids[i] + ' .title', { opacity: 0, y: 24, letterSpacing: '0.12em' }, { opacity: 1, y: 0, letterSpacing: '0.04em', duration: 0.45, ease: 'power3.out' }, t0 + 0.05);
    tl.fromTo(ids[i] + ' .sub', { opacity: 0 }, { opacity: 1, duration: 0.4 }, t0 + 0.25);
  });
  const k = (beats[1] - beats[0]) / 2.5; // time scale for the short cut
  // 1: laurel + plaques
  const L = $('#laurel'); let h = '';
  // two laurel branches rising from the bottom around the numeral
  for (const side of [-1, 1]) {
    h += `<path d="M0 150 A150 150 0 0 ${side < 0 ? 1 : 0} ${side * 120} -90" stroke="#B8892A" stroke-width="4" fill="none" class="leaf" opacity="0"/>`;
    for (let i = 0; i < 11; i++) {
      const aDeg = 262 - i * 13, a = aDeg * Math.PI / 180;            // left branch angle (y up)
      const ad = side < 0 ? aDeg : 180 - aDeg, ar = ad * Math.PI / 180;
      const x = 150 * Math.cos(ar), y = -150 * Math.sin(ar);
      const rot = -ad + (side < 0 ? 25 : -25);
      for (const off of [-1, 1]) {
        const lx = x + off * 14 * Math.cos(ar), ly = y - off * 14 * Math.sin(ar);
        h += `<ellipse class="leaf" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" rx="9" ry="24" fill="${off < 0 ? '#E8B84B' : '#F4D58A'}" opacity="0" transform="rotate(${(rot + off * 18).toFixed(0)} ${lx.toFixed(1)} ${ly.toFixed(1)})"/>`;
      }
    }
  }
  h += '<text x="0" y="40" text-anchor="middle" font-family="Cinzel" font-weight="800" font-size="120" fill="#F4D58A" id="lnum" opacity="0">I</text>';
  L.innerHTML = h;
  tl.to('#laurel .leaf', { opacity: 1, duration: 0.1, stagger: 0.016 * k }, beats[0] + 0.05);
  tl.to('#lnum', { opacity: 1, duration: 0.4 }, beats[0] + 0.4 * k);
  tl.fromTo(['#pl1', '#pl2'], { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.18 * k, ease: 'power3.out' }, beats[0] + 0.5 * k);
  // 2: candles + ticker
  const C = $('#candles'); const rc = mulberry(5); let px = 230, s = '';
  for (let i = 0; i < 30; i++) {
    const o = px, c = Math.max(60, Math.min(380, o + (rc() - 0.42) * 70)); px = c;
    const hi = Math.min(o, c) - 10 - rc() * 25, lo = Math.max(o, c) + 10 + rc() * 25, up = c < o, x = 20 + i * 49;
    s += `<g class="cd" opacity="0"><line x1="${x + 14}" x2="${x + 14}" y1="${hi}" y2="${lo}" stroke="${up ? '#4FB286' : '#D9625A'}" stroke-width="2"/><rect x="${x}" y="${Math.min(o, c)}" width="28" height="${Math.max(4, Math.abs(c - o))}" fill="${up ? '#4FB286' : '#D9625A'}" rx="2"/></g>`;
  }
  C.innerHTML = s;
  tl.to('#candles .cd', { opacity: 1, duration: 0.05, stagger: 0.05 * k }, beats[1] + 0.05);
  $('#tick').innerHTML = Array(3).fill('<span>MMW <b class="up">▲ 4.2%</b></span><span>HALE <b class="dn">▼ 1.1%</b></span><span>BRANNOW <b class="up">▲ 2.7%</b></span><span>QUAYSIDE <b class="dn">▼ 0.6%</b></span><span>CROWNWHEEL <b class="up">▲ 3.3%</b></span>').join('');
  tl.fromTo('#tick', { x: 0 }, { x: -900, duration: (beats[2] - beats[1]), ease: 'none' }, beats[1]);
  // 3: trade routes between the three flags
  const R = $('#routes');
  const nodes = [[480, 520, 'drennia', 'DRENNIA'], [1440, 520, 'westmark', 'WESTMARK'], [960, 260, 'eryndor', 'ERYNDOR']];
  let g = '';
  [[0, 1, 'TARIFF +25%'], [1, 2, 'EMBARGO'], [2, 0, 'TRADE PACT']].forEach(([i, j, lab], n) => {
    const [x1, y1] = nodes[i], [x2, y2] = nodes[j];
    g += `<path class="route" d="M${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 - 90} ${x2} ${y2}" stroke="${lab === 'EMBARGO' ? '#D9625A' : '#E8B84B'}" stroke-width="4" fill="none" stroke-dasharray="14 12" opacity="0"/>`;
    g += `<text class="rlab" x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 60}" text-anchor="middle" font-family="JetBrains Mono" font-size="26" letter-spacing="4" fill="${lab === 'EMBARGO' ? '#D9625A' : '#F4D58A'}" opacity="0">${lab}</text>`;
  });
  for (const [x, y, f, nm] of nodes) g += `<g class="node" opacity="0"><image href="assets/flag-${f}.svg" x="${x - 120}" y="${y - 74}" width="240" height="149"/><text x="${x}" y="${y + 120}" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="40" fill="#ECEAE4">${nm}</text></g>`;
  R.innerHTML = g;
  tl.to('#routes .node', { opacity: 1, duration: 0.25, stagger: 0.12 * k }, beats[2] + 0.02);
  tl.to('#routes .route', { opacity: 1, duration: 0.2, stagger: 0.15 * k }, beats[2] + 0.35 * k);
  tl.fromTo('#routes .route', { strokeDashoffset: 0 }, { strokeDashoffset: -160, duration: 2.0 * k, ease: 'none' }, beats[2]);
  tl.fromTo('#routes .rlab', { opacity: 0, scale: 1.4, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: 0.25, stagger: 0.18 * k, ease: 'back.out(2)' }, beats[2] + 0.55 * k);
  // 4: locked nations + industries
  const names = [['NOVARA', 560, 380], ['ZORATHIA', 1180, 300], ['NORVANE FEDERATION', 1290, 560], ['ASTRALIS', 760, 650], ['VALDORIA', 470, 560], ['KELDORIA', 1040, 470]];
  const lock = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="#E8B84B"/><path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="#E8B84B" stroke-width="2.2" fill="none"/></svg>';
  $('#locks').innerHTML = names.map(([n, x, y]) => `<div class="lockname" style="left:${x}px;top:${y}px">${lock}${n}</div>`).join('');
  tl.fromTo('#map2', { scale: 1.08 }, { scale: 1.0, duration: (b - beats[3]), ease: 'none' }, beats[3]);
  tl.fromTo('.lockname', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, stagger: 0.12 * k, ease: 'power2.out' }, beats[3] + 0.05);
  tl.to('.chip', { opacity: 1, duration: 0.25, stagger: 0.1 * k }, beats[3] + 0.6 * k);
}
function buildTag() {
  if (!E.tag) return;
  const [a, b] = E.tag; show('#s-tag', a, b);
  ['#t1', '#t2', '#t3'].forEach((id, i) => tl.fromTo(id, { opacity: 0, y: 22, filter: 'blur(8px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.6, ease: 'power3.out' }, a + 0.1 + i * 0.75));
  tl.fromTo('#t3', { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: 2.5, ease: 'none' }, a + 1.6);
  tl.to('#s-tag', { opacity: 0, duration: 0.25 }, b - 0.25);
}
function buildEnd() {
  const [a, b] = E.end; show('#s-end', a, b + 1);
  tl.fromTo('#elogo', { opacity: 0, scale: 1.15, filter: 'blur(12px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out' }, a);
  tl.fromTo('#elogo', { backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0', duration: b - a, ease: 'none' }, a);
  tl.fromTo('#etag', { opacity: 0 }, { opacity: 1, duration: 0.5 }, a + 0.35);
  tl.fromTo('#edate', { opacity: 0, letterSpacing: '0.4em', y: 16 }, { opacity: 1, letterSpacing: '0.12em', y: 0, duration: 0.9, ease: 'power3.out' }, a + 0.7);
  tl.fromTo('#ecta', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, a + 1.4);
  tl.fromTo('#efoot', { opacity: 0 }, { opacity: 1, duration: 0.6 }, a + 1.8);
}

// ── per-frame drawing ───────────────────────────────────────────────────────
const grainCtx = $('#grain').getContext('2d');
const grainImg = grainCtx.createImageData(960, 540);
function drawGrain(frame) {
  const r = mulberry(frame * 7919 + 1), d = grainImg.data;
  for (let i = 0; i < d.length; i += 4) { const v = r() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  grainCtx.putImageData(grainImg, 0, 0);
}
function frameSrc(s, t) {
  const n = CLIPS[s.src] || 1;
  const idx = Math.max(0, Math.min(n - 1, Math.floor(((t - s.at) * (s.rate || 1) + (s.in || 0)) * FPS)));
  return `clips/${s.src}/f${String(idx).padStart(5, '0')}.jpg`;
}
window.renderAt = async function (t) {
  tl.seek(t, false);
  const loads = [];
  for (const s of E.shots) {
    const on = t >= s.at && t < s.at + s.dur;
    s.el.style.visibility = on ? 'visible' : 'hidden';
    if (!on) continue;
    const p = (t - s.at) / s.dur, [s0, s1, ox, oy] = s.cam;
    let sc = lerp(s0, s1, ease(p));
    const sinceCut = t - s.at; if (sinceCut < 0.25 && s.dur > 1) sc *= 1 + 0.035 * (1 - sinceCut / 0.25) ** 2; // punch-in on the cut
    s.img.style.transformOrigin = `${ox}% ${oy}%`;
    s.img.style.transform = `scale(${sc.toFixed(4)})`;
    const src = frameSrc(s, t);
    if (!s.img.src.endsWith(src)) { s.img.src = src; loads.push(s.img.decode().catch(() => {})); }
  }
  // flags sway like cloth
  document.querySelectorAll('.flagcard .fl').forEach((el, i) => { el.style.transform = `perspective(900px) rotateY(${(Math.sin(t * 2.2 + i) * 6).toFixed(2)}deg) skewY(${(Math.sin(t * 2.9 + i * 1.7) * 1.2).toFixed(2)}deg)`; });
  // gold dust drifts upward
  for (const d of DUST) { const y = ((d.y - t * d.v) % 1080 + 1080) % 1080, x = d.x + Math.sin(t * 0.8 + d.ph) * 20; d.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${d.s})`; d.el.style.opacity = (0.35 + 0.5 * Math.abs(Math.sin(t + d.ph))).toFixed(2); }
  drawGrain(Math.round(t * FPS));
  await Promise.all(loads);
  return true;
};
window.DURATION = E.dur;
window.ready = fetch('clips.json').then(r => r.json()).then(j => {
  CLIPS = j; buildShots(); buildFx(); buildOpen(); buildFlags(); buildLogo(); buildRoad(); buildTag(); buildEnd();
  return document.fonts.ready.then(() => true);
});
