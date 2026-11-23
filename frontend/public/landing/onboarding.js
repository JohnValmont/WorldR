import * as THREE from 'three';

/* ======================================================================
   WORLDr — Access & Citizenship flow  (Aethan · Drennia)
   ====================================================================== */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============ THREE.JS globe background (Aethan) ============ */
const canvas = document.getElementById('scene');
// The globe is decoration: if WebGL is unavailable, sign-up must still work (static background).
let renderer = null;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
} catch (e) {
  console.warn('WebGL unavailable; continuing without the globe.', e);
  document.documentElement.classList.add('no-scene');
}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 3.4);
const globeGroup = new THREE.Group(); scene.add(globeGroup);

const gU = {
  uTime: { value: 0 }, uAccent: { value: 1 },
  uAmber: { value: new THREE.Color(0xcd8c1e) }, uAmberHi: { value: new THREE.Color(0xf4cf82) },
  uBase: { value: new THREE.Color(0x0a1120) },
};
const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), new THREE.ShaderMaterial({
  uniforms: gU,
  vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV;
    void main(){ vP=normalize(position); vec4 mv=modelViewMatrix*vec4(position,1.); vV=mv.xyz;
      vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `precision highp float; varying vec3 vP; varying vec3 vN; varying vec3 vV;
    uniform float uTime,uAccent; uniform vec3 uAmber,uAmberHi,uBase;
    vec3 h3(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453)*2.-1.;}
    float vn(vec3 p){vec3 i=floor(p),f=fract(p);vec3 u=f*f*(3.-2.*f);
      return mix(mix(mix(dot(h3(i),f),dot(h3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),mix(dot(h3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(h3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
                 mix(mix(dot(h3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(h3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),mix(dot(h3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(h3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z)*.5+.5;}
    float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*vn(p);p*=2.02;a*=.5;}return s;}
    void main(){vec3 n=normalize(vP);
      float lat=asin(clamp(n.y,-1.,1.)),lon=atan(n.z,n.x);
      float land=smoothstep(.52,.72,fbm(n*2.3+vec3(0.,uTime*.008,0.)));
      float gl=smoothstep(.02,0.,abs(fract(lat*6./3.14159+.5)-.5))+smoothstep(.02,0.,abs(fract(lon*10./3.14159+uTime*.004)-.5));
      gl=clamp(gl,0.,1.)*.5;
      vec3 vd=normalize(-vV); float fres=pow(1.-max(dot(normalize(vN),vd),0.),2.6);
      float li=clamp(dot(normalize(vN),normalize(vec3(-.5,.7,.6)))*.5+.55,0.,1.);
      vec3 col=uBase*(.35+li*.5); col+=uAmber*land*.42*li; col+=uAmberHi*gl*(.22+.1*uAccent);
      col+=uAmber*fres*(.9+.6*uAccent); col+=uAmberHi*pow(li,3.)*.05;
      gl_FragColor=vec4(col,1.);}`
}));
globeGroup.add(globe);
const atmo = new THREE.Mesh(new THREE.SphereGeometry(1.18, 64, 64), new THREE.ShaderMaterial({
  transparent: true, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false,
  uniforms: { uColor: { value: new THREE.Color(0xcd8c1e) } },
  vertexShader: `varying vec3 vN; varying vec3 vV; void main(){vec4 mv=modelViewMatrix*vec4(position,1.);vV=mv.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `varying vec3 vN; varying vec3 vV; uniform vec3 uColor; void main(){vec3 vd=normalize(-vV);float f=pow(1.-max(dot(normalize(vN),vd),0.),3.4);gl_FragColor=vec4(uColor,f*.5);}`
}));
globeGroup.add(atmo);

// particles
function disc(){const s=64,c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d');
  const g=x.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'rgba(244,207,130,1)');g.addColorStop(.3,'rgba(205,140,30,.5)');g.addColorStop(1,'rgba(205,140,30,0)');
  x.fillStyle=g;x.fillRect(0,0,s,s);return new THREE.CanvasTexture(c);}
const PN=700, pg=new THREE.BufferGeometry(), pp=new Float32Array(PN*3), ps=new Float32Array(PN);
for(let i=0;i<PN;i++){const r=2.4+Math.random()*7,th=Math.random()*6.28,ph=Math.acos(2*Math.random()-1);
  pp[i*3]=r*Math.sin(ph)*Math.cos(th);pp[i*3+1]=(Math.random()-.5)*14;pp[i*3+2]=r*Math.sin(ph)*Math.sin(th);ps[i]=.15+Math.random()*.5;}
pg.setAttribute('position',new THREE.BufferAttribute(pp,3));
const parts=new THREE.Points(pg,new THREE.PointsMaterial({size:.05,map:disc(),transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));
scene.add(parts);

const target = { x: 1.0, y: 0, scale: 1.0, accent: 1.0 };
const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => { ptr.tx = e.clientX / innerWidth - .5; ptr.ty = e.clientY / innerHeight - .5; });
const clock = new THREE.Clock();
function tick(){
  const dt = clock.getDelta(), t = clock.elapsedTime;
  gU.uTime.value = t; gU.uAccent.value += (target.accent - gU.uAccent.value) * .04;
  globe.rotation.y += dt * .05;
  parts.rotation.y += dt * .01;
  const a = pg.attributes.position.array;
  for (let i = 0; i < PN; i++){ a[i*3+1] += ps[i]*dt*.25; if (a[i*3+1] > 7) a[i*3+1] = -7; }
  pg.attributes.position.needsUpdate = true;
  ptr.x += (ptr.tx - ptr.x) * .04; ptr.y += (ptr.ty - ptr.y) * .04;
  globeGroup.position.x += (target.x - globeGroup.position.x) * .05;
  globeGroup.position.y += (target.y - globeGroup.position.y) * .05;
  globeGroup.scale.x += (target.scale - globeGroup.scale.x) * .05;
  globeGroup.scale.y = globeGroup.scale.z = globeGroup.scale.x;
  globeGroup.rotation.y = ptr.x * .4; globeGroup.rotation.x = -ptr.y * .3 + .05;
  camera.position.x += (ptr.x * .2 - camera.position.x) * .05; camera.lookAt(0, 0, 0);
  if (!renderer) return;
  renderer.render(scene, camera); requestAnimationFrame(tick);
}
tick();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); if (renderer) renderer.setSize(innerWidth, innerHeight); });

/* ============ portrait generator ============ */
function drawPortrait(ctx, seed, size){
  const rnd = (n => () => (n = (n * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)(seed * 7 + 3);
  ctx.clearRect(0, 0, size, size);
  // backdrop
  const bg = ctx.createRadialGradient(size/2, size*.38, 10, size/2, size/2, size*.7);
  bg.addColorStop(0, 'rgba(205,140,30,0.18)'); bg.addColorStop(1, 'rgba(6,8,12,0.9)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size);
  ctx.save(); ctx.translate(size/2, size/2);
  const amber = '#e6a93b', hi = '#f4cf82';
  ctx.strokeStyle = amber; ctx.fillStyle = 'rgba(205,140,30,0.10)'; ctx.lineWidth = size*0.012; ctx.lineJoin = 'round';
  const sh = size*0.30;
  // shoulders
  ctx.beginPath(); ctx.moveTo(-sh*1.5, size*0.42);
  ctx.quadraticCurveTo(-sh*1.2, size*0.12, -sh*0.55, size*0.08);
  ctx.lineTo(sh*0.55, size*0.08); ctx.quadraticCurveTo(sh*1.2, size*0.12, sh*1.5, size*0.42);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  // head
  const hy = -size*0.12, hr = size*0.17;
  ctx.beginPath(); ctx.ellipse(0, hy, hr*0.82, hr, 0, 0, 6.28); ctx.fill(); ctx.stroke();
  // hair / crest variation
  const style = seed % 6;
  ctx.strokeStyle = hi; ctx.beginPath();
  if (style === 0){ ctx.arc(0, hy - hr*0.2, hr*0.9, Math.PI*1.05, Math.PI*1.95); }
  else if (style === 1){ ctx.moveTo(-hr*0.9, hy - hr*0.3); ctx.quadraticCurveTo(0, hy - hr*1.4, hr*0.9, hy - hr*0.3); }
  else if (style === 2){ ctx.arc(0, hy, hr*0.95, Math.PI*1.1, Math.PI*2.0); ctx.moveTo(hr*0.5, hy-hr); ctx.lineTo(hr*0.9, hy-hr*1.5); }
  else if (style === 3){ ctx.moveTo(-hr, hy); ctx.quadraticCurveTo(-hr*1.1, hy-hr*1.2, 0, hy-hr*1.1); ctx.quadraticCurveTo(hr*1.1, hy-hr*1.2, hr, hy); }
  else if (style === 4){ ctx.arc(0, hy-hr*0.35, hr*0.8, Math.PI, 0); }
  else { ctx.moveTo(-hr*0.8, hy-hr*0.6); ctx.lineTo(0, hy-hr*1.3); ctx.lineTo(hr*0.8, hy-hr*0.6); }
  ctx.stroke();
  // collar accent (institutional)
  ctx.strokeStyle = amber; ctx.beginPath();
  ctx.moveTo(-size*0.06, size*0.10); ctx.lineTo(0, size*0.22); ctx.lineTo(size*0.06, size*0.10); ctx.stroke();
  // insignia dot
  ctx.fillStyle = hi; ctx.beginPath(); ctx.arc(0, size*0.16, size*0.014, 0, 6.28); ctx.fill();
  ctx.restore();
}

/* ======================================================================
   Data: nations + character options come from the server (GET /world/nations).
   The server recomputes every number on create; this page only previews.
   ====================================================================== */
import { NATIONS as STATIC_NATIONS } from './onboarding_data.js';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => n >= 1e6 ? '$' + (n / 1e6).toFixed(n % 1e6 ? 2 : 0).replace(/\.?0+$/, '') + 'M' : '$' + Math.round(n / 1000) + 'k';

let WORLD = null;          // { nations, creation }
const worldReady = fetch('/api/v1/world/nations').then(r => r.ok ? r.json() : null).then(d => {
  if (d && Array.isArray(d.nations)) WORLD = d;
  renderAll();
}).catch(() => renderAll());

/* ============ portrait picks ============ */
const picks = $('picks');
const mainC = $('portrait').getContext('2d');
let portraitSeed = 0;
function renderPicks(){
  picks.innerHTML = '';
  for (let i = 0; i < 6; i++){
    const b = document.createElement('button'); b.type = 'button'; if (i === portraitSeed) b.classList.add('on');
    b.setAttribute('aria-label', 'Likeness ' + (i + 1));
    const cv = document.createElement('canvas'); cv.width = cv.height = 88; b.appendChild(cv);
    drawPortrait(cv.getContext('2d'), i, 88);
    b.onclick = () => { portraitSeed = i; renderPicks(); drawPortrait(mainC, portraitSeed, 380); };
    picks.appendChild(b);
  }
}
renderPicks(); drawPortrait(mainC, portraitSeed, 380);

/* ============ pronoun ============ */
let pronoun = 'he';
document.querySelectorAll('#ch_gender button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#ch_gender button').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); pronoun = b.dataset.v;
});

/* ============ background + edge ============ */
let bgKey = null;
const edge = { charisma: 0, credibility: 0, influence: 0, cash: 0 };
const STAT_INFO = {
  charisma:    { label: 'Charisma', mean: v => `Rallies and fundraisers ×${(0.7 + 0.6 * v / 100).toFixed(2)}` },
  credibility: { label: 'Trust',    mean: v => v >= 55 ? 'Voters and parties take your word' : v >= 40 ? 'People give you a fair hearing' : 'Your promises are doubted in deals' },
  influence:   { label: 'Clout',    mean: v => v >= 45 ? 'Enough to lead a party' : `${45 - v} short of leading a party` },
  cash:        { label: 'Money',    mean: v => v >= 2e6 ? 'Fund deals and campaigns freely' : 'Enough to get started' },
};
const C = () => WORLD?.creation;
function profile(){
  const c = C(); if (!c) return null;
  const b = c.backgrounds.find(x => x.key === bgKey) || { charisma: 0, credibility: 0, influence: 0, cash: 0 };
  const cap = v => Math.max(0, Math.min(c.statCap, v));
  return {
    charisma: cap(c.base.charisma + b.charisma + edge.charisma * c.edge.stat),
    credibility: cap(c.base.credibility + b.credibility + edge.credibility * c.edge.stat),
    influence: cap(c.base.influence + b.influence + edge.influence * c.edge.stat),
    cash: c.base.cash + b.cash + edge.cash * c.edge.cash,
  };
}
const tokensLeft = () => (C()?.edge.tokens ?? 4) - Object.values(edge).reduce((a, b) => a + b, 0);
function renderBackgrounds(){
  const c = C(); const grid = $('bgGrid');
  if (!c) { grid.innerHTML = '<div class="hint">Reaching the world… <button type="button" class="link" id="retryWorld">Retry</button></div>'; const r = $('retryWorld'); if (r) r.onclick = () => location.reload(); return; }
  grid.innerHTML = c.backgrounds.map(b => `<button type="button" class="bg${b.key === bgKey ? ' on' : ''}" data-k="${b.key}">
      <span class="home">${b.homeGroup ? 'Home: ' + esc(c.groups[b.homeGroup]) : 'No home group'}</span>
      <b>${esc(b.label)}</b><span class="bl">${esc(b.blurb)}</span><span class="ed">${esc(b.edge)}</span></button>`).join('');
  grid.querySelectorAll('.bg').forEach(el => el.onclick = () => { bgKey = el.dataset.k; $('bgMsg').closest('.field').classList.remove('err'); renderBackgrounds(); renderSheet(); });
}
function renderEdge(){
  const c = C(); const list = $('edgeList'); if (!c) { list.innerHTML = ''; return; }
  const left = tokensLeft();
  $('edgeLeft').textContent = `${left} of ${c.edge.tokens} left · each adds +${c.edge.stat} or ${money(c.edge.cash)}`;
  list.innerHTML = Object.keys(edge).map(k => `<div class="edge"><div class="en">${STAT_INFO[k].label}<small>${k === 'cash' ? '+' + money(c.edge.cash) : '+' + c.edge.stat} each</small></div>
      <div class="pips">${Array.from({ length: c.edge.tokens }, (_, i) => `<i class="${i < edge[k] ? 'on' : ''}"></i>`).join('')}</div>
      <button type="button" data-k="${k}" data-m="-1" ${edge[k] <= 0 ? 'disabled' : ''} aria-label="Less ${STAT_INFO[k].label}">−</button>
      <button type="button" data-k="${k}" data-m="1" ${left <= 0 ? 'disabled' : ''} aria-label="More ${STAT_INFO[k].label}">+</button></div>`).join('');
  list.querySelectorAll('button').forEach(b => b.onclick = () => {
    const k = b.dataset.k, m = +b.dataset.m;
    if (m > 0 && tokensLeft() > 0) edge[k]++; if (m < 0 && edge[k] > 0) edge[k]--;
    renderEdge(); renderSheet();
  });
}
function renderSheet(){
  const p = profile(); const c = C(); const el = $('sheet');
  const b = c?.backgrounds.find(x => x.key === bgKey);
  const name = fullName() || 'Your name';
  if (!p) { el.innerHTML = `<div class="sh-name">${esc(name)}</div>`; return; }
  const bar = (k, v, max) => `<div class="stat"><div class="row"><span>${STAT_INFO[k].label}</span><b>${k === 'cash' ? money(v) : v}</b></div>
      <div class="tr"><i style="width:${Math.min(100, v / max * 100)}%"></i></div><div class="mean">${esc(STAT_INFO[k].mean(v))}</div></div>`;
  el.innerHTML = `<div class="sh-name">${esc(name)}</div><div class="sh-bg">${b ? esc(b.label) : 'Choose a background'}${b?.homeGroup ? ' · ' + esc(c.groups[b.homeGroup]) + ' rally ×' + c.homeRallyMult : ''}</div>
    ${bar('charisma', p.charisma, c.statCap)}${bar('credibility', p.credibility, c.statCap)}${bar('influence', p.influence, c.statCap)}${bar('cash', p.cash, 3e6)}`;
}
['ch_first', 'ch_last'].forEach(id => $(id).addEventListener('input', renderSheet));

/* ============ convictions ============ */
const QUESTIONS = [
  { axis: 'taxation', q: 'Taxes', a: [['Tax the rich to fund schools and hospitals', 20], ['Keep them roughly where they are', 50], ['Cut them: people know best how to spend their money', 85]] },
  { axis: 'labour', q: 'Work', a: [['Workers first: strong unions, higher wages', 90], ['A fair balance between bosses and workers', 52], ['Free business to hire, fire and grow', 25]] },
  { axis: 'trade', q: 'Trade', a: [['Protect our industries with tariffs', 30], ['Some of both', 55], ['Open the ports: free trade makes us rich', 90]] },
  { axis: 'stability', q: 'Order', a: [['Liberty first: a free press, light policing', 30], ['Order, with fairness', 55], ['Law and order above all', 85]] },
];
const convictions = {};
function renderQuestions(){
  $('questions').innerHTML = QUESTIONS.map((q, i) => `<div class="q"><div class="qt">${esc(q.q)}</div><div class="qa">${q.a.map(([t, v], j) =>
    `<button type="button" data-q="${i}" data-j="${j}" class="${convictions[q.axis] === v ? 'on' : ''}">${esc(t)}</button>`).join('')}</div></div>`).join('');
  $('questions').querySelectorAll('button').forEach(b => b.onclick = () => {
    const q = QUESTIONS[+b.dataset.q]; convictions[q.axis] = q.a[+b.dataset.j][1];
    renderQuestions(); renderFit(); renderNations();
  });
}
function fitOf(platform){
  const axes = Object.keys(convictions); if (!axes.length) return null;
  return Math.round(100 - axes.reduce((s, a) => s + Math.abs(convictions[a] - (platform?.[a] ?? 50)), 0) / axes.length);
}
function bestParty(n){
  if (!n?.parties?.length || !Object.keys(convictions).length) return null;
  return n.parties.map(p => ({ ...p, fit: fitOf(p.platform) })).sort((a, b) => b.fit - a.fit)[0];
}
function renderFit(){
  const el = $('fitList');
  if (!WORLD) { el.innerHTML = '<div class="hint">Reaching the world…</div>'; return; }
  if (!Object.keys(convictions).length) { el.innerHTML = '<div class="hint">Answer a question to see where you fit.</div>'; return; }
  el.innerHTML = WORLD.nations.map(n => { const p = bestParty(n); return p ? `<div class="fit-row"><div class="fn">${esc(n.name)}</div>
    <div class="fp"><span class="pdot" style="background:${esc(p.color)}"></span>${esc(p.name)}<span class="pct">${p.fit}%</span></div></div>` : ''; }).join('');
}

/* ============ nations ============ */
let selected = null; // countryId
function flagSvg(f){
  const c = f?.colors || ['#333', '#555', '#777'];
  if (f?.pattern === 'tricolor-horizontal') return `<svg viewBox="0 0 30 20" class="flag"><rect width="30" height="20" fill="${c[0]}"/><rect y="6.67" width="30" height="6.67" fill="${c[1]}"/><rect y="13.33" width="30" height="6.67" fill="${c[2]}"/></svg>`;
  if (f?.pattern === 'hoist-triangle-band') return `<svg viewBox="0 0 30 20" class="flag"><rect width="30" height="20" fill="${c[0]}"/><rect y="8" width="30" height="4" fill="${c[1]}"/><path d="M0 0 L12 10 L0 20 Z" fill="${c[2]}"/></svg>`;
  return `<svg viewBox="0 0 30 20" class="flag"><rect width="30" height="20" fill="${c[0]}"/><rect x="10" width="10" height="20" fill="${c[1] || c[0]}"/><rect x="20" width="10" height="20" fill="${c[2] || c[0]}"/></svg>`;
}
const nationsList = () => WORLD?.nations || [];
const anyRoom = () => nationsList().some(n => n.players < n.cap);
const isFull = n => anyRoom() && n.players >= n.cap; // if all are full the server still finds a place
function renderNations(){
  const cards = $('nationCards');
  const ns = nationsList();
  if (!ns.length) { cards.innerHTML = '<div class="hint">Reaching the world… the three nations will appear here.</div>'; return; }
  if (!selected || isFull(ns.find(n => n.countryId === selected) || {})) {
    const best = ns.filter(n => !isFull(n)).map(n => ({ n, f: bestParty(n)?.fit ?? 0 })).sort((a, b) => b.f - a.f)[0];
    selected = best?.n.countryId || ns[0].countryId;
  }
  cards.innerHTML = ns.map(n => { const left = Math.max(0, n.cap - n.players); const p = bestParty(n); const full = isFull(n);
    return `<button type="button" class="ncard${n.countryId === selected ? ' on' : ''}${full ? ' full' : ''}" data-c="${n.countryId}" ${full ? 'disabled' : ''}>
      <span class="places${full ? ' full' : ''}">${full ? 'FULL' : left + ' OF ' + n.cap + ' LEFT'}</span>
      <div class="nh">${flagSvg(n.flag)}<div><div class="nn">${esc(n.name)}</div><div class="ng">${esc(n.government)}</div></div></div>
      <dl><dt>Led by</dt><dd>${esc(n.leaderTitle)}${n.premier ? ' ' + esc(n.premier) : ''}</dd>
        <dt>Parliament</dt><dd>${n.seats} seats · every ${n.termYears} yrs</dd>
        <dt>Government</dt><dd>${n.leadParty ? esc(n.leadParty.name) : 'Forming'}</dd>
        <dt>Approval</dt><dd>${Math.round(n.approval)}%</dd>
        <dt>Next election</dt><dd>${n.monthsToElection != null ? n.monthsToElection + (n.monthsToElection === 1 ? ' month' : ' months') : 'soon'}</dd></dl>
      ${['economy', 'military', 'influence'].map(k => `<div class="pw"><span>${k[0].toUpperCase() + k.slice(1)}</span><div class="tr"><i style="width:${n.power?.[k] ?? 50}%"></i></div><b>${Math.round(n.power?.[k] ?? 50)}</b></div>`).join('')}
      ${p ? `<div class="mine"><span class="pdot" style="background:${esc(p.color)}"></span>Your fit: <b>${esc(p.name)}</b> ${p.fit}%</div>` : ''}
    </button>`; }).join('');
  cards.querySelectorAll('.ncard:not(.full)').forEach(el => el.onclick = () => { selected = el.dataset.c; renderNations(); });
  const n = ns.find(x => x.countryId === selected);
  $('nationDetail').innerHTML = n ? `<div><h4>${esc(n.officialName)}</h4><div class="hint">Capital ${esc(n.capital)} · ${esc(n.headOfState?.title)} ${esc(n.headOfState?.name)}</div>
      <p class="cult">${esc(n.culture)}</p>
      <div class="parties">${(n.parties || []).map(p => `<div class="pr"><span class="pdot" style="background:${esc(p.color)}"></span><b>${esc(p.name)}</b>${p.governing ? ' · governing' : ''}${p.playerLed ? ' · player-led' : ''}<span class="s">${p.seats} seats${Object.keys(convictions).length ? ' · fit ' + fitOf(p.platform) + '%' : ''}</span></div>`).join('')}</div></div>
    <div><div class="fit-h">HOW ${esc(n.name.toUpperCase())} WORKS</div><ul>${(n.traits || []).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '';
  const others = STATIC_NATIONS.filter(x => !x.playable);
  $('otherNations').textContent = others.length ? `${others.length} more nations of Aethan open after the alpha: ${others.slice(0, 6).map(x => x.name).join(', ')} and others.` : '';
  $('nationNext').querySelector('span').textContent = n ? 'Pledge to ' + n.name : 'Pledge';
}

function renderAll(){ renderBackgrounds(); renderEdge(); renderSheet(); renderQuestions(); renderFit(); renderNations(); }

/* ============ OTP ============ */
const otpInputs = [...document.querySelectorAll('#otp input')];
otpInputs.forEach((inp, i) => {
  inp.addEventListener('input', () => {
    const digits = inp.value.replace(/\D/g, '');
    if (digits.length > 1) { digits.slice(0, 6).split('').forEach((d, k) => { if (otpInputs[i + k]) { otpInputs[i + k].value = d; otpInputs[i + k].classList.add('filled'); } }); otpInputs[Math.min(5, i + digits.length - 1)].focus(); return; }
    inp.value = digits.slice(0, 1);
    inp.classList.toggle('filled', !!inp.value);
    if (inp.value && i < otpInputs.length - 1) otpInputs[i + 1].focus();
  });
  inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && i > 0) otpInputs[i - 1].focus(); });
});
let otpTimer;
function startOtpTimer(){
  let s = 45; const el = $('otp_timer');
  clearInterval(otpTimer);
  otpTimer = setInterval(() => { s--; el.textContent = '00:' + String(Math.max(0, s)).padStart(2, '0'); if (s <= 0) clearInterval(otpTimer); }, 1000);
}
$('resend').onclick = () => { otpInputs.forEach(i => { i.value = ''; i.classList.remove('filled'); }); otpInputs[0].focus(); startOtpTimer(); };

