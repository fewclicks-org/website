// Bubble Pop Planet: the Three.js bubble world.
// Floating glossy candy bubbles + clear soap bubbles, pop particles, and the giant intro bubble.

import * as THREE from '../../vendor/three.module.min.js';
import { reducedMotion, lowPower } from '../../shared/js/motion.js';

export const PALETTE = ['#ff5fa2', '#7b5cff', '#2fd6a6', '#ffd23f', '#4cc9ff', '#ff8a3d', '#c48bff'];

// --- Soap-film shader (used for the intro bubble and clear background bubbles) ---
const soapVertex = /* glsl */ `
  uniform float uTime;
  uniform float uWobble;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 p = position;
    float n = sin(p.x * 2.6 + uTime * 2.1) * sin(p.y * 2.3 + uTime * 1.7) * sin(p.z * 2.9 + uTime * 1.3);
    n += 0.5 * sin(p.y * 5.0 - uTime * 3.0);
    p += normal * n * uWobble;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const soapFragment = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uTint;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec3 n = normalize(vN);
    float facing = abs(dot(n, normalize(vV)));
    float fr = pow(1.0 - facing, 2.2);
    vec3 rainbow = 0.55 + 0.45 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + fr * 1.4 + n.y * 0.35 + uTime * 0.06));
    vec3 col = mix(uTint, rainbow, 0.55 + fr * 0.4);
    vec3 L = normalize(vec3(-0.45, 0.7, 0.55));
    vec3 H = normalize(L + normalize(vV));
    float spec = pow(max(dot(n, H), 0.0), 70.0);
    vec3 L2 = normalize(vec3(0.6, -0.5, 0.6));
    float spec2 = pow(max(dot(n, normalize(L2 + normalize(vV))), 0.0), 120.0) * 0.6;
    float a = clamp(0.06 + fr * 0.9 + spec + spec2, 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(col + spec + spec2, a);
  }
`;

function soapMaterial(tint = '#ffffff', wobble = 0.03) {
  return new THREE.ShaderMaterial({
    vertexShader: soapVertex,
    fragmentShader: soapFragment,
    uniforms: {
      uTime: { value: 0 },
      uWobble: { value: wobble },
      uOpacity: { value: 1 },
      uTint: { value: new THREE.Color(tint) },
    },
    transparent: true,
    depthWrite: false,
  });
}

const ease = {
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inBack: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
};

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{count?: number, palette?: string[], soapRatio?: number, interactive?: boolean}} opts
 */
