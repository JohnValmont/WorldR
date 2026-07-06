import * as THREE from 'three';

/* ======================================================================
   WORLDr — cinematic access experience
   Three.js globe of Drennia · GSAP ScrollTrigger · Lenis smooth scroll
   ====================================================================== */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
gsap.registerPlugin(ScrollTrigger);

/* ---------- Lenis smooth scroll ---------- */
let lenis;
if (!reduceMotion) {
  lenis = new Lenis({ duration: 1.25, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ====================================================================
   THREE.JS SCENE — the globe of Drennia (Point Cloud Edition)
   ==================================================================== */
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 3.35);

const root = new THREE.Group();
scene.add(root);
const globeGroup = new THREE.Group();
root.add(globeGroup);

/* ---------- FBM noise helpers (CPU-side for point placement) ---------- */
function hash(n) { return (Math.sin(n) * 43758.5453) % 1; }
function vnoise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx*fx*(3-2*fx), uy = fy*fy*(3-2*fy), uz = fz*fz*(3-2*fz);
  const h = (a,b,c) => hash(a*127.1 + b*311.7 + c*74.7) * 2 - 1;
  return (
    (1-uz)*((1-uy)*((1-ux)*h(ix,iy,iz)   + ux*h(ix+1,iy,iz)  )
                  +(   uy)*( (1-ux)*h(ix,iy+1,iz) + ux*h(ix+1,iy+1,iz)))
   +    uz*((1-uy)*((1-ux)*h(ix,iy,iz+1) + ux*h(ix+1,iy,iz+1))
                  +(   uy)*( (1-ux)*h(ix,iy+1,iz+1) + ux*h(ix+1,iy+1,iz+1)))
  ) * 0.5 + 0.5;
}
function fbm3(x, y, z) {
  let s = 0, a = 0.5;
  for (let i = 0; i < 5; i++) {
    s += a * vnoise3(x, y, z);
    x *= 2.02; y *= 2.02; z *= 2.02; a *= 0.5;
  }
  return s;
}

/* ---------- Dark inner core (so the back-face doesn't bleed) ---------- */
const core = new THREE.Mesh(
  new THREE.SphereGeometry(0.994, 64, 64),
  new THREE.MeshBasicMaterial({ color: 0x040608 })
);
globeGroup.add(core);

/* ---------- POINT CLOUD — the globe itself ---------- */
const DOTS = 28000;
const dotPositions = new Float32Array(DOTS * 3);
const dotColors    = new Float32Array(DOTS * 3);
const dotSizes     = new Float32Array(DOTS);

const amberHi = new THREE.Color(0xf4cf82);
const amberMid = new THREE.Color(0xe6a93b);
const amberLo  = new THREE.Color(0xcd8c1e);
const oceanDim = new THREE.Color(0x1a1006);

for (let i = 0; i < DOTS; i++) {
  // Uniform sphere sampling (Marsaglia)
  const u = Math.random() * 2 - 1;
  const th = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  const nx = r * Math.cos(th), ny = u, nz = r * Math.sin(th);

  const land = fbm3(nx * 2.4, ny * 2.4, nz * 2.4);
  const isLand = land > 0.515;

  // Reject ocean dots to keep density higher on land — use probability
  if (!isLand && Math.random() > 0.22) { i--; continue; }

  dotPositions[i*3]   = nx;
  dotPositions[i*3+1] = ny;
  dotPositions[i*3+2] = nz;

  // Colour: bright on land, dim on ocean
  if (isLand) {
    const t = Math.random();
    const col = t < 0.3 ? amberHi : t < 0.65 ? amberMid : amberLo;
    dotColors[i*3] = col.r; dotColors[i*3+1] = col.g; dotColors[i*3+2] = col.b;
    dotSizes[i] = 0.014 + Math.random() * 0.016;
  } else {
    dotColors[i*3] = oceanDim.r; dotColors[i*3+1] = oceanDim.g; dotColors[i*3+2] = oceanDim.b;
    dotSizes[i] = 0.006 + Math.random() * 0.006;
  }
}

const dotGeo = new THREE.BufferGeometry();
dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
dotGeo.setAttribute('color',    new THREE.BufferAttribute(dotColors,    3));
dotGeo.setAttribute('size',     new THREE.BufferAttribute(dotSizes,     1));

// Custom dot texture — sharp soft disc
const dotCanvas = document.createElement('canvas');
dotCanvas.width = dotCanvas.height = 64;
const dctx = dotCanvas.getContext('2d');
const dg = dctx.createRadialGradient(32,32,0,32,32,32);
dg.addColorStop(0,   'rgba(255,255,255,1)');
dg.addColorStop(0.35,'rgba(255,255,255,0.85)');
dg.addColorStop(0.7, 'rgba(255,255,255,0.15)');
dg.addColorStop(1,   'rgba(255,255,255,0)');
dctx.fillStyle = dg; dctx.fillRect(0,0,64,64);
const dotTex = new THREE.CanvasTexture(dotCanvas);

const dotMat = new THREE.ShaderMaterial({
  uniforms: {
    uTex:    { value: dotTex },
    uTime:   { value: 0 },
    uAccent: { value: 1.0 },
  },
  vertexShader: /* glsl */`
    attribute float size;
    attribute vec3 color;
    varying vec3 vColor;
    varying float vAtten;
    uniform float uTime;
    uniform float uAccent;
    void main(){
      vColor = color;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      // Subtle shimmer per dot based on position
      float shimmer = sin(uTime * 1.8 + position.x*6.2 + position.y*4.7 + position.z*5.1) * 0.5 + 0.5;
      float s = size * (0.82 + 0.38 * shimmer * uAccent);
      gl_PointSize = s * (900.0 / -mv.z);
      vAtten = shimmer;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D uTex;
    varying vec3 vColor;
    varying float vAtten;
    void main(){
      vec4 t = texture2D(uTex, gl_PointCoord);
      float alpha = t.a * (0.75 + 0.25 * vAtten);
      gl_FragColor = vec4(vColor * (0.9 + 0.45*vAtten), alpha);
    }`,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  vertexColors: true,
});

const globe = new THREE.Points(dotGeo, dotMat);
globeGroup.add(globe);

// Expose uniforms globally so tick() can reach them
const globeUniforms = dotMat.uniforms;
// dummy cage so tick() doesn't throw (cage.rotation used below)
const cage = { rotation: { x: 0, y: 0 } };

/* ---------- Atmosphere layers ---------- */
// Layer 1: tight fresnel glow (inner atmosphere)
const mkAtmo = (radius, power, opacity, color) => {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 64, 64),
    new THREE.ShaderMaterial({
      transparent: true, blending: THREE.AdditiveBlending,
      side: THREE.BackSide, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(color) } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vec4 mv=modelViewMatrix*vec4(position,1.); vV=mv.xyz;
          vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vN; varying vec3 vV; uniform vec3 uColor;
        void main(){ vec3 vd=normalize(-vV);
          float f=pow(1.-max(dot(normalize(vN),vd),0.),${power.toFixed(1)});
          gl_FragColor=vec4(uColor, f*${opacity.toFixed(2)}); }`,
    })
  );
};
globeGroup.add(mkAtmo(1.06, 3.2, 1.10, 0xf4cf82));  // tight golden rim
globeGroup.add(mkAtmo(1.18, 2.6, 0.55, 0xcd8c1e));  // mid amber halo
globeGroup.add(mkAtmo(1.38, 1.8, 0.22, 0x7a4a08));  // wide diffuse bloom

/* ---------- Equatorial ring ---------- */
const ringGeo = new THREE.RingGeometry(1.08, 1.115, 128);
const ringMat = new THREE.MeshBasicMaterial({
  color: 0xf4cf82, transparent: true, opacity: 0.055,
  side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
});
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = Math.PI / 2;
globeGroup.add(ring);

/* ---------- Capital hotspot pulses (6 glowing nodes on surface) ---------- */
const hotspots = [];
const CAPITALS = [
  { lat:  0.62, lon:  0.4  },  // Drennport
  { lat: -0.3,  lon:  2.1  },
  { lat:  0.8,  lon: -1.2  },
  { lat:  0.1,  lon:  3.5  },
  { lat: -0.55, lon: -0.8  },
  { lat:  0.45, lon:  1.85 },
];
const hotCanvas = document.createElement('canvas');
hotCanvas.width = hotCanvas.height = 128;
const hctx = hotCanvas.getContext('2d');
const hg = hctx.createRadialGradient(64,64,0,64,64,64);
hg.addColorStop(0,   'rgba(244,207,130,1)');
hg.addColorStop(0.2, 'rgba(244,207,130,0.7)');
hg.addColorStop(0.6, 'rgba(205,140,30,0.15)');
hg.addColorStop(1,   'rgba(205,140,30,0)');
hctx.fillStyle = hg; hctx.fillRect(0,0,128,128);
const hotTex = new THREE.CanvasTexture(hotCanvas);

CAPITALS.forEach((cap, i) => {
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({
    map: hotTex, transparent: true, opacity: 0.0,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const sc = 0.10; spr.scale.set(sc, sc, sc);
  const x = Math.cos(cap.lat) * Math.cos(cap.lon);
  const y = Math.sin(cap.lat);
  const z = Math.cos(cap.lat) * Math.sin(cap.lon);
  spr.position.set(x, y, z);
  hotspots.push({ spr, phase: (i / CAPITALS.length) * Math.PI * 2 });
  globeGroup.add(spr);
});

/* ====================================================================
   INSTITUTIONAL ICONS — parliament seal, stock ticker, factory, gavel, ledger
   drawn to canvas textures, orbiting the globe as sprites
   ==================================================================== */
function iconTexture(draw) {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d');
  x.strokeStyle = '#f4cf82'; x.fillStyle = '#f4cf82';
  x.lineWidth = 5; x.lineJoin = 'round'; x.lineCap = 'round';
  x.translate(s / 2, s / 2);
  draw(x, s);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
const icons = [
  // parliament seal (dome + columns)
  iconTexture((x) => { x.beginPath(); x.arc(0, -18, 26, Math.PI, 0); x.stroke();
    x.beginPath(); x.moveTo(-30, -18); x.lineTo(30, -18); x.stroke();
    for (let i = -3; i <= 3; i++){ x.beginPath(); x.moveTo(i*9, -14); x.lineTo(i*9, 26); x.stroke(); }
    x.beginPath(); x.moveTo(-34, 30); x.lineTo(34, 30); x.stroke(); }),
  // stock ticker (up chart + arrow)
  iconTexture((x) => { x.beginPath(); x.moveTo(-34, 22); x.lineTo(-10, -6); x.lineTo(6, 8); x.lineTo(34, -24); x.stroke();
    x.beginPath(); x.moveTo(22, -24); x.lineTo(34, -24); x.lineTo(34, -12); x.stroke(); }),
  // factory (silhouette + stacks)
  iconTexture((x) => { x.beginPath(); x.moveTo(-34, 28); x.lineTo(-34, -6); x.lineTo(-10, 6); x.lineTo(-10, -6);
    x.lineTo(14, 6); x.lineTo(14, -6); x.lineTo(34, 6); x.lineTo(34, 28); x.closePath(); x.stroke();
    x.beginPath(); x.moveTo(-26, -6); x.lineTo(-26, -26); x.lineTo(-16, -26); x.lineTo(-16, -1); x.stroke(); }),
  // gavel
  iconTexture((x) => { x.save(); x.rotate(-0.5);
    x.beginPath(); x.roundRect(-8, -30, 16, 30, 3); x.stroke();
    x.beginPath(); x.moveTo(4, -2); x.lineTo(30, 24); x.stroke(); x.restore();
    x.beginPath(); x.moveTo(-30, 30); x.lineTo(6, 30); x.stroke(); }),
  // ledger / public record (book + lines)
  iconTexture((x) => { x.beginPath(); x.roundRect(-26, -28, 52, 56, 4); x.stroke();
    x.beginPath(); x.moveTo(0, -28); x.lineTo(0, 28); x.stroke();
    for (let i = 0; i < 3; i++){ x.beginPath(); x.moveTo(-18, -12 + i*12); x.lineTo(-6, -12 + i*12); x.stroke();
      x.beginPath(); x.moveTo(6, -12 + i*12); x.lineTo(18, -12 + i*12); x.stroke(); } }),
];

const orbiters = [];
icons.forEach((tex, i) => {
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.92,
    blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
  const sc = 0.34; spr.scale.set(sc, sc, sc);
  const o = { spr, radius: 1.62 + (i % 2) * 0.16, speed: 0.14 + i * 0.018,
    phase: (i / icons.length) * Math.PI * 2, tilt: -0.5 + (i * 0.42) };
  orbiters.push(o); globeGroup.add(spr);
});

/* ====================================================================
   PARTICLE FIELD — drifting light particles behind everything
   ==================================================================== */
function discTexture() {
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d'); const g = x.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  g.addColorStop(0, 'rgba(244,207,130,1)'); g.addColorStop(0.3, 'rgba(205,140,30,0.5)');
  g.addColorStop(1, 'rgba(205,140,30,0)');
  x.fillStyle = g; x.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}
const PCOUNT = 900;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PCOUNT * 3);
const pSpeed = new Float32Array(PCOUNT);
for (let i = 0; i < PCOUNT; i++) {
  const r = 2.5 + Math.random() * 7;
  const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
  pPos[i*3]   = r * Math.sin(ph) * Math.cos(th);
  pPos[i*3+1] = (Math.random() - 0.5) * 14;
  pPos[i*3+2] = r * Math.sin(ph) * Math.sin(th);
  pSpeed[i] = 0.15 + Math.random() * 0.5;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
  size: 0.055, map: discTexture(), transparent: true, opacity: 0.7,
  blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
}));
scene.add(particles);

/* ====================================================================
   RENDER LOOP
   ==================================================================== */
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
window.addEventListener('pointermove', e => {
  pointer.tx = (e.clientX / innerWidth - 0.5);
  pointer.ty = (e.clientY / innerHeight - 0.5);
});

const scrollState = { posX: 0, posY: 0, scale: 1, spin: 0, accent: 1 };
const clock = new THREE.Clock();

function tick() {
  const dt = clock.getDelta();
  const t = clock.elapsedTime;
  globeUniforms.uTime.value = t;
  globeUniforms.uAccent.value += (scrollState.accent - globeUniforms.uAccent.value) * 0.04;

  // globe slow rotation
  globe.rotation.y += dt * 0.055;
  core.rotation.y = globe.rotation.y;
  ring.rotation.z += dt * 0.018;

  // capital hotspot pulse — sine breath, fade in/out
  hotspots.forEach((h, i) => {
    const pulse = Math.sin(t * 2.2 + h.phase) * 0.5 + 0.5;
    h.spr.material.opacity = 0.3 + 0.7 * pulse;
    const sc = 0.08 + 0.06 * pulse;
    h.spr.scale.set(sc, sc, sc);
  });


  // orbiting institution icons
  orbiters.forEach(o => {
    const a = t * o.speed + o.phase;
    o.spr.position.set(
      Math.cos(a) * o.radius,
      Math.sin(a * 0.6 + o.tilt) * 0.55,
      Math.sin(a) * o.radius
    );
    const dz = o.spr.position.z;
    o.spr.material.opacity = 0.45 + 0.5 * ((dz + o.radius) / (2 * o.radius));
  });

  // particle drift
  particles.rotation.y += dt * 0.01;
  const arr = pGeo.attributes.position.array;
  for (let i = 0; i < PCOUNT; i++) {
    arr[i*3+1] += pSpeed[i] * dt * 0.25;
    if (arr[i*3+1] > 7) arr[i*3+1] = -7;
  }
  pGeo.attributes.position.needsUpdate = true;

  // pointer parallax
  pointer.x += (pointer.tx - pointer.x) * 0.045;
  pointer.y += (pointer.ty - pointer.y) * 0.045;

  // scroll-driven placement
  globeGroup.position.x += (scrollState.posX - globeGroup.position.x) * 0.06;
  globeGroup.position.y += (scrollState.posY - globeGroup.position.y) * 0.06;
  const sTarget = scrollState.scale;
  globeGroup.scale.x += (sTarget - globeGroup.scale.x) * 0.06;
  globeGroup.scale.y = globeGroup.scale.z = globeGroup.scale.x;
  globeGroup.rotation.y = scrollState.spin + pointer.x * 0.4;
  globeGroup.rotation.x = -pointer.y * 0.3 + 0.05;

  camera.position.x += (pointer.x * 0.25 - camera.position.x) * 0.05;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ====================================================================
   WORDMARK — glyphs assemble from fragments on load
   ==================================================================== */
function assembleWordmark() {
  const glyphs = gsap.utils.toArray('#wordmark .glyph');
  gsap.set(glyphs, {
    opacity: 0,
    y: () => gsap.utils.random(-120, 120),
    x: () => gsap.utils.random(-80, 80),
    rotationX: () => gsap.utils.random(-90, 90),
    rotationZ: () => gsap.utils.random(-40, 40),
    scale: 0.4, filter: 'blur(14px)'
  });
  gsap.to(glyphs, {
    opacity: 1, x: 0, y: 0, rotationX: 0, rotationZ: 0, scale: 1, filter: 'blur(0px)',
    duration: 1.15, ease: 'power4.out', stagger: 0.09
  });
}

/* ====================================================================
   LOADER → reveal
   ==================================================================== */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  gsap.delayedCall(0.6, () => {
    loader.classList.add('hide');
    assembleWordmark();
    gsap.to('.hero .reveal', { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.14, delay: 0.4 });
    gsap.to('#hud', { opacity: 1, x: 0, duration: 1.2, ease: 'power3.out', delay: 1.1 });
  });
});
// hero reveal initial state
gsap.set('.hero .reveal', { opacity: 0, y: 26 });
gsap.set('#hud', { x: 24 });

/* ====================================================================
   GSAP SCROLLTRIGGER — cinematic section reveals + globe choreography
   ==================================================================== */
const pillars = gsap.utils.toArray('.pillar');

// mini brand crest appears as we leave the hero (wordmark → crest beat)
ScrollTrigger.create({
  trigger: '.hero', start: 'bottom 80%',
  onEnter: () => gsap.to('#brandMini', { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }),
  onLeaveBack: () => gsap.to('#brandMini', { opacity: 0, y: -8, duration: 0.6, ease: 'power2.out' })
});

// per-pillar content reveals with layered parallax
pillars.forEach((p) => {
  const copy = p.querySelectorAll('.pillar-eyebrow,.pillar-title,.pillar-lead,.pillar-points li,.ledger-line');
  const panel = p.querySelector('.data-panel,.ledger');
  gsap.set(copy, { opacity: 0, y: 40 });
  if (panel) gsap.set(panel, { opacity: 0, y: 60, rotationX: 6 });

  ScrollTrigger.create({
    trigger: p, start: 'top 68%',
    onEnter: () => {
      gsap.to(copy, { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', stagger: 0.08 });
      if (panel) gsap.to(panel, { opacity: 1, y: 0, rotationX: 0, duration: 1.15, ease: 'power4.out', delay: 0.15 });
    },
    once: true
  });
});

// data-panel drift parallax (scrubbed)
gsap.utils.toArray('.parallax').forEach(el => {
  const sp = parseFloat(el.dataset.speed || '0.12');
  gsap.fromTo(el, { yPercent: sp * 100 }, {
    yPercent: -sp * 100, ease: 'none',
    scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
  });
});

// globe choreography — moves opposite the copy, changes accent per chapter
const stops = [
  { sel: '#hero',     posX: 0,     posY: 0,    scale: 1.0,  accent: 1.0 },
  { sel: '#pillar-1', posX: 0.95,  posY: 0,    scale: 1.05, accent: 0.7 },
  { sel: '#pillar-2', posX: -1.0,  posY: 0,    scale: 1.1,  accent: 1.2 },
  { sel: '#pillar-3', posX: 0.95,  posY: 0,    scale: 1.05, accent: 1.0 },
  { sel: '#pillar-4', posX: -1.0,  posY: 0,    scale: 1.1,  accent: 1.3 },
  { sel: '#pillar-5', posX: 0,     posY: 0.15, scale: 1.35, accent: 1.5 },
  { sel: '#console',  posX: 0,     posY: 0.05, scale: 0.7,  accent: 0.8 },
];
stops.forEach((s, i) => {
  ScrollTrigger.create({
    trigger: s.sel, start: 'top 60%', end: 'bottom 40%',
    onToggle: self => {
      if (self.isActive) {
        gsap.to(scrollState, { posX: s.posX, posY: s.posY, scale: s.scale, accent: s.accent,
          duration: 1.2, ease: 'power3.out' });
      }
    }
  });
});
// continuous spin tied to full scroll
ScrollTrigger.create({
  trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 1.5,
  onUpdate: self => { scrollState.spin = self.progress * Math.PI * 1.4; }
});

// console card entrance
gsap.set('.console-card', { opacity: 0, y: 70, scale: 0.96 });
ScrollTrigger.create({
  trigger: '#console', start: 'top 70%', once: true,
  onEnter: () => gsap.to('.console-card', { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power4.out' })
});

/* ====================================================================
   LIVE DATA — gently ticking numbers (state dept dashboard)
   ==================================================================== */
const tickers = {
  approval: { base: 61.4, range: 0.6, fmt: v => v.toFixed(1) + '<i>%</i>', el: [] },
  approval2:{ base: 61.4, range: 0.6, fmt: v => v.toFixed(1) + '%' , el: [] },
  seats:    { base: 148,  range: 2,   fmt: v => Math.round(v), el: [] },
  index:    { base: 12704.8, range: 42, fmt: v => v.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1}), el: [] },
  index2:   { base: 12704.8, range: 42, fmt: v => v.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1}), el: [] },
  gdp:      { base: 4.812, range: 0.02, fmt: v => '$'+v.toFixed(3)+'<i>T</i>', el: [] },
  gdp2:     { base: 4.812, range: 0.02, fmt: v => '$'+v.toFixed(3)+'T', el: [] },
  pop:      { base: 318.6, range: 0.3, fmt: v => v.toFixed(1)+'M', el: [] },
  bills:    { base: 14, range: 2, fmt: v => Math.round(v), el: [] },
  vol:      { base: 8.42, range: 0.5, fmt: v => v.toFixed(2)+'M', el: [] },
  npc:      { base: 9318, range: 40, fmt: v => Math.round(v).toLocaleString('en-US'), el: [] },
  cases:    { base: 37, range: 4, fmt: v => Math.round(v), el: [] },
};
document.querySelectorAll('[data-tick]').forEach(el => {
  const k = el.dataset.tick; if (tickers[k]) tickers[k].el.push(el);
});
function stepTickers() {
  Object.values(tickers).forEach(t => {
    const v = t.base + (Math.random() - 0.5) * t.range;
    const html = t.fmt(v);
    t.el.forEach(el => { el.innerHTML = html; });
  });
}
stepTickers();
if (!reduceMotion) setInterval(stepTickers, 2200);

/* ---------- sparklines & bar charts in data panels ---------- */
document.querySelectorAll('[data-spark]').forEach(el => {
  const w = 240, h = 52, n = 40;
  let d = `M 0 ${h/2}`;
  for (let i = 1; i <= n; i++) {
    const x = (i / n) * w;
    const y = h/2 - Math.sin(i * 0.5) * 8 - (Math.random() * 10) + (i / n) * 6;
    d += ` L ${x.toFixed(1)} ${Math.max(4, Math.min(h-4, y)).toFixed(1)}`;
  }
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="none">
    <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e6a93b" stop-opacity="0.35"/><stop offset="1" stop-color="#cd8c1e" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L ${w} ${h} L 0 ${h} Z" fill="url(#sg)"/>
    <path d="${d}" fill="none" stroke="#e6a93b" stroke-width="1.4"/></svg>`;
});
document.querySelectorAll('[data-bars]').forEach(el => {
  let html = '';
  for (let i = 0; i < 14; i++) html += '<i style="height:0%"></i>';
  el.innerHTML = html;
  ScrollTrigger.create({
    trigger: el, start: 'top 85%', once: true,
    onEnter: () => el.querySelectorAll('i').forEach(b => { b.style.height = (18 + Math.random() * 82) + '%'; })
  });
});

/* ====================================================================
   TACTILE BUTTONS — cursor-tracked amber bloom + heavy press
   ==================================================================== */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('pointermove', e => {
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    btn.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });
  btn.addEventListener('click', () => {
    gsap.fromTo(btn, { scale: 0.985 }, { scale: 1, duration: 0.7, ease: 'elastic.out(1,0.5)' });
  });
});

/* smooth-scroll internal anchors through Lenis */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href'); if (id.length < 2) return;
    const target = document.querySelector(id); if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
    else target.scrollIntoView({ behavior: 'smooth' });
  });
});

ScrollTrigger.refresh();

/* ====================================================================
   AUTH & DISCORD ROUTING
   ==================================================================== */
const btnCreate = document.getElementById('btnCreate');
const btnLogin = document.getElementById('btnLogin');
const btnDiscord = document.getElementById('btnDiscord');

if (btnCreate) btnCreate.addEventListener('click', () => { window.location.href = '/landing/onboarding.html?action=register'; });
if (btnLogin) btnLogin.addEventListener('click', () => { window.location.href = '/landing/onboarding.html?action=login'; });
if (btnDiscord) btnDiscord.addEventListener('click', () => { window.open('https://discord.gg/K64Ff8fN', '_blank'); });
