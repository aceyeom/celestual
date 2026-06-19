// creature.js — DOLBOMI's guardians (수호신): sculpted stone-marble mythic beasts.
// Two fixed identities, each on its own real low-poly mesh:
//   • HAECHI (해치)        → the RAM model · RED accent
//   • CHEONGNYONG (청룡)   → the FOX model · BLUE accent
//
// Progression is ONE signal: the marble body gradually turns GOLD from the
// ground up as the soldier's six stats grow. No bloom, no emissive glow, no
// particles, no orbiting trophies — matte materials under plain studio light,
// so every percent of gilding is actually visible.
//
// API (back-compatible):
//   const c = DolbomiCreature.create({ container, path, animal, companion, stats, ... });
//   c.setStats(...); c.setMilestones(n); c.setPath(p); c.setAnimal(a);
//   c.setCompanion(a|null); c.setTheme(th, accent); c.pulse(); c.resize(); c.dispose();
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ── animals: real low-poly meshes.
//   ram  — CC-BY "dook / Poly by Google"      fox — CC-BY "Jake Blakeley" (poly.pizza)
const RAM_URL = 'https://static.poly.pizza/37f8e517-8a9d-48b7-b7cb-18d2a06999aa.glb';
const FOX_URL = 'https://static.poly.pizza/395889ba-18cd-4e70-a804-19daa81d9b78.glb';
const ANIMALS = { ram: { url: RAM_URL }, fox: { url: FOX_URL } };

// ── fixed identity ↔ animal binding: exactly two guardians ──
const ANIMAL_FOR_PATH = { haechi: 'ram', dragon: 'fox' };
const CANON_PATH_FOR  = { ram: 'haechi', fox: 'dragon' };

const THEMES = {
  dark: {
    bg: 0x12100e, marble: 0xe5d8c0, marbleDeep: 0xb6a382,
    ambient: 0x4a4234, ambI: 0.85,
    key: 0xfff4e2, keyI: 1.7, rim: 0xffd9a0, rimI: 1.1, fill: 0x8fa6c8, fillI: 0.55,
    envI: 0.55, exposure: 1.0,
  },
  light: {
    bg: 0xefe7d8, marble: 0xf1e8d6, marbleDeep: 0xccbea4,
    ambient: 0xffffff, ambI: 1.2,
    key: 0xffffff, keyI: 1.8, rim: 0xfff0d6, rimI: 0.7, fill: 0xffffff, fillI: 0.9,
    envI: 0.7, exposure: 0.98,
  },
};
// each path: bound animal + accent (UI tint only — the body stays marble→gold)
const PATHS = {
  haechi: { animal: 'ram', accent: 0xd83a32 }, // RED
  dragon: { animal: 'fox', accent: 0x2f73d6 }, // BLUE
};

// ── living habitat per path. tinted sacred grove (matte, no additive glow). ──
const FOREST = {
  haechi: { skyTop:'#0a1410', skyMid:'#13231a', haze:'#2d4a35', ground:'#0a120d', fog:0x1d3224, tree:0x0c1a12, treeFar:0x17291d },
  dragon: { skyTop:'#08111c', skyMid:'#102134', haze:'#234263', ground:'#070f18', fog:0x163150, tree:0x0a1726, treeFar:0x162a40 },
};

function makeSkyTexture(cfg) {
  const w = 16, h = 256, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0.00, cfg.skyTop); g.addColorStop(0.42, cfg.skyMid); g.addColorStop(0.70, cfg.haze);
  g.addColorStop(0.85, cfg.skyMid); g.addColorStop(1.00, cfg.ground);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const lerp = (a, b, t) => a + (b - a) * t;

