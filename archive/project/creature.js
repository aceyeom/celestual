// creature.js — DOLBOMI's guardians (수호신): SCULPTED stone-marble mythic beasts.
// Two fixed identities, each on its own real low-poly mesh, gilded procedurally and
// dressed with Korean-traditional + "Golden Spartan" gold regalia rigged to the
// model's own anatomy:
//   • HAECHI (해치)  → the RAM model  · RED accent
//   • CHEONGNYONG / BLUE DRAGON (청룡) → the FOX model · BLUE accent
// Each guardian gets: per-vertex gilding (head/chest/hoof), metallic rings wrapped
// around the horns, a halo floating directly above the head, a verlet cloth cape,
// clean accent ankle rings, a torque, spine filigree — all anchored to the bbox.
//
// The whole avatar is built as a self-contained "rig", so the PROFILE view can show
// TWO fully-customized guardians at once (active in front, the other behind) — the
// background one renders its complete design, not a default mesh.
//
// API (back-compatible):
//   const c = DolbomiCreature.create({ container, path, animal, companion, stats, ... });
//   c.setStats(...); c.setMilestones(n); c.setPath(p); c.setAnimal(a);
//   c.setCompanion(a|null); c.setTheme(th, accent); c.pulse(); c.resize(); c.dispose();
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ── animals: real low-poly meshes, gilded procedurally by the same system.
//   ram  — CC-BY "dook / Poly by Google"      fox — CC-BY "Jake Blakeley" (poly.pizza)
const RAM_URL = 'https://static.poly.pizza/37f8e517-8a9d-48b7-b7cb-18d2a06999aa.glb';
const FOX_URL = 'https://static.poly.pizza/395889ba-18cd-4e70-a804-19daa81d9b78.glb';
// per-animal gilding tuning (gold-field falloffs differ by silhouette)
const ANIMALS = {
  ram: { url: RAM_URL, faceY: 0.5,  faceZ: 0.55, chestY: 0.42 },
  fox: { url: FOX_URL, faceY: 0.52, faceZ: 0.46, chestY: 0.40 },
};

// ── fixed identity ↔ animal binding (the "Fox/Ram toggle" is gone — the path IS the
//    guardian, and each guardian has exactly one body). ──
const ANIMAL_FOR_PATH = { haechi: 'ram', dragon: 'fox', phoenix: 'ram', tiger: 'fox' };
const CANON_PATH_FOR  = { ram: 'haechi', fox: 'dragon' };

const THEMES = {
  dark: {
    bg: 0x12100e, marble: 0xe5d8c0, marbleDeep: 0xb6a382, hoof: 0x4a4034,
    ambient: 0x4a4234, ambI: 0.65,
    key: 0xfff4e2, keyI: 2.0, rim: 0xffd9a0, rimI: 2.4, fill: 0x8fa6c8, fillI: 0.6,
    envI: 0.7, exposure: 1.02, bloom: { strength: 0.46, radius: 0.62, threshold: 0.82 },
  },
  light: {
    bg: 0xefe7d8, marble: 0xf1e8d6, marbleDeep: 0xccbea4, hoof: 0x8a7d6b,
    ambient: 0xffffff, ambI: 1.15,
    key: 0xffffff, keyI: 2.1, rim: 0xfff0d6, rimI: 1.2, fill: 0xffffff, fillI: 0.95,
    envI: 0.95, exposure: 0.98, bloom: { strength: 0.3, radius: 0.55, threshold: 0.9 },
  },
};
// each path: bound animal, accent (gems / aura / ankle rings / cape sheen), cape cloth color
const PATHS = {
  haechi:  { animal: 'ram', accent: 0xd83a32, tint: 0xff5a4a, cape: 0x9a1d22 }, // RED
  dragon:  { animal: 'fox', accent: 0x2f73d6, tint: 0x5aa6ee, cape: 0x163a78 }, // BLUE
  phoenix: { animal: 'ram', accent: 0xff7a3c, tint: 0xff7a4c, cape: 0x7a1f12 },
  tiger:   { animal: 'fox', accent: 0xe7a33c, tint: 0xffc24a, cape: 0x6b3410 },
};

