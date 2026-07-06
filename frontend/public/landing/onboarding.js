import * as THREE from 'three';
import { NATIONS, CULTURES } from './onboarding_data.js';
import { AETHAN_MAP } from './assets/maps.js';
const _mapImg = document.getElementById('aethanMap');
if (_mapImg) _mapImg.src = AETHAN_MAP;

/* ======================================================================
   WORLDr — Access & Citizenship flow  (Aethan · Drennia)
   ====================================================================== */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============ THREE.JS globe background (Aethan) ============ */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
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
  renderer.render(scene, camera); requestAnimationFrame(tick);
}
tick();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

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
const picks = document.getElementById('picks');
const mainC = document.getElementById('portrait').getContext('2d');
let portraitSeed = 0;
function renderPicks(){
  picks.innerHTML = '';
  for (let i = 0; i < 6; i++){
    const b = document.createElement('button'); if (i === portraitSeed) b.classList.add('on');
    const cv = document.createElement('canvas'); cv.width = cv.height = 88; b.appendChild(cv);
    drawPortrait(cv.getContext('2d'), i, 88);
    b.onclick = () => { portraitSeed = i; renderPicks(); drawPortrait(mainC, portraitSeed, 380); };
    picks.appendChild(b);
  }
}
renderPicks(); drawPortrait(mainC, portraitSeed, 380);

/* culture dropdown */
const culSel = document.getElementById('ch_culture');
CULTURES.forEach(c => { const o = document.createElement('option'); o.textContent = c; culSel.appendChild(o); });

/* gender segmented */
let gender = 'Statesman';
document.querySelectorAll('#ch_gender button').forEach(b => b.onclick = () => {
  document.querySelectorAll('#ch_gender button').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); gender = b.dataset.v;
});

/* ============ attributes ============ */
const ATTRS = [
  { k: 'Charisma', d: 'Sway crowds and voters' },
  { k: 'Cunning', d: 'Backroom leverage' },
  { k: 'Capital', d: 'Starting economic weight' },
  { k: 'Diplomacy', d: 'Coalitions & treaties' },
  { k: 'Resolve', d: 'Withstand scandal & pressure' },
];
const BASE = 3, MAX = 8, POOL = 10;
let attrVals = ATTRS.map(() => BASE);
const attrList = document.getElementById('attrList'), poolEl = document.getElementById('pool');
function usedPts(){ return attrVals.reduce((s, v) => s + (v - BASE), 0); }
function renderAttrs(){
  const remain = POOL - usedPts(); poolEl.textContent = remain;
  attrList.innerHTML = '';
  ATTRS.forEach((a, i) => {
    const row = document.createElement('div'); row.className = 'attr';
    row.innerHTML = `<div class="an">${a.k}</div>
      <div class="track"><i style="width:${(attrVals[i]/MAX)*100}%"></i></div>
      <div class="ctrl"><button data-m="-1" ${attrVals[i] <= BASE ? 'disabled' : ''}>−</button>
      <span class="val">${attrVals[i]}</span>
      <button data-m="1" ${(attrVals[i] >= MAX || remain <= 0) ? 'disabled' : ''}>+</button></div>`;
    row.querySelectorAll('button').forEach(btn => btn.onclick = () => {
      const m = +btn.dataset.m;
      if (m > 0 && remain > 0 && attrVals[i] < MAX) attrVals[i]++;
      if (m < 0 && attrVals[i] > BASE) attrVals[i]--;
      renderAttrs();
    });
    attrList.appendChild(row);
  });
}
renderAttrs();