/* ============ validation ============ */
function err(id, on){ $(id).closest('.field').classList.toggle('err', on); }
function fullName(){ return `${$('ch_first').value.trim()} ${$('ch_last').value.trim()}`.replace(/\s+/g, ' ').trim(); }
function validate(step){
  if (step === 0){
    const e = $('acc_email').value, p = $('acc_pass').value, p2 = $('acc_pass2').value;
    const okE = /^[^@]+@[^@]+\.[^@]+$/.test(e), okP = p.length >= 8, okP2 = p === p2 && !!p2;
    err('acc_email', !okE); err('acc_pass', !okP); err('acc_pass2', !okP2);
    if (okE && okP && okP2){ $('otp_email').textContent = e; $('log_email').value = e; }
    return okE && okP && okP2;
  }
  if (step === 1) return otpInputs.every(i => i.value);
  if (step === 2){
    const e = $('log_email').value, p = $('log_pass').value;
    err('log_email', !e.trim()); err('log_pass', !p.trim()); return !!(e.trim() && p.trim());
  }
  if (step === 3){
    const f = $('ch_first').value.trim(), l = $('ch_last').value.trim();
    err('ch_first', !f); err('ch_last', !l); $('bgMsg').closest('.field').classList.toggle('err', !bgKey);
    return !!(f && l && bgKey);
  }
  if (step === 4) return true; // convictions are optional
  if (step === 5) return !!selected;
  return true;
}