// ── living habitat per path. tinted sacred grove. ──
const FOREST = {
  haechi:  { skyTop:'#0a1410', skyMid:'#13231a', haze:'#2d4a35', ground:'#0a120d', fog:0x1d3224, tree:0x0c1a12, treeFar:0x17291d, mist:0x37563f, glow:0x40623f },
  dragon:  { skyTop:'#08111c', skyMid:'#102134', haze:'#234263', ground:'#070f18', fog:0x163150, tree:0x0a1726, treeFar:0x162a40, mist:0x2d4f6e, glow:0x315573 },
  phoenix: { skyTop:'#160c0a', skyMid:'#2c1812', haze:'#572c1d', ground:'#130a08', fog:0x3c2117, tree:0x1d100b, treeFar:0x311d14, mist:0x5e3523, glow:0x713c26 },
  tiger:   { skyTop:'#140f07', skyMid:'#271c0c', haze:'#4d3617', ground:'#110c06', fog:0x35260f, tree:0x1a130a, treeFar:0x2d2112, mist:0x553c1d, glow:0x62461e },
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

function makeSprite() {
  const s = 64, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.2)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function create({ container, path = 'haechi', animal = null, companion = null, stats = {}, milestones = 0, theme = 'dark', accent = '#E7A33C', interactive = false, onCompanionTap = null }) {
  let TH = THEMES[theme] || THEMES.dark;
  let accentColor = new THREE.Color(accent);
  let curPath = PATHS[path] ? path : 'haechi';
  let curStats = { ...stats }, curMs = milestones;
  let onCompTap = onCompanionTap;
  // companion (the OTHER guardian) shown behind in profile / fullscreen
  let compOn = !!companion;
  const sprite = makeSprite();

  const GOLD_HEX = 0xf0c14a;
  // shared gilding fields — both rigs share identical stats so the gold matches.
  const goldUniforms = {
    uHead: { value: 0 }, uChest: { value: 0 }, uHoof: { value: 0 }, uIgnite: { value: 0 },
    uGoldColor: { value: new THREE.Color(GOLD_HEX) }, uGoldEmiss: { value: new THREE.Color(0xffcf6e) },
  };
  const accentForPath = (p) => new THREE.Color((PATHS[p] || PATHS.haechi).accent);

  // ── renderer ──
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
    let lastX = 0, lastY = 0, pinchD0 = 0, zoom0 = 1, downX = 0, downY = 0, moved = 0;
    const down = (e) => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      controls.dragging = true; el.style.cursor = 'grabbing'; lastX = e.clientX; lastY = e.clientY;
      downX = e.clientX; downY = e.clientY; moved = 0;
      if (ptrs.size === 2) { const p = [...ptrs.values()]; pinchD0 = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); zoom0 = controls.zoom; }
      if (el.setPointerCapture) try { el.setPointerCapture(e.pointerId); } catch (err) {}
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
  const accentLight = new THREE.PointLight(accent, 0.6, 18, 1.6); accentLight.position.set(0, 1.2, 3.2);
  scene.add(ambient, keyLight, fillLight, rimLight, accentLight);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), TH.bloom.strength, TH.bloom.radius, TH.bloom.threshold);
  composer.addPass(bloom); composer.addPass(new OutputPass());

  // ── rig: one self-contained avatar (model + full regalia). We build TWO. ──
  function makeRig(role) {
    const group = new THREE.Group();        // uniform size scaling
    const modelGroup = new THREE.Group();   // body mesh (girth scaling)
    const goldGroup = new THREE.Group();    // procedural regalia
    const capeGroup = new THREE.Group();    // cloth cape
    const footGroup = new THREE.Group();    // ankle rings
    const haloGroup = new THREE.Group();    // halo above the head
    group.add(modelGroup, goldGroup, capeGroup, footGroup, haloGroup);
    return {
      role, group, modelGroup, goldGroup, capeGroup, footGroup, haloGroup,
      path: 'haechi', animal: 'ram',
      goldEmissive: [], bodyMesh: null, modelReady: false,
      headTop: null, neckBase: null, chestPt: null, rumpPt: null, bbox: null, scaleK: 1,
      footAnchors: [], hornAnchors: [], cloth: null, haloBaseY: 0,
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
  const orbitGroup = new THREE.Group();     // milestone trophies
  const fxGroup = new THREE.Group();        // particles + shockwave
  root.add(hero.group, compWrap, orbitGroup, fxGroup);
  scene.add(root);
  const bgGroup = new THREE.Group(); scene.add(bgGroup);
  let skyTex = null; const envAnim = [];

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
    clearGroup(bgGroup); envAnim.length = 0;
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

    const glow = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5),
      new THREE.MeshBasicMaterial({ map: sprite, color: new THREE.Color(cfg.glow), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = groundY + 0.03; bgGroup.add(glow);

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

    [{ z: -4.5, y: 0.5, w: 22, h: 4.5, o: 0.16 }, { z: -8.5, y: 1.2, w: 30, h: 6, o: 0.2 }].forEach((m, k) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(m.w, m.h),
        new THREE.MeshBasicMaterial({ map: sprite, color: new THREE.Color(cfg.mist), transparent: true, opacity: m.o, depthWrite: false }));
      mesh.position.set(0, groundY + m.y, m.z); bgGroup.add(mesh);
      envAnim.push({ mesh, speed: 0.05 + k * 0.035 });
    });
  }

  // ── materials ──
  const marbleMat = () => new THREE.MeshPhysicalMaterial({ color: TH.marble, roughness: 0.55, metalness: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.55, sheen: 0.45, sheenColor: new THREE.Color(TH.rim), envMapIntensity: TH.envI });

  function marbleGildMat() {
    const m = marbleMat();
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, goldUniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          attribute float aHead; attribute float aChest; attribute float aHoof;
          varying float vHead; varying float vChest; varying float vHoof; varying vec3 vLP;`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vHead = aHead; vChest = aChest; vHoof = aHoof; vLP = position;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uHead; uniform float uChest; uniform float uHoof; uniform float uIgnite;
          uniform vec3 uGoldColor; uniform vec3 uGoldEmiss;
          varying float vHead; varying float vChest; varying float vHoof; varying vec3 vLP;
          float gmask(float field, float prog){ if(field < 0.002) return 0.0; float thr = 1.0 - prog; return smoothstep(thr - 0.09, thr + 0.09, field); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float gH = gmask(vHead, uHead);
          float gC = gmask(vChest, uChest);
          float gF = gmask(vHoof, uHoof);
          float gold = clamp(max(gH, max(gC, gF)), 0.0, 1.0);
          float chestGold = gC * smoothstep(0.04, 0.26, vChest);
          float lines = 0.0;
          { float ring = sin(vLP.y * 52.0); float ray = sin(atan(vLP.x, vLP.z) * 18.0);
            lines = smoothstep(0.62, 1.0, max(abs(ring), abs(ray) * 0.92)) * chestGold; }
          diffuseColor.rgb = mix(diffuseColor.rgb, uGoldColor, gold);
          diffuseColor.rgb *= (1.0 - 0.24 * lines);`)
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          roughnessFactor = mix(roughnessFactor, 0.24 + 0.34 * lines, gold);`)
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
          metalnessFactor = mix(metalnessFactor, 1.0, gold);`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance += uGoldColor * gold * 0.04;
          totalEmissiveRadiance += uGoldEmiss * gold * uIgnite;
          totalEmissiveRadiance += uGoldColor * lines * 0.10;`);
    };
    m.customProgramCacheKey = () => 'marbleGild';
    return m;
  }
  function gold(emi = 0) { return new THREE.MeshStandardMaterial({ color: new THREE.Color(0xf0c14a), metalness: 1.0, roughness: 0.26, envMapIntensity: TH.envI * 1.3, emissive: new THREE.Color(0xffcf6e), emissiveIntensity: emi }); }
  function gem(rig, intensity = 1.1) { const c = accentForPath(rig.path); return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: intensity, metalness: 0.3, roughness: 0.18, envMapIntensity: TH.envI }); }
  // clean metallic accent ring (boots) — RED for haechi/ram, BLUE for dragon/fox
  function accentRingMat(rig, emi = 0.5) { const c = accentForPath(rig.path); return new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: emi, metalness: 0.85, roughness: 0.3, envMapIntensity: TH.envI * 1.1 }); }

  // ── mesh merge: combine ALL sub-meshes (the fox GLB ships 3 — the old code grabbed
  //    only the first, which is why the fox rendered as a corrupted fragment). ──
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
  // head→+Z. returns { geo, bb, k } in local space.
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
    return { geo, bb, k };
  }

  // detect horn / ear clusters (top, off-centre, split L/R) → stacked ring slices
  function computeHorns(geo, bb) {
    const pos = geo.attributes.position, N = pos.count;
    const sz = bb.getSize(new THREE.Vector3());
    const sideAcc = { '-1': [], '1': [] };
    for (let i = 0; i < N; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const ny = (y - bb.min.y) / sz.y;
      if (ny > 0.62 && Math.abs(x) > sz.x * 0.05) { (x > 0 ? sideAcc['1'] : sideAcc['-1']).push([x, y, z]); }
    }
    const horns = [];
    for (const s of ['-1', '1']) {
      const pts = sideAcc[s]; if (pts.length < 8) continue;
      let ymin = Infinity, ymax = -Infinity; pts.forEach((p) => { if (p[1] < ymin) ymin = p[1]; if (p[1] > ymax) ymax = p[1]; });
      const span = (ymax - ymin) || 0.001;
      const rings = [];
      [0.22, 0.52, 0.8].forEach((f) => {
        const yc = ymin + span * f, band = span * 0.2;
        const inb = pts.filter((p) => Math.abs(p[1] - yc) < band); if (inb.length < 3) return;
        let cx = 0, cy = 0, cz = 0; inb.forEach((p) => { cx += p[0]; cy += p[1]; cz += p[2]; });
        cx /= inb.length; cy /= inb.length; cz /= inb.length;
        let r = 0; inb.forEach((p) => { r += Math.hypot(p[0] - cx, p[2] - cz); }); r /= inb.length;
        rings.push({ c: new THREE.Vector3(cx, cy, cz), r: Math.max(0.05, Math.min(0.45, r)) });
      });
      if (rings.length) horns.push(rings);
    }
    return horns;
  }

  // process a model into a rig: gold fields + anchors + horns + gilding mesh.
  function processModel(scene3, rig) {
    const o = orientGeo(scene3);
    if (!o) return null;
    const geo = o.geo; let bb = o.bb; rig.scaleK = o.k;
    const sz = bb.getSize(new THREE.Vector3());
    const A = ANIMALS[rig.animal] || ANIMALS.ram;

    // head anchor = centroid of the top ~16% of verts (real head/crown position,
    // including x/z) so the halo sits over the actual head on EVERY animal — the
    // fox's head is not centred, so the old (0, max.y, max.z) assumption misplaced it.
    {
      const yHead = bb.min.y + sz.y * 0.84; let hx = 0, hz = 0, hn = 0;
      for (let i = 0; i < geo.attributes.position.count; i++) { const y = geo.attributes.position.getY(i); if (y > yHead) { hx += geo.attributes.position.getX(i); hz += geo.attributes.position.getZ(i); hn++; } }
      rig.headTop = hn ? new THREE.Vector3(hx / hn, bb.max.y, hz / hn) : new THREE.Vector3(0, bb.max.y, bb.max.z - sz.z * 0.16);
    }
    rig.neckBase = new THREE.Vector3(0, bb.min.y + sz.y * 0.62, bb.max.z - sz.z * 0.34);
    rig.chestPt  = new THREE.Vector3(0, bb.min.y + sz.y * 0.44, bb.max.z - sz.z * 0.22);
    rig.rumpPt   = new THREE.Vector3(0, bb.min.y + sz.y * 0.6,  bb.min.z + sz.z * 0.24);
    // the fox sits upright — its neck is just under the head, not at 0.62 height
    if (rig.animal === 'fox') {
      rig.neckBase = new THREE.Vector3(0, rig.headTop.y - sz.y * 0.20, rig.headTop.z - sz.z * 0.06);
    }
    rig.bbox = bb;

    const pos = geo.attributes.position, N = pos.count;
    const aHead = new Float32Array(N), aChest = new Float32Array(N), aHoof = new Float32Array(N);
    const ss = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
    const fc = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
    for (let i = 0; i < N; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const ny = (y - bb.min.y) / sz.y, nz = (z - bb.min.z) / sz.z;
      aHead[i] = ss(A.faceZ + 0.05, 0.82, nz) * ss(A.faceY, 0.86, ny);
      const chestBand = ss(0.22, A.chestY, ny) * (1.0 - ss(A.chestY + 0.04, 0.64, ny));
      aChest[i] = ss(0.5, 0.72, nz) * chestBand;
      aHoof[i] = 1.0 - ss(0.04, 0.17, ny);
      if (ny < 0.16) { const q = (x >= 0 ? 0 : 1) + (z >= 0 ? 0 : 2); fc[q][0] += x; fc[q][1] += y; fc[q][2] += z; fc[q][3]++; }
    }
    geo.setAttribute('aHead', new THREE.BufferAttribute(aHead, 1));
    geo.setAttribute('aChest', new THREE.BufferAttribute(aChest, 1));
    geo.setAttribute('aHoof', new THREE.BufferAttribute(aHoof, 1));
    rig.footAnchors = fc.filter((c) => c[3] > 0).map((c) => new THREE.Vector3(c[0] / c[3], bb.min.y + 0.02, c[2] / c[3]));

    // invisible torso proxy — an ellipsoid traced from the body's own vertices
    // (legs + head excluded). the cape collides against this so it rests on the
    // body and never clips through.
    rig.torso = computeTorso(geo, bb, rig.animal);

    const mat = marbleGildMat();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.gildMat = mat;
    return mesh;
  }

  // trace an invisible ellipsoid around the torso. percentile-fitting a point cloud is
  // fragile (the ram's tall neck/horns swamp the barrel), so we anchor the proxy to the
  // bounding box with body-type fractions — a flat horizontal barrel for the quadruped,
  // an upright blob for the sitting fox.
  function computeTorso(geo, bb, animal) {
    const sz = bb.getSize(new THREE.Vector3());
    if (animal === 'fox') {
      return { c: new THREE.Vector3(0, bb.min.y + sz.y * 0.40, bb.min.z + sz.z * 0.50),
               rx: sz.x * 0.44, ry: sz.y * 0.32, rz: sz.z * 0.42 };
    }
    return { c: new THREE.Vector3(0, bb.min.y + sz.y * 0.42, bb.min.z + sz.z * 0.42),
             rx: sz.x * 0.54, ry: sz.y * 0.16, rz: sz.z * 0.40 };
  }

  // ── procedural regalia, anchored to the rig's anatomy ──
  function buildRegalia(rig) {
    clearGroup(rig.goldGroup); clearGroup(rig.haloGroup);
    if (!rig.modelReady) return;
    rig.goldEmissive = [];
    const s = curStats;
    const tMoney = clamp01((s.money ?? 50) / 100), tCraft = clamp01((s.craft ?? 50) / 100);
    const overall = (Object.values(s).reduce((a, b) => a + (b || 0), 0)) / 600;
    const bb = rig.bbox;

    // (halos, horn rings, neck torque and spine filigree all removed per direction —
    //  the only metal ring left is the ram's ankle ring. the body's procedural gilding
    //  carries the stat-driven gold; the regalia here is just the marble pedestal.)

    // marble base 단 (no glowing ring — keeps the "halo" read up at the head only)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.36, 0.12, 56), marbleMat());
    base.material.color = new THREE.Color(TH.marbleDeep); base.material.envMapIntensity = TH.envI * 0.5;
    base.position.y = bb.min.y - 0.01; rig.goldGroup.add(base);
  }

  // ── ankle ring — only the RAM keeps it (the single metal ring left on the avatars) ──
  function buildBoots(rig) {
    clearGroup(rig.footGroup);
    if (!rig.modelReady || rig.animal !== 'ram' || !rig.footAnchors.length) return;
    rig.footAnchors.forEach((f) => {
      const g = new THREE.Group();
      const r0 = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 10, 22), gold(0.22));
      r0.rotation.x = Math.PI / 2; r0.position.y = 0.05; g.add(r0); rig.goldEmissive.push(r0.material);
      const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.03, 10, 22), accentRingMat(rig, 0.55));
      r1.rotation.x = Math.PI / 2; r1.position.y = 0.115; g.add(r1); rig.goldEmissive.push(r1.material);
      const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.086, 0.016, 10, 22), gold(0.2));
      r2.rotation.x = Math.PI / 2; r2.position.y = 0.165; g.add(r2); rig.goldEmissive.push(r2.material);
      g.position.set(f.x, f.y, f.z); rig.footGroup.add(g);
    });
  }

  // ── capes removed per direction — neither guardian wears one ──
  function buildCape(rig) {
    clearGroup(rig.capeGroup); rig.cloth = null;
    return;
    // eslint-disable-next-line no-unreachable
    if (!rig.modelReady || !rig.torso) return;
    const tPeople = clamp01((curStats.people ?? 50) / 100);
    if (tPeople < 0.08) return;
    const cfg = PATHS[rig.path] || PATHS.haechi;
    const aura = accentForPath(rig.path);
    const COLS = 22, ROWS = 20;
    const E = rig.torso;
    // the invisible body proxy, slightly inflated so cloth floats just above the skin
    const collider = { c: E.c.clone(), rx: E.rx * 1.05 + 0.03, ry: E.ry * 1.05 + 0.03, rz: E.rz * 1.05 + 0.03 };
    const erx = collider.rx, ery = collider.ry, erz = collider.rz;
    const pts = [], prev = [], pinned = [];
    let restX, restY;
    const upright = rig.animal === 'fox';

    if (upright) {
      // a Spartan cloak hung from the shoulders, wrapping the curved BACK hemisphere and
      // falling down behind. follows the torso cross-section so it hugs the body, not a
      // flat billboard.
      const shoulderY = E.c.y + ery * 0.74;        // nape / shoulders
      const dropLen = ery * 2.15 + lerp(0.35, 1.0, tPeople);
      const wrap = 1.5;                            // ±86° around the back
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const rr = r / (ROWS - 1); const u = c / (COLS - 1) - 0.5;
        const y = shoulderY - rr * dropLen;
        const nyC = Math.max(-0.85, Math.min(0.85, (y - E.c.y) / ery));
        const k = Math.sqrt(1 - nyC * nyC);
        const ang = u * wrap;
        const x = Math.sin(ang) * erx * k * 1.06;
        const z = E.c.z - Math.abs(Math.cos(ang)) * erz * k * 1.06;   // behind the spine
        const p = new THREE.Vector3(x, y, z); pts.push(p); prev.push(p.clone());
        pinned.push(r === 0);                      // fastened across the shoulders
      }
      restX = (erx * wrap) / (COLS - 1); restY = dropLen / (ROWS - 1);
    } else {
      // a caparison: a ∩-shaped saddlecloth clasped at the withers, its ridge resting on
      // the back and both edges draping down the flanks, with a few rows trailing off the
      // rump. edges sit just outside the body half-width so they hang clear (never clip).
      const frontZ = E.c.z + erz * 0.5;            // withers (head is +Z)
      const rumpZ = E.c.z - erz * 0.95;            // rump
      const trailRows = 5, bodyRows = ROWS - trailRows;
      const ridgeY = E.c.y + ery;                  // back ridge
      const sideHalf = erx * 1.18;                 // drape half-width (just outside flanks)
      const sideDrop = ery * 2.0 + 0.42;           // how far the flanks hang
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const u = c / (COLS - 1) - 0.5; const frac = Math.abs(u) * 2;
        let z, ridge, widthScale;
        if (r < bodyRows) {
          const rr = r / (bodyRows - 1);
          z = lerp(frontZ, rumpZ, rr); ridge = ridgeY; widthScale = 0.72 + 0.28 * rr;
        } else {
          const tr = (r - bodyRows + 1) / trailRows;
          z = rumpZ - tr * (erz * 0.5 + 0.3); ridge = ridgeY - tr * (ery * 2.0 + 0.5); widthScale = 1;
        }
        const x = u * 2 * sideHalf * widthScale;
        const y = ridge - frac * sideDrop;
        const p = new THREE.Vector3(x, y, z); pts.push(p); prev.push(p.clone());
        pinned.push(r === 0);                      // clasped over the shoulders
      }
      restX = (2 * sideHalf) / (COLS - 1); restY = (frontZ - rumpZ) / (bodyRows - 1);
    }

    const geo = new THREE.PlaneGeometry(1, 1, COLS - 1, ROWS - 1);
    const capeCol = new THREE.Color(cfg.cape).lerp(aura, 0.12);
    const mat = new THREE.MeshPhysicalMaterial({ color: capeCol, roughness: 0.7, metalness: 0.0, sheen: 0.8, sheenColor: aura, clearcoat: 0.08, side: THREE.DoubleSide, envMapIntensity: TH.envI * 0.7 });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; rig.capeGroup.add(mesh);
    const hemGeo = new THREE.BufferGeometry();
    const hemPos = new Float32Array(COLS * 3); hemGeo.setAttribute('position', new THREE.BufferAttribute(hemPos, 3));
    const hem = new THREE.Line(hemGeo, new THREE.LineBasicMaterial({ color: 0xf0c14a })); rig.capeGroup.add(hem);
    rig.cloth = { pts, prev, pinned, COLS, ROWS, geo, mesh, hem, hemPos, collider, restX, restY };
    relaxCloth(rig, 42); syncClothGeo(rig);
  }
  function bb_x(rig) { return (rig.bbox.max.x - rig.bbox.min.x); }

  // collide a cloth point against the invisible body ellipsoid (push out to surface)
  function collideEllipsoid(p, e) {
    if (!e) return;
    const dx = (p.x - e.c.x) / e.rx, dy = (p.y - e.c.y) / e.ry, dz = (p.z - e.c.z) / e.rz;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 1 && d > 1e-4) { const s = 1 / d; p.x = e.c.x + dx * s * e.rx; p.y = e.c.y + dy * s * e.ry; p.z = e.c.z + dz * s * e.rz; }
  }
  function relaxCloth(rig, iters) {
    const cloth = rig.cloth; if (!cloth) return;
    const idx = (r, c) => r * cloth.COLS + c;
    for (let k = 0; k < iters; k++) {
      for (let r = 0; r < cloth.ROWS; r++) for (let c = 0; c < cloth.COLS; c++) {
        if (c < cloth.COLS - 1) satisfy(cloth.pts[idx(r, c)], cloth.pts[idx(r, c + 1)], cloth.restX, cloth.pinned[idx(r, c)], cloth.pinned[idx(r, c + 1)]);
        if (r < cloth.ROWS - 1) satisfy(cloth.pts[idx(r, c)], cloth.pts[idx(r + 1, c)], cloth.restY, cloth.pinned[idx(r, c)], cloth.pinned[idx(r + 1, c)]);
      }
      for (let i = 0; i < cloth.pts.length; i++) { if (!cloth.pinned[i]) collideEllipsoid(cloth.pts[i], cloth.collider); }
    }
    for (let i = 0; i < cloth.prev.length; i++) cloth.prev[i].copy(cloth.pts[i]);
  }
  function syncClothGeo(rig) {
    const cloth = rig.cloth; if (!cloth) return;
    const arr = cloth.geo.attributes.position.array;
    for (let i = 0; i < cloth.pts.length; i++) { arr[i * 3] = cloth.pts[i].x; arr[i * 3 + 1] = cloth.pts[i].y; arr[i * 3 + 2] = cloth.pts[i].z; }
    cloth.geo.attributes.position.needsUpdate = true; cloth.geo.computeVertexNormals();
    for (let c = 0; c < cloth.COLS; c++) { const p = cloth.pts[(cloth.ROWS - 1) * cloth.COLS + c]; cloth.hemPos[c * 3] = p.x; cloth.hemPos[c * 3 + 1] = p.y; cloth.hemPos[c * 3 + 2] = p.z; }
    cloth.hem.geometry.attributes.position.needsUpdate = true;
  }
  function stepCloth(rig, el) {
    const cloth = rig.cloth; if (!cloth) return;
    const G = -0.0011, DAMP = 0.97, wind = Math.sin(el * 1.6) * 0.0006 + Math.sin(el * 0.7) * 0.0004;
    for (let i = 0; i < cloth.pts.length; i++) {
      if (cloth.pinned[i]) continue;
      const p = cloth.pts[i], pr = cloth.prev[i];
      const vx = (p.x - pr.x) * DAMP, vy = (p.y - pr.y) * DAMP, vz = (p.z - pr.z) * DAMP;
      pr.copy(p); p.x += vx + wind; p.y += vy + G; p.z += vz + wind * 0.5;
    }
    const idx = (r, c) => r * cloth.COLS + c;
    for (let iter = 0; iter < 3; iter++) {
      for (let r = 0; r < cloth.ROWS; r++) for (let c = 0; c < cloth.COLS; c++) {
        if (c < cloth.COLS - 1) satisfy(cloth.pts[idx(r, c)], cloth.pts[idx(r, c + 1)], cloth.restX, cloth.pinned[idx(r, c)], cloth.pinned[idx(r, c + 1)]);
        if (r < cloth.ROWS - 1) satisfy(cloth.pts[idx(r, c)], cloth.pts[idx(r + 1, c)], cloth.restY, cloth.pinned[idx(r, c)], cloth.pinned[idx(r + 1, c)]);
      }
      for (let i = 0; i < cloth.pts.length; i++) { if (!cloth.pinned[i]) collideEllipsoid(cloth.pts[i], cloth.collider); }
    }
    syncClothGeo(rig);
  }
  function satisfy(a, b, rest, ap, bp) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-5; const diff = (d - rest) / d * 0.5;
    const mx = dx * diff, my = dy * diff, mz = dz * diff;
    if (!ap) { a.x += mx; a.y += my; a.z += mz; } if (!bp) { b.x -= mx; b.y -= my; b.z -= mz; }
  }

  // ── particles + orbits (hero only) ──
  let particles = null;
  function rebuildParticles() {
    if (particles) { particles.geometry.dispose(); particles.material.dispose(); fxGroup.remove(particles); particles = null; }
    const overall = clamp01(Object.values(curStats).reduce((a, b) => a + (b || 0), 0) / 600);
    const N = Math.round(lerp(20, 150, overall)) + Math.min(48, curMs * 6);
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, rad = 0.7 + Math.random() * 2.3; pos[i * 3] = Math.cos(a) * rad; pos[i * 3 + 1] = -0.4 + Math.random() * 3.6; pos[i * 3 + 2] = Math.sin(a) * rad; seed[i] = Math.random(); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.PointsMaterial({ size: 0.085, map: sprite, color: accentForPath(hero.path), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    particles = new THREE.Points(geo, mat); particles.userData.base = pos.slice(); fxGroup.add(particles);
  }
  function rebuildOrbits() {
    clearGroup(orbitGroup);
    const n = Math.min(12, Math.max(0, curMs | 0));
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, r = lerp(2.3, 2.8, (i % 3) / 2); const o = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), gem(hero, 1.2)); o.position.set(Math.cos(a) * r, lerp(0.2, 2.5, (i * 0.618) % 1), Math.sin(a) * r); o.userData.baseY = o.position.y; o.userData.phase = i; orbitGroup.add(o); }
  }

  // ── apply stats to a rig (or both) ──
  function applyStatsRig(rig) {
    if (!rig.modelReady) return;
    const tBody = clamp01((curStats.body ?? 50) / 100);
    const overall = clamp01(Object.values(curStats).reduce((a, b) => a + (b || 0), 0) / 600);
    const grow = clamp01(0.5 * overall + 0.5 * tBody);
    const uni = lerp(0.74, 1.06, grow);
    const girth = lerp(0.88, 1.13, tBody);
    rig.group.scale.setScalar(uni);
    rig.modelGroup.scale.set(girth, 1, lerp(0.97, 1.03, tBody));
    buildRegalia(rig); buildCape(rig); buildBoots(rig);
  }
  function applyStats() {
    const tMind = clamp01((curStats.mind ?? 50) / 100);
    const tMoney = clamp01((curStats.money ?? 50) / 100);
    goldUniforms.uHead.value = clamp01(0.5 * tMind + 0.5 * tMoney);
    goldUniforms.uChest.value = clamp01(tMoney);
    goldUniforms.uHoof.value = clamp01(tMoney * 1.08);
    applyStatsRig(hero); if (compOn) applyStatsRig(comp);
    rebuildParticles(); rebuildOrbits();
  }

  // ── load models into rigs ──
  const loader = new GLTFLoader();
  function loadRig(rig, onDone) {
    rig.modelReady = false; clearGroup(rig.modelGroup); rig.goldEmissive = [];
    loader.load(ANIMALS[rig.animal].url, (gltf) => {
      const m = processModel(gltf.scene, rig);
      if (!m) { if (rig === hero) buildFallback(); return; }
      rig.bodyMesh = m; rig.modelGroup.add(m); rig.modelReady = true;
      applyStatsRig(rig); if (onDone) onDone(); renderOnce();
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
    hero.headTop = new THREE.Vector3(0, 1.7, 1.0); hero.neckBase = new THREE.Vector3(0, 1.2, 0.7); hero.chestPt = new THREE.Vector3(0, 0.95, 0.7); hero.rumpPt = new THREE.Vector3(0, 1.2, -0.9);
    hero.hornAnchors = []; hero.footAnchors = [new THREE.Vector3(0.5, 0.02, 0.5), new THREE.Vector3(-0.5, 0.02, 0.5), new THREE.Vector3(0.5, 0.02, -0.5), new THREE.Vector3(-0.5, 0.02, -0.5)];
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 28, 22), marbleMat()); body.scale.set(1, 0.9, 1.4); body.position.set(0, 1.1, -0.1); hero.modelGroup.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 18), marbleMat()); head.position.copy(hero.headTop); hero.modelGroup.add(head);
    applyStatsRig(hero); buildEnvironment(); renderOnce();
  }

  function renderOnce() { try { composer.render(); } catch (e) {} }

  // ── shockwave + pulse ──
  let shock = null;
  function spawnShock() { if (shock) { shock.geometry.dispose(); shock.material.dispose(); fxGroup.remove(shock); } shock = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.32, 64), new THREE.MeshBasicMaterial({ color: accentForPath(hero.path), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); shock.rotation.x = -Math.PI / 2; shock.position.y = (hero.bbox ? hero.bbox.min.y : 0) + 0.02; fxGroup.add(shock); shock.userData.t = 0; }
  let pulseT = -1;
  function pulse() { pulseT = 0; spawnShock(); if (!running) { running = true; t0 = performance.now(); frame(); } }
  function allGoldEmissive() { return compOn ? hero.goldEmissive.concat(comp.goldEmissive) : hero.goldEmissive; }

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
      rig.modelGroup.position.y = breathe; rig.goldGroup.position.y = breathe; rig.haloGroup.position.y = rig.haloBaseY + breathe;
      rig.haloGroup.rotation.y = el * 0.4;
    });
    orbitGroup.rotation.y = el * 0.4;
    orbitGroup.children.forEach((o) => { o.rotation.x = el * 1.2; o.rotation.y = el * 0.8; o.position.y = o.userData.baseY + Math.sin(el * 1.3 + o.userData.phase) * 0.12; });
    [hero, comp].forEach((rig) => rig.goldGroup.traverse((o) => { if (o.userData && o.userData.spin) o.rotation.y = el * 1.6; }));
    [hero, comp].forEach((rig) => rig.haloGroup.traverse((o) => { if (o.userData && o.userData.spin) o.rotation.z = el * 1.0; }));

    stepCloth(hero, el); if (compOn) stepCloth(comp, el);

    if (particles) { const p = particles.geometry.attributes.position, seed = particles.geometry.attributes.seed, base = particles.userData.base; for (let i = 0; i < p.count; i++) { const sd = seed.array[i]; let y = base[i * 3 + 1] + ((el * (0.16 + sd * 0.22)) % 4.2); if (y > 3.3) y -= 4.2; p.array[i * 3 + 1] = y; p.array[i * 3] = base[i * 3] + 0.06 * Math.sin(el * (0.5 + sd) + sd * 6.28); p.array[i * 3 + 2] = base[i * 3 + 2] + 0.06 * Math.cos(el * (0.5 + sd) + sd * 6.28); } p.needsUpdate = true; particles.material.opacity = 0.5 + 0.22 * Math.sin(el * 1.5); }

    for (let i = 0; i < envAnim.length; i++) { const e = envAnim[i]; e.mesh.position.x = Math.sin(el * e.speed + i) * 1.5; }

    let bloomBoost = 0;
    if (pulseT >= 0) {
      pulseT += 1 / 60; const D = 1.7;
      if (pulseT < D) { const f = pulseT / D, e = Math.sin(Math.min(1, f) * Math.PI); camera.position.z = lerp(CAM0.z, 5.9, e); camera.position.y = lerp(CAM0.y, 1.35, e); camera.lookAt(0, 1.1, 0); bloomBoost = e * 0.32; const ig = e * 0.7; goldUniforms.uIgnite.value = e * 1.2; allGoldEmissive().forEach((m) => { if (m.userData_base == null) m.userData_base = m.emissiveIntensity; m.emissiveIntensity = (m.userData_base || 0) + ig; }); }
      else { pulseT = -1; goldUniforms.uIgnite.value = 0; camera.position.copy(CAM0); camera.lookAt(0, 1.35, 0); allGoldEmissive().forEach((m) => { if (m.userData_base != null) m.emissiveIntensity = m.userData_base; }); }
    } else { allGoldEmissive().forEach((m) => { if (m.userData_base != null && Math.abs(m.emissiveIntensity - m.userData_base) > 0.01) m.emissiveIntensity = m.userData_base; }); }

    if (shock) { shock.userData.t += 1 / 60; const st = shock.userData.t; shock.scale.setScalar(1 + st * 9); shock.material.opacity = Math.max(0, 0.9 - st * 0.9); if (st > 1) { shock.geometry.dispose(); shock.material.dispose(); fxGroup.remove(shock); shock = null; } }

    bloom.strength = TH.bloom.strength + bloomBoost;
    if (controls) { camera.position.set(0, CAM0.y, CAM0.z / controls.zoom); camera.lookAt(0, 1.35, 0); }
    composer.render();
  }

  function resize() { const w = container.clientWidth || 1, h = container.clientHeight || 1; renderer.setSize(w, h, false); composer.setSize(w, h); bloom.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(resize); ro.observe(container);
  function onVis() { if (document.hidden) { running = false; if (raf) cancelAnimationFrame(raf); } else if (!running) { running = true; t0 = performance.now(); frame(); } }
  document.addEventListener('visibilitychange', onVis);

  function setStats(s) { curStats = { ...curStats, ...s }; applyStats(); }
  function setMilestones(n) { curMs = n; rebuildParticles(); rebuildOrbits(); }
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
    compOn = on; compWrap.visible = on; loadCompanion(); if (on) applyStatsRig(comp); renderOnce();
  }
  function setTheme(th, ac) {
    TH = THEMES[th] || THEMES.dark; if (ac) accentColor = new THREE.Color(ac);
    buildEnvironment();
    ambient.color = new THREE.Color(TH.ambient); ambient.intensity = TH.ambI;
    keyLight.color = new THREE.Color(TH.key); keyLight.intensity = TH.keyI;
    fillLight.color = new THREE.Color(TH.fill); fillLight.intensity = TH.fillI;
    rimLight.color = new THREE.Color(TH.rim); rimLight.intensity = TH.rimI;
    if (ac) accentLight.color = new THREE.Color(ac);
    renderer.toneMappingExposure = TH.exposure; bloom.strength = TH.bloom.strength; bloom.radius = TH.bloom.radius; bloom.threshold = TH.bloom.threshold;
    [hero, comp].forEach((rig) => { if (rig.bodyMesh) { const mm = Array.isArray(rig.bodyMesh.material) ? rig.bodyMesh.material[0] : rig.bodyMesh.material; mm.color = new THREE.Color(TH.marble); mm.sheenColor = new THREE.Color(TH.rim); mm.envMapIntensity = TH.envI; } });
    applyStats();
  }
  function dispose() { running = false; if (raf) cancelAnimationFrame(raf); if (ctrlCleanup) ctrlCleanup(); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); [hero, comp].forEach((rig) => [rig.modelGroup, rig.goldGroup, rig.capeGroup, rig.footGroup, rig.haloGroup].forEach(clearGroup)); [orbitGroup, fxGroup, bgGroup].forEach(clearGroup); if (skyTex) skyTex.dispose(); sprite.dispose(); envTex.dispose(); pmrem.dispose(); composer.dispose(); renderer.dispose(); if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); }

  buildEnvironment();
  resize(); frame();
  return { setStats, setMilestones, setPath, setAnimal, setCompanion, setTheme, pulse, resize, dispose, setYaw: (r) => { yawOffset = r; } };
}

window.DolbomiCreature = { create };
window.dispatchEvent(new Event('dolbomi-creature-ready'));