/* ============ nation selection ============ */
const nationList = document.getElementById('nationList');
let selectedNation = NATIONS.find(n => n.playable);
function renderNations(){
  nationList.innerHTML = '';
  NATIONS.forEach(n => {
    const el = document.createElement('div');
    el.className = 'nat' + (n.playable ? '' : ' locked') + (selectedNation && n.id === selectedNation.id ? ' sel' : '');
    el.innerHTML = `<span class="dot" style="background:${n.color};box-shadow:0 0 10px ${n.color}"></span>
      <div class="nm"><b>${n.name}</b><span>${n.gov} · ${n.capital}</span></div>
      <span class="badge ${n.playable ? 'open' : 'soon'}">${n.playable ? 'Open' : 'Soon'}</span>`;
    if (n.playable) el.onclick = () => { selectedNation = n; renderNations(); showDossier(n); };
    nationList.appendChild(el);
  });
}
function showDossier(n){
  document.getElementById('d_name').textContent = n.name;
  document.getElementById('d_tag').textContent = `${n.gov} · Capital ${n.capital}`;
  document.getElementById('d_gov').textContent = n.gov;
  document.getElementById('d_pop').textContent = n.pop;
  document.getElementById('d_area').textContent = n.area;
  document.getElementById('d_culture').textContent = n.culture;
}
renderNations(); showDossier(selectedNation);
// map marker click
document.getElementById('drenniaMarker').onclick = () => {
  const dr = NATIONS.find(x => x.playable); selectedNation = dr; renderNations(); showDossier(dr);
};
// position marker on Drennia (map is 3069x1536; Drennia ~ x 300 y 620 of that space)
(function placeMarker(){
  const m = document.getElementById('drenniaMarker');
  m.style.left = '15%'; m.style.top = '52%';
})();

/* ============ OTP ============ */
const otpInputs = [...document.querySelectorAll('#otp input')];
otpInputs.forEach((inp, i) => {
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
    inp.classList.toggle('filled', !!inp.value);
    if (inp.value && i < otpInputs.length - 1) otpInputs[i + 1].focus();
  });
  inp.addEventListener('keydown', e => { if (e.key === 'Backspace' && !inp.value && i > 0) otpInputs[i - 1].focus(); });
});
let otpTimer;
function startOtpTimer(){
  let s = 45; const el = document.getElementById('otp_timer');
  clearInterval(otpTimer);
  otpTimer = setInterval(() => { s--; el.textContent = '00:' + String(Math.max(0, s)).padStart(2, '0');
    if (s <= 0) clearInterval(otpTimer); }, 1000);
}
document.getElementById('resend').onclick = () => { otpInputs.forEach(i => { i.value = ''; i.classList.remove('filled'); }); otpInputs[0].focus(); startOtpTimer(); };

/* ============ validation helpers ============ */
function err(id, on){ document.getElementById(id).closest('.field').classList.toggle('err', on); }
function validate(step){
  if (step === 0){
    const e = document.getElementById('acc_email').value,
          p = document.getElementById('acc_pass').value, p2 = document.getElementById('acc_pass2').value;
    let ok = true;
    err('acc_email', !/^[^@]+@[^@]+\.[^@]+$/.test(e)); if (!/^[^@]+@[^@]+\.[^@]+$/.test(e)) ok = false;
    err('acc_pass', p.length < 8); if (p.length < 8) ok = false;
    err('acc_pass2', p !== p2 || !p2); if (p !== p2 || !p2) ok = false;
    if (ok){ document.getElementById('otp_email').textContent = e; document.getElementById('log_email').value = e; }
    return ok;
  }
  if (step === 1){ return otpInputs.every(i => i.value); }
  if (step === 2){
    const e = document.getElementById('log_email').value, p = document.getElementById('log_pass').value;
    let ok = true; err('log_email', !e.trim()); if (!e.trim()) ok = false;
    err('log_pass', !p.trim()); if (!p.trim()) ok = false; return ok;
  }
  if (step === 3){
    const f = document.getElementById('ch_first').value.trim(), l = document.getElementById('ch_last').value.trim();
    let ok = true; err('ch_first', !f); err('ch_last', !l); if (!f || !l) ok = false; return ok;
  }
  if (step === 4){ return !!(selectedNation && selectedNation.playable); }
  return true;
}