export function createBubbleWorld(canvas, opts = {}) {
  const palette = opts.palette || PALETTE;
  const count = opts.count ?? (lowPower ? 11 : 18);
  const soapRatio = opts.soapRatio ?? 0.3;
  const speedMul = reducedMotion ? 0.15 : 1;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !lowPower, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xffd6ec, 1.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(-4, 6, 8);
  scene.add(key);

  const sphereGeo = new THREE.SphereGeometry(1, lowPower ? 32 : 48, lowPower ? 20 : 32);
  const dropGeo = new THREE.SphereGeometry(1, 12, 8);
  const ringGeo = new THREE.RingGeometry(0.92, 1, 48);

  const candyMats = new Map();
  const candy = (hex) => {
    if (!candyMats.has(hex)) {
      // Keep bubbles candy-bright even if a game's theme color is dark.
      const base = new THREE.Color(hex);
      const hsl = base.getHSL({});
      if (hsl.l < 0.5) base.setHSL(hsl.h, Math.max(hsl.s, 0.5), 0.62);
      candyMats.set(hex, new THREE.MeshPhysicalMaterial({
        color: base,
        emissive: base.clone().multiplyScalar(0.18),
        roughness: 0.12,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        iridescence: 0.35,
        iridescenceIOR: 1.35,
        iridescenceThicknessRange: [120, 520],
        sheen: 0.25,
        sheenColor: new THREE.Color('#ffffff'),
        envMapIntensity: 0.75,
      }));
    }
    return candyMats.get(hex);
  };

  // ---- Visible bounds helper ----
  let W = 1, H = 1;
  const halfAt = (z) => {
    const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - z);
    return { h, w: h * camera.aspect };
  };

  // ---- Background bubbles ----
  const bubbles = [];
  function spawn(b, initial = false) {
    const z = THREE.MathUtils.randFloat(-7, 3);
    const { w, h } = halfAt(z);
    const narrow = camera.aspect < 0.8;
    b.r = THREE.MathUtils.randFloat(0.25, narrow ? 0.85 : 1.15) * (b.soap ? 1.15 : 1);
    b.pos.set(THREE.MathUtils.randFloat(-w, w), initial ? THREE.MathUtils.randFloat(-h, h) : -h - b.r - THREE.MathUtils.randFloat(0, 2), z);
    b.vy = THREE.MathUtils.randFloat(0.25, 0.7);
    b.phase = Math.random() * Math.PI * 2;
    b.sway = THREE.MathUtils.randFloat(0.2, 0.6);
    b.push.set(0, 0, 0);
    b.grow = initial ? 1 : 0;
    b.alive = true;
    b.mesh.visible = true;
  }
  for (let i = 0; i < count; i++) {
    const soap = i / count < soapRatio;
    const color = palette[i % palette.length];
    const mesh = new THREE.Mesh(sphereGeo, soap ? soapMaterial('#ffffff', 0.05) : candy(color));
    if (soap) mesh.renderOrder = 2;
    scene.add(mesh);
    const b = { mesh, soap, color: soap ? '#c48bff' : color, pos: mesh.position, push: new THREE.Vector3(), r: 1, vy: 0.5, phase: 0, sway: 0.4, grow: 1, alive: true };
    bubbles.push(b);
  }

  // ---- Particles (pop droplets + rings) ----
  const particles = [];
  function burst(pos, color, r, n = 14) {
    const mat = candy(color);
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(dropGeo, mat);
      const dir = new THREE.Vector3().randomDirection();
      m.position.copy(pos).addScaledVector(dir, r * 0.8);
      const s = r * THREE.MathUtils.randFloat(0.08, 0.2);
      m.scale.setScalar(s);
      scene.add(m);
      particles.push({ m, v: dir.multiplyScalar(THREE.MathUtils.randFloat(3, 7) * Math.max(0.6, r)), life: 1, decay: THREE.MathUtils.randFloat(1.2, 2), s });
    }
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    ring.position.copy(pos);
    ring.scale.setScalar(r);
    scene.add(ring);
    particles.push({ m: ring, ring: true, life: 1, decay: 2.4, s: r });
  }

  // ---- Intro bubble ----
  let intro = null;
  function startIntro() {
    const mat = soapMaterial('#fff4fb', 0.06);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), mat);
    mesh.renderOrder = 3;
    scene.add(mesh);
    intro = { mesh, mat, t: 0, hover: 0, popping: false, popT: 0, onPop: null };
    return new Promise((resolve) => { intro.onPop = resolve; });
  }
  function introRadius() {
    const { h, w } = halfAt(0);
    return Math.min(h * 0.46, w * 0.62);
  }
  function popIntro() {
    if (!intro || intro.popping) return;
    intro.popping = true;
    intro.popT = 0;
  }
  function finishIntroPop() {
    const r = introRadius();
    const pos = intro.mesh.position.clone();
    palette.forEach((c, i) => burst(pos, c, r * 0.9, i < 3 ? 10 : 6));
    for (let k = 0; k < 3; k++) {
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: new THREE.Color(palette[k]), transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
      ring.position.copy(pos);
      ring.scale.setScalar(r * (0.8 + k * 0.2));
      scene.add(ring);
      particles.push({ m: ring, ring: true, life: 1, decay: 1.4 + k * 0.3, s: r * (1 + k * 0.3) });
    }
    scene.remove(intro.mesh);
    intro.mesh.geometry.dispose();
    intro.mat.dispose();
    const done = intro.onPop;
    intro = null;
    shake = 0.35;
    if (done) done();
  }

  // ---- Pointer ----
  const pointer = { x: -9999, y: -9999, active: false };
  const onMove = (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; };
  const onLeave = () => { pointer.active = false; };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);

  let lastScroll = window.scrollY;
  let scrollImpulse = 0;
  const onScroll = () => { const y = window.scrollY; scrollImpulse += (y - lastScroll) * 0.004; lastScroll = y; };
  window.addEventListener('scroll', onScroll, { passive: true });

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const tmp = new THREE.Vector3();
  const toScreen = (v) => { tmp.copy(v).project(camera); return { x: (tmp.x * 0.5 + 0.5) * W, y: (-tmp.y * 0.5 + 0.5) * H }; };

  /** Try to pop a background bubble at a screen point. Returns info about the popped bubble or null. */
  function popAt(clientX, clientY) {
    ndc.set((clientX / W) * 2 - 1, -(clientY / H) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(bubbles.filter((b) => b.alive).map((b) => b.mesh), false);
    if (!hits.length) return null;
    const b = bubbles.find((x) => x.mesh === hits[0].object);
    const screen = toScreen(b.pos);
    burst(b.pos.clone(), b.color, b.mesh.scale.x);
    b.alive = false;
    b.mesh.visible = false;
    setTimeout(() => spawn(b), 600 + Math.random() * 1200);
    return { x: screen.x, y: screen.y, color: b.color, size: b.r };
  }

  /** Is there a bubble under this point? (for cursor feedback) */
  function bubbleAt(clientX, clientY) {
    ndc.set((clientX / W) * 2 - 1, -(clientY / H) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(bubbles.filter((b) => b.alive).map((b) => b.mesh), false).length > 0;
  }

  function setPalette(colors) {
    bubbles.forEach((b, i) => {
      if (b.soap) return;
      b.color = colors[i % colors.length];
      b.mesh.material = candy(b.color);
    });
  }

  // ---- Resize ----
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);
  bubbles.forEach((b) => spawn(b, true));

  // ---- Loop ----
  let shake = 0;
  let running = true;
  let raf = 0;
  const timer = new THREE.Timer();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    timer.update(now);
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    scrollImpulse *= 0.9;

    for (const b of bubbles) {
      if (!b.alive) continue;
      const { w, h } = halfAt(b.pos.z);
      b.grow = Math.min(1, b.grow + dt * 1.5);
      b.pos.y += (b.vy * speedMul + scrollImpulse * 3) * dt;
      b.pos.x += Math.sin(t * b.sway + b.phase) * 0.004 * speedMul;
      // pointer repel (screen space)
      if (pointer.active && !reducedMotion) {
        const s = toScreen(b.pos);
        const dx = s.x - pointer.x, dy = s.y - pointer.y;
        const d = Math.hypot(dx, dy);
        const radiusPx = 170;
        if (d < radiusPx && d > 0.001) {
          const f = (1 - d / radiusPx) * 0.06;
          b.push.x += (dx / d) * f;
          b.push.y -= (dy / d) * f;
        }
      }
      b.push.multiplyScalar(0.92);
      b.pos.x += b.push.x;
      b.pos.y += b.push.y;
      if (b.pos.y > h + b.r + 0.5) { spawn(b); continue; }
      if (b.pos.y < -h - b.r - 3) b.pos.y = h + b.r;
      if (b.pos.x > w + b.r) b.pos.x = -w - b.r;
      if (b.pos.x < -w - b.r) b.pos.x = w + b.r;
      const wob = reducedMotion ? 0 : 0.045;
      const g = ease.outElastic(b.grow);
      b.mesh.scale.set(b.r * g * (1 + wob * Math.sin(t * 3 + b.phase)), b.r * g * (1 + wob * Math.cos(t * 3 + b.phase)), b.r * g);
      b.mesh.rotation.y = t * 0.2 + b.phase;
      if (b.soap) b.mesh.material.uniforms.uTime.value = t + b.phase;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt * p.decay;
      if (p.life <= 0) {
        scene.remove(p.m);
        if (p.ring) p.m.material.dispose();
        particles.splice(i, 1);
        continue;
      }
      if (p.ring) {
        const k = 1 + (1 - p.life) * 1.6;
        p.m.scale.setScalar(p.s * k);
        p.m.material.opacity = p.life * 0.85;
        p.m.lookAt(camera.position);
      } else {
        p.v.multiplyScalar(0.94);
        p.v.y -= 6 * dt;
        p.m.position.addScaledVector(p.v, dt);
        p.m.scale.setScalar(p.s * Math.max(0.01, p.life));
      }
    }

    if (intro) {
      intro.t += dt;
      const r = introRadius();
      const inflate = reducedMotion ? 1 : ease.outElastic(Math.min(1, intro.t / 1.8));
      let s = r * Math.max(0.001, inflate);
      intro.hover += ((pointer.active ? 1 : 0) - intro.hover) * 0.05;
      intro.mat.uniforms.uTime.value = t;
      intro.mat.uniforms.uWobble.value = 0.05 + intro.hover * 0.03 + (intro.popping ? 0.12 : 0);
      const breathe = 1 + Math.sin(t * 2.2) * 0.015;
      if (intro.popping) {
        intro.popT += dt;
        const k = Math.min(1, intro.popT / 0.16);
        s *= 1 + ease.inBack(k) * 0.12 + k * 0.08;
        if (k >= 1) finishIntroPop();
      }
      if (intro) {
        intro.mesh.scale.set(s * breathe, s / breathe, s);
        intro.mesh.position.set(0, halfAt(0).h * 0.06, 0);
        intro.mesh.rotation.y = t * 0.3;
      }
    }

    if (shake > 0) {
      shake = Math.max(0, shake - dt);
      camera.position.x = (Math.random() - 0.5) * shake * 0.6;
      camera.position.y = (Math.random() - 0.5) * shake * 0.6;
    } else {
      camera.position.x += ((pointer.active && !reducedMotion ? (pointer.x / W - 0.5) * 0.6 : 0) - camera.position.x) * 0.03;
      camera.position.y += ((pointer.active && !reducedMotion ? -(pointer.y / H - 0.5) * 0.4 : 0) - camera.position.y) * 0.03;
    }
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  const onVis = () => { running = !document.hidden; if (running) timer.reset(); };
  document.addEventListener('visibilitychange', onVis);

  return {
    popAt,
    bubbleAt,
    startIntro,
    popIntro,
    setPalette,
    get introActive() { return !!intro; },
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
    },
  };
}