function create({ container, path = 'haechi', animal = null, companion = null, stats = {}, theme = 'dark', interactive = false, onCompanionTap = null }) {
  let TH = THEMES[theme] || THEMES.dark;
  let curPath = PATHS[path] ? path : 'haechi';
  let curStats = { ...stats };
  let onCompTap = onCompanionTap;
  // companion (the OTHER guardian) shown behind in profile / fullscreen
  let compOn = !!companion;

  const GOLD_HEX = 0xc99a2e;
  // shared gilding field — one uniform so both rigs read the same progress.
  const goldUniforms = {
    uGold: { value: 0 },
    uGoldColor: { value: new THREE.Color(GOLD_HEX) },
  };

  // ── renderer (direct render — no post-processing, no bloom) ──
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = TH.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  Object.assign(renderer.domElement.style, { display: 'block', width: '100%', height: '100%' });

  // ── optional orbit/zoom controls + tap-to-swap (fullscreen viewer) ──
  let controls = null, ctrlCleanup = null;
  if (interactive) {
    controls = { yaw: -0.45, pitch: 0.04, zoom: 1, dragging: false };
    const el = renderer.domElement;
    el.style.touchAction = 'none'; el.style.cursor = 'grab';
    const ptrs = new Map();
    let lastX = 0, lastY = 0, pinchD0 = 0, zoom0 = 1, moved = 0;
    const down = (e) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      controls.dragging = true; el.style.cursor = 'grabbing'; lastX = e.clientX; lastY = e.clientY;
      moved = 0;
      if (ptrs.size === 2) { const p = [...ptrs.values()]; pinchD0 = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); zoom0 = controls.zoom; }
      if (el.setPointerCapture) try { el.setPointerCapture(e.pointerId); } catch { /* unsupported */ }
    };
    const move = (e) => {
      if (!ptrs.has(e.pointerId)) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size >= 2) { const p = [...ptrs.values()]; const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); if (pinchD0) controls.zoom = Math.max(0.55, Math.min(2.2, zoom0 * d / pinchD0)); return; }
      const dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      controls.yaw += dx * 0.01; controls.pitch = Math.max(-0.5, Math.min(0.5, controls.pitch + dy * 0.006));
    };
    const up = (e) => {
      // a tap (little movement) on the background companion swaps it to the front
      if (moved < 6 && compOn && onCompTap && comp.bodyMesh) tryCompanionTap(e);
      ptrs.delete(e.pointerId); if (ptrs.size < 2) pinchD0 = 0; if (ptrs.size === 0) { controls.dragging = false; el.style.cursor = 'grab'; }
    };
    const wheel = (e) => { e.preventDefault(); controls.zoom = Math.max(0.55, Math.min(2.2, controls.zoom * (1 - e.deltaY * 0.0012))); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    ctrlCleanup = () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); el.removeEventListener('wheel', wheel); };
  }
  const _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();
  function tryCompanionTap(e) {
    const r = renderer.domElement.getBoundingClientRect();
    _ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    const hit = _ray.intersectObject(comp.bodyMesh, false);
    if (hit && hit.length) onCompTap(comp.path);
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(TH.bg);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;

  const CAM0 = new THREE.Vector3(0, 1.7, 7.4);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.copy(CAM0); camera.lookAt(0, 1.35, 0);

  const ambient = new THREE.AmbientLight(TH.ambient, TH.ambI);
  const keyLight = new THREE.DirectionalLight(TH.key, TH.keyI); keyLight.position.set(3.6, 6.4, 5.0);
  const fillLight = new THREE.DirectionalLight(TH.fill, TH.fillI); fillLight.position.set(-4.2, 1.6, 3.4);
  const rimLight = new THREE.DirectionalLight(TH.rim, TH.rimI); rimLight.position.set(-3.0, 4.6, -5.5);
  scene.add(ambient, keyLight, fillLight, rimLight);

  // ── rig: one self-contained avatar (model + pedestal). We build TWO. ──
  function makeRig(role) {
    const group = new THREE.Group();
    const modelGroup = new THREE.Group();   // body mesh
    const baseGroup = new THREE.Group();    // marble pedestal
    group.add(modelGroup, baseGroup);
    return {
      role, group, modelGroup, baseGroup,
      path: 'haechi', animal: 'ram',
      bodyMesh: null, modelReady: false, bbox: null,
    };
  }
  const hero = makeRig('hero');
  const comp = makeRig('companion');
  hero.path = curPath; hero.animal = animal && ANIMALS[animal] ? animal : (ANIMAL_FOR_PATH[curPath] || 'ram');
  setCompIdentity();

  const compWrap = new THREE.Group();       // positions the companion behind & smaller
  compWrap.add(comp.group);
  compWrap.position.set(-1.95, 0, -1.95); compWrap.rotation.y = 0.62; compWrap.scale.setScalar(0.66);
  compWrap.visible = compOn;

  const root = new THREE.Group();
  root.add(hero.group, compWrap);
  scene.add(root);
  const bgGroup = new THREE.Group(); scene.add(bgGroup);
  let skyTex = null;

  function setCompIdentity() {
    comp.animal = hero.animal === 'ram' ? 'fox' : 'ram';
    comp.path = CANON_PATH_FOR[comp.animal];
  }

  function clearGroup(g) {
    g.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
    while (g.children.length) g.remove(g.children[0]);
  }

  // ── forest habitat (uses the hero path tint) ──
  function buildEnvironment() {
    clearGroup(bgGroup);
    const cfg = FOREST[hero.path] || FOREST.haechi;
    if (skyTex) { skyTex.dispose(); skyTex = null; }
    skyTex = makeSkyTexture(cfg);
    scene.background = skyTex;
    scene.fog = new THREE.Fog(cfg.fog, 12, 30);
    const groundY = (hero.bbox ? hero.bbox.min.y : 0) - 0.02;
    const rnd = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

    const ground = new THREE.Mesh(new THREE.CircleGeometry(42, 56),
      new THREE.MeshStandardMaterial({ color: new THREE.Color(cfg.ground), roughness: 1, metalness: 0 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = groundY; bgGroup.add(ground);

    const treeMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(cfg.tree), roughness: 0.96, metalness: 0 });
    const treeFarMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(cfg.treeFar), roughness: 1, metalness: 0 });
    function tree(x, z, scale, mat, seed) {
      const g = new THREE.Group();
      const trunkH = 0.5 * scale;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.085 * scale, trunkH, 5), mat);
      trunk.position.y = trunkH / 2; g.add(trunk);
      let y = trunkH * 0.9;
      for (let i = 0; i < 3; i++) {
        const r = (0.72 - 0.17 * i) * scale, ch = (1.05 - 0.14 * i) * scale;
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, ch, 7), mat);
        cone.position.y = y + ch * 0.34; g.add(cone); y += ch * 0.46;
      }
      g.position.set(x, groundY, z); g.rotation.y = rnd(seed) * 6.28; return g;
    }
    for (let i = 0; i < 20; i++) { const a = -1.22 + (i / 19) * 2.44; const R = 11 + rnd(i + 1) * 3.6; bgGroup.add(tree(Math.sin(a) * R, -Math.cos(a) * R - 2.6, 2.4 + rnd(i + 7) * 1.5, treeFarMat, i + 0.5)); }
    for (let i = 0; i < 11; i++) { const a = -1.05 + (i / 10) * 2.1; const R = 6.7 + rnd(i + 30) * 1.9; const z = -Math.cos(a) * R - 1.5; if (z > -2.4) continue; bgGroup.add(tree(Math.sin(a) * R, z, 1.7 + rnd(i + 13) * 0.8, treeMat, i + 9.5)); }
  }

  // ── materials ──
  const marbleMat = () => new THREE.MeshPhysicalMaterial({ color: TH.marble, roughness: 0.55, metalness: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.55, sheen: 0.45, sheenColor: new THREE.Color(TH.rim), envMapIntensity: TH.envI });

  // marble that gilds from the feet up: `aGold` (1 at the feet → 0 at the crown)
  // crosses the uGold threshold as overall progress grows. No emissive — the
  // gold reads through color + metalness only.
  function marbleGildMat() {
    const m = marbleMat();
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, goldUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          attribute float aGold; varying float vGold;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vGold = aGold;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uGold; uniform vec3 uGoldColor; varying float vGold;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float thr = 1.0 - uGold;
          float gold = uGold <= 0.001 ? 0.0 : smoothstep(thr - 0.07, thr + 0.07, vGold);
          diffuseColor.rgb = mix(diffuseColor.rgb, uGoldColor, gold);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.34, gold);`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          metalnessFactor = mix(metalnessFactor, 1.0, gold);`);
    };
    m.customProgramCacheKey = () => 'marbleGild';
    return m;
  }

  // ── mesh merge: combine ALL sub-meshes (the fox GLB ships 3). ──
  function mergeAllGeo(scene3) {
    scene3.updateMatrixWorld(true);
    const arrays = []; let total = 0;
    scene3.traverse((o) => {
      if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
      let g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      const src = g.index ? g.toNonIndexed() : g;
      const pa = src.attributes.position.array;
      arrays.push(pa); total += src.attributes.position.count;
      if (src !== g) src.dispose();
      g.dispose();
    });
    if (!arrays.length) return null;
    const out = new Float32Array(total * 3); let off = 0;
    arrays.forEach((a) => { out.set(a, off); off += a.length; });
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(out, 3));
    return merged;
  }

  // orient any animal mesh: merge+weld, smooth-shade, normalize size, feet on ground,
  // head→+Z. returns { geo, bb } in local space.
  function orientGeo(scene3) {
    let geo = mergeAllGeo(scene3);
    if (!geo) return null;
    geo = mergeVertices(geo, 1e-4);
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    let bb = geo.boundingBox.clone(); const size = bb.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const k = 3.0 / maxDim; geo.scale(k, k, k);
    geo.computeBoundingBox(); bb = geo.boundingBox.clone();
    const ctr = bb.getCenter(new THREE.Vector3());
    geo.translate(-ctr.x, -bb.min.y, -ctr.z);
    geo.computeBoundingBox(); bb = geo.boundingBox.clone();
    const sz = bb.getSize(new THREE.Vector3());
    const pos = geo.attributes.position; const yTop = bb.min.y + sz.y * 0.86;
    let zSum = 0, n = 0;
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); if (y > yTop) { zSum += pos.getZ(i); n++; } }
    if ((n ? zSum / n : 0) < 0) { geo.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI)); geo.computeBoundingBox(); bb = geo.boundingBox.clone(); }
    return { geo, bb };
  }

  // process a model into a rig: height-based gold field + gilding mesh.
  function processModel(scene3, rig) {
    const o = orientGeo(scene3);
    if (!o) return null;
    const geo = o.geo; const bb = o.bb;
    rig.bbox = bb;
    const sz = bb.getSize(new THREE.Vector3());

    const pos = geo.attributes.position, N = pos.count;
    const aGold = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const ny = (pos.getY(i) - bb.min.y) / sz.y;
      aGold[i] = 1.0 - ny; // gilding rises from the feet
    }
    geo.setAttribute('aGold', new THREE.BufferAttribute(aGold, 1));

    const mat = marbleGildMat();
    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  // ── marble pedestal (단) under each guardian ──
  function buildBase(rig) {
    clearGroup(rig.baseGroup);
    if (!rig.modelReady) return;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.36, 0.12, 56), marbleMat());
    base.material.color = new THREE.Color(TH.marbleDeep); base.material.envMapIntensity = TH.envI * 0.5;
    base.position.y = rig.bbox.min.y - 0.01; rig.baseGroup.add(base);
  }

  // ── apply stats: the ONLY progression output is the gilding level ──
  function applyStats() {
    const overall = clamp01(Object.values(curStats).reduce((a, b) => a + (b || 0), 0) / 600);
    goldUniforms.uGold.value = overall;
  }

  // ── load models into rigs ──
  const loader = new GLTFLoader();
  function loadRig(rig, onDone) {
    rig.modelReady = false; clearGroup(rig.modelGroup);
    loader.load(ANIMALS[rig.animal].url, (gltf) => {
      const m = processModel(gltf.scene, rig);
      if (!m) { if (rig === hero) buildFallback(); return; }
      rig.bodyMesh = m; rig.modelGroup.add(m); rig.modelReady = true;
      buildBase(rig); applyStats(); if (onDone) onDone(); renderOnce();
    }, undefined, () => { if (rig === hero) buildFallback(); });
  }
  function loadMain() {
    loadRig(hero, () => { buildEnvironment(); });
  }
  function loadCompanion() {
    if (!compOn) { clearGroup(comp.modelGroup); comp.modelReady = false; return; }
    setCompIdentity();
    loadRig(comp);
  }
  loadMain(); loadCompanion();

  function buildFallback() {
    hero.modelReady = true;
    hero.bbox = new THREE.Box3(new THREE.Vector3(-1, 0, -1.2), new THREE.Vector3(1, 1.8, 1.2));
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 28, 22), marbleMat()); body.scale.set(1, 0.9, 1.4); body.position.set(0, 1.1, -0.1); hero.modelGroup.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 18), marbleMat()); head.position.set(0, 1.7, 1.0); hero.modelGroup.add(head);
    buildBase(hero); applyStats(); buildEnvironment(); renderOnce();
  }

  function renderOnce() { try { renderer.render(scene, camera); } catch { /* context lost */ } }

  // ── pulse: a brief camera push-in (no flash, no bloom) ──
  let pulseT = -1;
  function pulse() { pulseT = 0; if (!running) { running = true; t0 = performance.now(); frame(); } }

  // ── loop ──
  let raf = null, running = true, t0 = performance.now(), yawOffset = 0;
  function frame() {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const el = (performance.now() - t0) / 1000;

    if (controls) { root.rotation.y = controls.yaw + (controls.dragging ? 0 : Math.sin(el * 0.18) * 0.05); root.rotation.x = controls.pitch; }
    else { root.rotation.y = yawOffset - 0.5 + Math.sin(el * 0.22) * 0.34; }

    const breathe = Math.sin(el * 1.0) * 0.012;
    [hero, comp].forEach((rig) => {
      if (!rig.modelReady) return;
      rig.modelGroup.position.y = breathe;
    });

    if (pulseT >= 0) {
      pulseT += 1 / 60; const D = 1.7;
      if (pulseT < D) {
        const f = pulseT / D, e = Math.sin(Math.min(1, f) * Math.PI);
        camera.position.z = lerp(CAM0.z, 5.9, e); camera.position.y = lerp(CAM0.y, 1.35, e); camera.lookAt(0, 1.1, 0);
      } else { pulseT = -1; camera.position.copy(CAM0); camera.lookAt(0, 1.35, 0); }
    }

    if (controls && pulseT < 0) { camera.position.set(0, CAM0.y, CAM0.z / controls.zoom); camera.lookAt(0, 1.35, 0); }
    renderer.render(scene, camera);
  }

  function resize() { const w = container.clientWidth || 1, h = container.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(container);
  function onVis() { if (document.hidden) { running = false; if (raf) cancelAnimationFrame(raf); } else if (!running) { running = true; t0 = performance.now(); frame(); } }
  document.addEventListener('visibilitychange', onVis);

  function setStats(s) { curStats = { ...curStats, ...s }; applyStats(); }
  function setMilestones() { /* milestones no longer change the render — gold is the one signal */ }
  function setPath(p) {
    if (!PATHS[p] || p === hero.path) return;
    hero.path = p; const a = ANIMAL_FOR_PATH[p] || 'ram';
    const animalChanged = a !== hero.animal; hero.animal = a;
    setCompIdentity(); buildEnvironment();
    if (animalChanged) { loadMain(); loadCompanion(); }
    else { applyStats(); if (compOn) loadCompanion(); }
  }
  function setAnimal(a) { if (ANIMALS[a]) setPath(CANON_PATH_FOR[a] || 'haechi'); }
  function setCompanion(a) {
    const on = !!a; if (on === compOn) return;
    compOn = on; compWrap.visible = on; loadCompanion(); renderOnce();
  }
  function setTheme(th) {
    TH = THEMES[th] || THEMES.dark;
    buildEnvironment();
    ambient.color = new THREE.Color(TH.ambient); ambient.intensity = TH.ambI;
    keyLight.color = new THREE.Color(TH.key); keyLight.intensity = TH.keyI;
    fillLight.color = new THREE.Color(TH.fill); fillLight.intensity = TH.fillI;
    rimLight.color = new THREE.Color(TH.rim); rimLight.intensity = TH.rimI;
    renderer.toneMappingExposure = TH.exposure;
    [hero, comp].forEach((rig) => {
      if (rig.bodyMesh) { const mm = Array.isArray(rig.bodyMesh.material) ? rig.bodyMesh.material[0] : rig.bodyMesh.material; mm.color = new THREE.Color(TH.marble); mm.sheenColor = new THREE.Color(TH.rim); mm.envMapIntensity = TH.envI; }
      buildBase(rig);
    });
    applyStats();
  }
  function dispose() { running = false; if (raf) cancelAnimationFrame(raf); if (ctrlCleanup) ctrlCleanup(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); [hero, comp].forEach((rig) => [rig.modelGroup, rig.baseGroup].forEach(clearGroup)); clearGroup(bgGroup); if (skyTex) skyTex.dispose(); envTex.dispose(); pmrem.dispose(); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); }

  buildEnvironment();
  resize(); frame();
  return { setStats, setMilestones, setPath, setAnimal, setCompanion, setTheme, pulse, resize, dispose, setYaw: (r) => { yawOffset = r; } };
}

export { create };
export const CREATURE_PATHS = [
  { key: 'haechi', ko: '해치', en: 'HAECHI', desc: '정의의 수호 · 균형' },
  { key: 'dragon', ko: '청룡', en: 'DRAGON', desc: '비상의 기개 · 도전' },
];