/* ============ step machine ============ */
const steps = [...document.querySelectorAll('.step')];
const stepperNodes = [...document.querySelectorAll('.stp')];
const NODE_OF = [0, 1, 1, 2, 3, 4, 5, 5];
const globeStops = [
  { x: 1.05, y: 0, scale: 1.0, accent: 1.0 }, { x: -1.05, y: 0, scale: 1.0, accent: 1.1 }, { x: 1.05, y: 0, scale: 1.0, accent: 1.0 },
  { x: 1.3, y: -0.1, scale: 0.95, accent: 0.8 }, { x: -1.3, y: 0, scale: 1.0, accent: 0.9 }, { x: -1.25, y: 0, scale: 1.15, accent: 1.0 },
  { x: 1.2, y: 0, scale: 1.1, accent: 1.0 }, { x: 0, y: 0, scale: 1.7, accent: 1.7 },
];
let cur = 0;
function updateStepper(i){ const n = NODE_OF[i]; stepperNodes.forEach((el, idx) => { el.classList.toggle('active', idx === n); el.classList.toggle('done', idx < n); }); }
function goTo(i, dir = 1){
  if (i === cur) return;
  steps[cur].classList.remove('active'); gsap.set(steps[cur], { clearProps: 'opacity,transform' });
  steps[i].classList.add('active');
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
  gsap.fromTo(steps[i], { opacity: 0, x: 46 * dir, y: 12, filter: 'blur(6px)' }, { opacity: 1, x: 0, y: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power4.out' });
  if (i === 6) fillSummary();
  if (i === 1) startOtpTimer();
  if (i === 5) renderNations();
  cur = i; updateStepper(i); Object.assign(target, globeStops[i]);
}
const actionParam = new URLSearchParams(location.search).get('action');
cur = actionParam === 'character' ? 3 : (actionParam === 'login' ? 2 : 0);
window.__worldrReady = true; // failsafe.js: the flow started
steps[cur].classList.add('active'); gsap.set(steps[cur], { opacity: 1 }); updateStepper(cur); Object.assign(target, globeStops[cur]);

async function postJson(url, body){
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Something went wrong');
  return data;
}
function storeSession(data, email){
  localStorage.setItem('worldr_access_token', data.accessToken);
  if (data.refreshToken) localStorage.setItem('worldr_refresh_token', data.refreshToken);
  localStorage.setItem('worldr-auth', JSON.stringify({ state: { user: data.user || { email }, accessToken: data.accessToken, refreshToken: data.refreshToken, isAuthenticated: true }, version: 0 }));
}
/** Logged in: straight into the world if a character exists, else on to character creation. */
function afterLogin(data){
  window.worldrTrack && window.worldrTrack('login_succeeded', { has_character: !!(data.user && data.user.character) });
  if (data.user && data.user.character){
    localStorage.setItem('worldr_selected_motherland', data.user.character.motherland_country_id || 'drennia');
    localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(data.user.character));
    localStorage.setItem('worldr_living_world_entry_v1', 'true');
    location.href = '/drennia/politics';
    return true;
  }
  return false;
}
function flashError(anchor, message){
  const msg = document.createElement('div'); msg.className = 'msg err'; msg.style.cssText = 'color:#ff6060;margin-top:12px;display:block';
  msg.textContent = message; anchor.insertAdjacentElement('beforebegin', msg); setTimeout(() => msg.remove(), 5000);
}

document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', async () => {
  const s = +b.dataset.next;
  if (!validate(s)) { gsap.fromTo(b.closest('.card'), { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.4)' }); return; }
  const span = b.querySelector('span'), orig = span.textContent;
  b.disabled = true;
  try {
    let next = s + 1;
    if (s === 0){
      span.textContent = 'Requesting…';
      await postJson('/api/v1/auth/register', { email: $('acc_email').value, password: $('acc_pass').value });
      window.worldrTrack && window.worldrTrack('register_submitted');
    } else if (s === 1){
      span.textContent = 'Verifying…';
      const email = $('otp_email').textContent;
      await postJson('/api/v1/auth/verify-email', { email, otp: otpInputs.map(i => i.value).join('') });
      window.worldrTrack && window.worldrTrack('email_verified');
      // Log straight in with the password from step 1: no second form to fill.
      const pass = $('acc_pass').value;
      if (pass){
        try { const data = await postJson('/api/v1/auth/login', { email, password: pass }); storeSession(data, email); if (afterLogin(data)) return; next = 3; }
        catch { next = 2; }
      }
    } else if (s === 2){
      span.textContent = 'Logging in…';
      const email = $('log_email').value;
      const data = await postJson('/api/v1/auth/login', { email, password: $('log_pass').value });
      storeSession(data, email);
      if (afterLogin(data)) { span.textContent = 'Entering…'; return; }
    }
    span.textContent = orig; b.disabled = false;
    goTo(next, 1);
  } catch (e) {
    span.textContent = orig; b.disabled = false;
    flashError(b.closest('.actions'), e.message);
  }
}));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => goTo(+b.dataset.back - 1, -1)));

