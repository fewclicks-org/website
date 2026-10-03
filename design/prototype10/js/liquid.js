// Launch: WebGL "liquid" hero. Cross-dissolves key art with animated noise, RGB split and a cursor ripple.

import * as THREE from '../../vendor/three.module.min.js';
import { reducedMotion, lowPower } from '../../shared/js/motion.js';

const vert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uA, uB;
  uniform vec2 uRes, uImgA, uImgB, uMouse;
  uniform float uT, uP, uHover, uSplit;
  // cover-fit uv
  vec2 cover(vec2 uv, vec2 img){ float r = uRes.x/uRes.y, ir = img.x/img.y; vec2 s = r > ir ? vec2(1.0, ir/r) : vec2(r/ir, 1.0); return (uv - 0.5) * s + 0.5; }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.02; a *= 0.5; } return v; }
  void main(){
    vec2 uv = vUv;
    vec2 m = uMouse;
    float d = distance(uv * vec2(uRes.x/uRes.y, 1.0), m * vec2(uRes.x/uRes.y, 1.0));
    float ripple = sin(d * 38.0 - uT * 5.0) * exp(-d * 6.0) * 0.012 * uHover;
    vec2 flow = vec2(fbm(uv * 3.0 + uT * 0.05), fbm(uv * 3.0 - uT * 0.05)) - 0.5;
    uv += flow * 0.012 + ripple;
    float n = fbm(uv * 4.0 + uT * 0.1);
    float edge = smoothstep(uP - 0.15, uP + 0.15, n * 0.8 + uv.y * 0.2 + 0.0);
    float mixv = 1.0 - edge;
    vec2 disp = vec2(0.0, (1.0 - abs(uP*2.0-1.0)) * 0.12) * (n - 0.5);
    float s = uSplit * 0.004 + (1.0 - abs(uP*2.0-1.0)) * 0.02 + uHover * smoothstep(0.35, 0.0, d) * 0.01;
    vec2 ua = cover(uv + disp, uImgA), ub = cover(uv - disp, uImgB);
    vec3 a = vec3(texture2D(uA, ua + vec2(s,0)).r, texture2D(uA, ua).g, texture2D(uA, ua - vec2(s,0)).b);
    vec3 b = vec3(texture2D(uB, ub + vec2(s,0)).r, texture2D(uB, ub).g, texture2D(uB, ub - vec2(s,0)).b);
    vec3 col = mix(a, b, mixv);
    float glow = smoothstep(0.02, 0.0, abs(n*0.8 + uv.y*0.2 - uP)) * step(0.01, uP) * step(uP, 0.99);
    col += glow * vec3(1.0, 0.25, 0.55);
    col *= (0.42 + 0.33 * smoothstep(1.2, 0.2, length(vUv - vec2(0.6, 0.45)))) * (0.55 + 0.45 * vUv.x);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createLiquid(canvas, urls) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.5));
  const scene = new THREE.Scene();
  const cam = new THREE.Camera();
  const loader = new THREE.TextureLoader();
  const texes = urls.map((u) => {
    const t = loader.load(u, (tx) => { tx.userData.size = new THREE.Vector2(tx.image.width || 16, tx.image.height || 9); });
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.userData.size = new THREE.Vector2(16, 9);
    return t;
  });
  const uniforms = {
    uA: { value: texes[0] }, uB: { value: texes[1 % texes.length] },
    uRes: { value: new THREE.Vector2(1, 1) }, uImgA: { value: new THREE.Vector2(16, 9) }, uImgB: { value: new THREE.Vector2(16, 9) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) }, uT: { value: 0 }, uP: { value: 0 }, uHover: { value: 0 }, uSplit: { value: 0 },
  };
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms })));
  const resize = () => { const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setSize(w, h, false); uniforms.uRes.value.set(w, h); };
  addEventListener('resize', resize);
  resize();

  let mx = 0.5, my = 0.5, hover = 0, cur = 0, trans = null, visible = true, split = 0;
  canvas.parentElement.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mx = (e.clientX - r.left) / r.width; my = 1 - (e.clientY - r.top) / r.height; hover = 1;
  });
  canvas.parentElement.addEventListener('pointerleave', () => (hover = 0));
  const timer = new THREE.Timer();
  let raf;
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    timer.update(now);
    uniforms.uT.value = reducedMotion ? 0 : timer.getElapsed();
    const m = uniforms.uMouse.value;
    m.x += (mx - m.x) * 0.08; m.y += (my - m.y) * 0.08;
    uniforms.uHover.value += ((reducedMotion ? 0 : hover) - uniforms.uHover.value) * 0.05;
    split *= 0.9;
    uniforms.uSplit.value = split;
    uniforms.uImgA.value.copy(uniforms.uA.value.userData.size);
    uniforms.uImgB.value.copy(uniforms.uB.value.userData.size);
    if (trans) {
      trans.p = Math.min(1, trans.p + (reducedMotion ? 1 : 0.012));
      uniforms.uP.value = trans.p * 1.3 - 0.15;
      if (trans.p >= 1) { uniforms.uA.value = uniforms.uB.value; uniforms.uP.value = 0; trans.done?.(); trans = null; }
    }
    renderer.render(scene, cam);
  };
  raf = requestAnimationFrame(frame);
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  return {
    go(i, done) {
      if (i === cur || trans) return false;
      uniforms.uB.value = texes[i];
      cur = i;
      split = 6;
      trans = { p: 0, done };
      return true;
    },
    pulse() { split = 10; },
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