/* ============ step machine ============ */
const steps = [...document.querySelectorAll('.step')];
const stepperNodes = [...document.querySelectorAll('.stp')];
const globeStops = [
  { x: 1.05, y: 0, scale: 1.0, accent: 1.0 },   // account
  { x: -1.05, y: 0, scale: 1.0, accent: 1.1 },  // verify
  { x: 1.05, y: 0, scale: 1.0, accent: 1.0 },   // login
  { x: 1.3, y: -0.1, scale: 0.95, accent: 0.8 },// character (off to the right)
  { x: -1.25, y: 0, scale: 1.15, accent: 1.0 }, // nation (peek left behind map)
  { x: 1.2, y: 0, scale: 1.1, accent: 1.0 },    // citizenship (card over dark)
  { x: 0, y: 0, scale: 1.7, accent: 1.7 },      // enter (rise up)
];
let cur = 0;
function setGlobe(i){ const s = globeStops[Math.min(i, globeStops.length - 1)]; Object.assign(target, s); }
function updateStepper(i){
  stepperNodes.forEach((n, idx) => {
    n.classList.toggle('active', idx === i);
    n.classList.toggle('done', idx < i);
  });
}
function goTo(i, dir = 1){
  if (i === cur) return;
  const outEl = steps[cur], inEl = steps[i];
  // synchronous swap — never depends on a (rAF-throttled) tween completing
  outEl.classList.remove('active');
  gsap.set(outEl, { clearProps: 'opacity,transform' });
  inEl.classList.add('active');
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
  gsap.fromTo(inEl, { opacity: 0, x: 46 * dir, y: 12, filter: 'blur(6px)' },
    { opacity: 1, x: 0, y: 0, filter: 'blur(0px)', duration: 0.95, ease: 'power4.out' });
  if (i === 5) fillSummary();
  if (i === 1) startOtpTimer();
  cur = i; updateStepper(Math.min(i, 5)); setGlobe(i);
}
// init
steps[0].classList.add('active'); gsap.set(steps[0], { opacity: 1 });
updateStepper(0); setGlobe(0);

document.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', async () => {
  const s = +b.dataset.next;
  if (!validate(s)) { gsap.fromTo(b.closest('.card'), { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,0.4)' }); return; }
  
  const span = b.querySelector('span');
  const origText = span.textContent;
  b.disabled = true;

  try {
    if (s === 0) {
      span.textContent = 'Requesting...';
      const email = document.getElementById('acc_email').value;
      const password = document.getElementById('acc_pass').value;
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || 'Registration failed');
      }
    } else if (s === 1) {
      span.textContent = 'Verifying...';
      const email = document.getElementById('otp_email').textContent;
      const otp = otpInputs.map(i => i.value).join('');
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, otp })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || err.message || 'Verification failed');
      }
    } else if (s === 2) {
      span.textContent = 'Authenticating...';
      const email = document.getElementById('log_email').value;
      const password = document.getElementById('log_pass').value;
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Login failed');
      localStorage.setItem('worldr_access_token', data.accessToken);
      if (data.refreshToken) localStorage.setItem('worldr_refresh_token', data.refreshToken);
    }
    
    span.textContent = origText;
    b.disabled = false;
    goTo(s + 1, 1);
  } catch (err) {
    span.textContent = origText;
    b.disabled = false;
    // Show error message
    const msg = document.createElement('div');
    msg.className = 'msg err';
    msg.style.color = '#ff6060';
    msg.style.marginTop = '12px';
    msg.textContent = err.message;
    b.closest('.actions').insertAdjacentElement('beforebegin', msg);
    setTimeout(() => msg.remove(), 4000);
  }
}));
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => goTo(+b.dataset.back - 1, -1)));

/* nation next label reflects selection */
const nationNext = document.getElementById('nationNext');
function refreshNationBtn(){ nationNext.querySelector('span').textContent = 'Pledge to ' + (selectedNation ? selectedNation.name : 'Drennia'); }
const _origRenderNations = renderNations;
nationList.addEventListener('click', () => setTimeout(refreshNationBtn, 0));

