// Nova: scroll-driven 3D flythrough. A glowing crystal at the entrance, then a corridor of game posters.

import * as THREE from '../../vendor/three.module.min.js';
import { reducedMotion, lowPower } from '../../shared/js/motion.js';

const SPACING = 7;

export function createCorridor(canvas, games, { onHover, onPick, onProgressLabel } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lowPower ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x05070f, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05070f, 0.045);
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 0.2, 9);

  scene.add(new THREE.AmbientLight(0x8899ff, 0.5));
  const key = new THREE.PointLight(0x49e3ff, 40, 30);
  key.position.set(3, 3, 6);
  scene.add(key);
  const rim = new THREE.PointLight(0xff6bd5, 30, 30);
  rim.position.set(-4, -2, 2);
  scene.add(rim);

  // --- crystal ---
  const crystal = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1.8, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1b2450, emissive: 0x2a3cff, emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.15, flatShading: true });
  const core = new THREE.Mesh(geo, mat);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x49e3ff, transparent: true, opacity: 0.9 }));
  edges.scale.setScalar(1.002);
  const shell = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(2.6, 1)), new THREE.LineBasicMaterial({ color: 0x8b7bff, transparent: true, opacity: 0.25 }));
  crystal.add(core, edges, shell);
  // glow sprite
  const gc = document.createElement('canvas');
  gc.width = gc.height = 128;
  const gx = gc.getContext('2d');
  const grd = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(120,200,255,0.9)');
  grd.addColorStop(0.35, 'rgba(139,123,255,0.35)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  gx.fillStyle = grd;
  gx.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(gc);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.setScalar(11);
  crystal.add(glow);
  crystal.position.set(2.2, 0.2, 0);
  scene.add(crystal);

  // --- corridor: floor grid + stars ---
  const length = games.length * SPACING + 30;
  const grid = new THREE.GridHelper(length, Math.round(length / 1.5), 0x8b7bff, 0x1c2350);
  grid.position.set(0, -2.6, -length / 2 + 10);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);
  const ceil = grid.clone();
  ceil.position.y = 4.2;
  ceil.material = grid.material.clone();
  ceil.material.opacity = 0.12;
  scene.add(ceil);
  const N = lowPower ? 900 : 2200;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 40;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 2] = 12 - Math.random() * (length + 20);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfd4ff, size: 0.05, transparent: true, opacity: 0.8, depthWrite: false }));
  scene.add(stars);

  // --- posters ---
  const loader = new THREE.TextureLoader();
  const posters = games.map((g, i) => {
    const side = i % 2 ? 1 : -1;
    const group = new THREE.Group();
    const tex = loader.load(g.media.cover);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.475), new THREE.MeshBasicMaterial({ map: tex, fog: true }));
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(4.62, 2.7), new THREE.MeshBasicMaterial({ color: new THREE.Color(g.theme.primary), transparent: true, opacity: 0.85 }));
    frame.position.z = -0.01;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: new THREE.Color(g.theme.primary), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 }));
    halo.scale.set(9, 6, 1);
    halo.position.z = -0.3;
    group.add(halo, frame, plane);
    group.position.set(side * 3.1, 0.3, -10 - i * SPACING);
    group.rotation.y = -side * 0.55;
    group.userData = { game: g, plane, base: group.position.clone(), hover: 0 };
    plane.userData.group = group;
    scene.add(group);
    return group;
  });

  // --- interaction ---
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2(-5, -5);
  const mouse = { x: 0, y: 0 };
  let hovered = null;
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    mouse.x = ndc.x; mouse.y = ndc.y;
  });
  canvas.addEventListener('pointerleave', () => ndc.set(-5, -5));
  canvas.addEventListener('click', () => { if (hovered) onPick?.(hovered.userData.game); });

  let W = 1, H = 1;
  const resize = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = camera.aspect < 0.8 ? 72 : 55;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  let progress = 0, smooth = 0, assemble = 0, visible = true;
  const timer = new THREE.Timer();
  const v = new THREE.Vector3();
  let raf;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    timer.update(now);
    const t = timer.getElapsed();
    smooth += (progress - smooth) * (reducedMotion ? 1 : 0.08);
    const endZ = -10 - (games.length - 1) * SPACING - 2;
    const z = 9 + (endZ - 9) * smooth;
    camera.position.z = z;
    camera.position.x += ((reducedMotion ? 0 : mouse.x * 0.6) - camera.position.x) * 0.05;
    camera.position.y += ((reducedMotion ? 0.2 : 0.2 + mouse.y * 0.35) - camera.position.y) * 0.05;
    camera.lookAt(camera.position.x * 0.3, 0.1, z - 10);

    const a = Math.min(1, assemble);
    const away = Math.max(0, 1 - smooth * 9);
    const narrow = camera.aspect < 0.8;
    crystal.position.set(narrow ? 0 : 2.6, narrow ? 2.2 : 0.2, narrow ? -2 : 1);
    crystal.scale.setScalar((0.001 + a) * away * (narrow ? 0.7 : 1) + 0.0001);
    crystal.visible = away > 0.01;
    crystal.rotation.y = t * 0.25 + mouse.x * 0.4;
    crystal.rotation.x = t * 0.12 + mouse.y * 0.3;
    shell.rotation.y = -t * 0.15;
    edges.material.opacity = 0.4 + 0.5 * a;

    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(posters.map((p) => p.userData.plane))[0];
    const now3 = hit ? hit.object.userData.group : null;
    if (now3 !== hovered) { hovered = now3; canvas.classList.toggle('hot', !!hovered); onHover?.(hovered?.userData.game || null); }
    let nearest = null, nd = Infinity;
    posters.forEach((p) => {
      const d = p.userData;
      d.hover += ((p === hovered ? 1 : 0) - d.hover) * 0.12;
      p.scale.setScalar(1 + d.hover * 0.08);
      p.position.y = d.base.y + Math.sin(t * 0.8 + d.base.z) * 0.12;
      const dz = Math.abs(p.position.z - (z - 6));
      if (dz < nd) { nd = dz; nearest = p; }
    });
    if (smooth > 0.04 && nearest) {
      v.copy(nearest.position).add(new THREE.Vector3(0, 1.6, 0)).project(camera);
      onProgressLabel?.(nearest.userData.game, { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, inView: v.z < 1 && Math.abs(v.x) < 1.1 });
    } else onProgressLabel?.(null);
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  return {
    setProgress: (p) => (progress = Math.max(0, Math.min(1, p))),
    setAssemble: (p) => (assemble = p),
    destroy() { cancelAnimationFrame(raf); renderer.dispose(); },
  };
}