/* ============ citizenship summary + create ============ */
function chosenNation(){ return nationsList().find(n => n.countryId === selected) || null; }
function fillSummary(){
  const n = chosenNation(), b = C()?.backgrounds.find(x => x.key === bgKey), p = profile(), bp = bestParty(n);
  const line = (k, v, sub) => `<div class="summary-line"><span class="sk">${k}</span><span class="sv">${v}${sub ? `<small>${sub}</small>` : ''}</span></div>`;
  $('summary').innerHTML = [
    line('Citizen', esc(fullName())),
    line('Background', esc(b?.label || '—'), b ? esc(b.edge) : ''),
    p ? line('Starts with', `Charisma ${p.charisma} · Trust ${p.credibility} · Clout ${p.influence}`, money(p.cash) + ' of your own') : '',
    line('Nation', esc(n?.name || selected), n ? esc(n.government) + ' · capital ' + esc(n.capital) : ''),
    bp ? line('Closest party', esc(bp.name), bp.fit + '% fit · ' + bp.seats + ' seats') : '',
  ].join('');
}
$('confirmBtn').addEventListener('click', async () => {
  const btn = $('confirmBtn'), span = btn.querySelector('span');
  btn.disabled = true; span.textContent = 'Recording…';
  try {
    let token = localStorage.getItem('worldr_access_token');
    if (!token) throw new Error('Your session ended. Please log in again.');
    try {
      const rt = localStorage.getItem('worldr_refresh_token');
      if (rt){ const d = await postJson('/api/v1/auth/refresh-token', { refreshToken: rt }); if (d.accessToken){ token = d.accessToken; localStorage.setItem('worldr_access_token', token); } }
    } catch { /* keep the token we have */ }
    const controller = new AbortController(); const to = setTimeout(() => controller.abort(), 30000);
    let res;
    try {
      res = await fetch('/api/v1/characters', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: fullName(), motherland_country_id: selected, currency_id: 'dollar', background: bgKey, edge, convictions }),
      });
    } catch (fe) { throw new Error(fe.name === 'AbortError' ? 'The server took too long. Please try again.' : 'Network error. Check your connection and try again.'); }
    finally { clearTimeout(to); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok && data.error !== 'CHARACTER_EXISTS') throw new Error(data.message || data.error || 'Could not create your character');
    let character = res.ok ? (data.character || data) : null;
    if (!character){ const me = await fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : {}); character = me.character || null; }
    const nationId = character?.motherland_country_id || selected;
    window.worldrTrack && window.worldrTrack('character_created', { nation: nationId, background: bgKey || 'none' });
    localStorage.setItem('worldr_selected_motherland', nationId);
    if (character) localStorage.setItem('worldr_citizen_file_v1', JSON.stringify(character));
    localStorage.setItem('worldr_living_world_entry_v1', 'true');
    try { const st = JSON.parse(localStorage.getItem('worldr-auth') || 'null'); if (st?.state?.user && character){ st.state.user.character = character; localStorage.setItem('worldr-auth', JSON.stringify(st)); } } catch {}

    $('confirmActions').style.pointerEvents = 'none';
    const seal = $('seal');
    gsap.set(seal, { scale: 2.4, rotation: -35, opacity: 0 });
    gsap.timeline().to(seal, { scale: 1, rotation: 0, opacity: 1, duration: 0.9, ease: 'power4.out' })
      .to(seal, { scale: 0.94, duration: 0.12 }, '>-0.02').to(seal, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.5)' })
      .add(() => $('sealStage').classList.add('granted')).to('.seal-txt', { opacity: 1, duration: 0.6 });

    const n = nationsList().find(x => x.countryId === nationId) || chosenNation();
    const placedElsewhere = nationId !== selected;
    const bp = bestParty(n);
    $('welcomeName').textContent = fullName();
    $('welcomeText').innerHTML = `You are now a citizen of <b style="color:var(--amber-2)">${esc(n?.name || nationId)}</b>.` + (placedElsewhere ? ' Your first choice filled up while you were signing, so you were given the nation with the most room.' : '');
    $('firstSteps').innerHTML = [
      bp ? `<li><b>Join a party.</b> ${esc(bp.name)} fits you best, and joining gives you one of its seats in Parliament today.</li>` : '<li><b>Join a party</b>, or found your own, to get a seat and a vote.</li>',
      '<li><b>Make your three decisions</b> on the Desk each month. Every choice moves your trust, clout or the voters.</li>',
      `<li><b>Aim for the top.</b> Lead your party, win the election, and become ${esc(n?.leaderTitle || 'head of government')}.</li>`,
    ].join('');
    setTimeout(() => goTo(7, 1), 2400);
  } catch (e) {
    btn.disabled = false; span.textContent = 'Confirm citizenship';
    flashError($('confirmActions'), e.message);
  }
});

$('enterBtn').addEventListener('click', function(){
  window.worldrTrack && window.worldrTrack('world_entered');
  this.querySelector('span').textContent = 'Opening Parliament…';
  gsap.to(target, { scale: 6, accent: 3, duration: 2.0, ease: 'power3.in' });
  gsap.to('.card', { opacity: 0, scale: 1.05, duration: 1.1, ease: 'power2.in', delay: 0.3, onComplete: () => { location.href = '/drennia/politics'; } });
});

$('quit').addEventListener('click', e => { e.preventDefault(); location.href = 'index.html'; });
document.querySelectorAll('.btn').forEach(btn => btn.addEventListener('pointermove', e => {
  const r = btn.getBoundingClientRect();
  btn.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
  btn.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
}));
renderAll();