/* ============ citizenship summary + seal ============ */
function fullName(){
  const t = document.getElementById('ch_title').value, f = document.getElementById('ch_first').value.trim() || 'Aldric',
        l = document.getElementById('ch_last').value.trim() || 'Varn';
  return `${t === 'Citizen' ? '' : t + ' '}${f} ${l}`.trim();
}
function fillSummary(){
  document.getElementById('sm_name').textContent = fullName();
  document.getElementById('sm_gender').textContent = gender;
  document.getElementById('sm_culture').textContent = document.getElementById('ch_culture').value;
  const n = selectedNation;
  document.getElementById('sm_nation').textContent = n.name;
  document.getElementById('sm_capital').textContent = n.capital;
  document.getElementById('sm_gov').textContent = n.gov;
}
document.getElementById('confirmBtn').addEventListener('click', async () => {
  const btn = document.getElementById('confirmBtn');
  const seal = document.getElementById('seal'), stage = document.getElementById('sealStage');
  const span = btn.querySelector('span');
  
  btn.disabled = true;
  span.textContent = 'Confirming...';

  try {
    const token = localStorage.getItem('worldr_access_token');
    if (!token) throw new Error('Not authenticated. Please start over.');
    
    // We assume motherland_country_id maps to 'c_' + lowercase name for seed compatibility
    const motherland_country_id = 'c_' + selectedNation.name.toLowerCase();
    
    const res = await fetch('/api/v1/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ 
        name: fullName(), 
        motherland_country_id, 
        currency_id: 'DRX' 
      })
    });
    
    if (!res.ok) {
       const errData = await res.json();
       if (errData.error === 'CHARACTER_EXISTS' || errData.message === 'Character already exists') {
          // If character already exists, we can still proceed visually to the game
          console.log('Character already exists, proceeding to world');
       } else {
          throw new Error(errData.error || errData.message || 'Failed to create character');
       }
    }
    
    document.getElementById('confirmActions').style.pointerEvents = 'none';
    gsap.set(seal, { scale: 2.4, rotation: -35, opacity: 0 });
    const tl = gsap.timeline();
    tl.to(seal, { scale: 1, rotation: 0, opacity: 1, duration: 0.9, ease: 'power4.out' })
      .to(seal, { scale: 0.94, duration: 0.12, ease: 'power2.in' }, '>-0.02')
      .to(seal, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.5)' })
      .add(() => stage.classList.add('granted'))
      .to('.seal-txt', { opacity: 1, duration: 0.6 });
      
    // navigation on a wall-clock timer, independent of rAF-throttled tweens
    document.getElementById('welcomeName').textContent = fullName();
    setTimeout(() => goTo(6, 1), 2600);
  } catch (err) {
    btn.disabled = false;
    span.textContent = 'Confirm Citizenship';
    const msg = document.createElement('div');
    msg.className = 'msg err';
    msg.style.color = '#ff6060';
    msg.style.marginTop = '12px';
    msg.textContent = err.message;
    document.getElementById('confirmActions').insertAdjacentElement('beforebegin', msg);
    setTimeout(() => msg.remove(), 4000);
  }
});

document.getElementById('enterBtn').addEventListener('click', function(){
  this.querySelector('span').textContent = 'Loading Aethan…';
  gsap.to(target, { scale: 6, accent: 3, duration: 2.2, ease: 'power3.in' });
  gsap.to('.card', { opacity: 0, scale: 1.05, duration: 1.2, ease: 'power2.in', delay: 0.3 });
});

document.getElementById('quit').addEventListener('click', e => { e.preventDefault();
  gsap.fromTo('.flow-brand', { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1,.4)' }); });

/* tactile button glow tracking */
document.querySelectorAll('.btn').forEach(btn => btn.addEventListener('pointermove', e => {
  const r = btn.getBoundingClientRect();
  btn.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
  btn.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
}));

refreshNationBtn();
