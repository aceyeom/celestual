// Download the MIT-licensed Microsoft Fluent 3D emoji used by the asset
// manifest (src/assets/manifest.js) into dolbomi-app/src/assets/3d/.
// Run: node scripts/fetch-3d-assets.mjs   (re-run safe; skips existing files)
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'dolbomi-app', 'src', 'assets', '3d');
mkdirSync(outDir, { recursive: true });

const BASE = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets';

// key (filename) → Fluent emoji folder name
const ASSETS = {
  // stat / quest categories
  body: 'Flexed biceps',
  mind: 'Brain',
  money: 'Money bag',
  craft: 'Hammer and wrench',
  people: 'Handshake',
  edge: 'Rocket',
  // catalog categories
  cert: 'Sports medal',
  language: 'Globe with meridians',
  education: 'Graduation cap',
  contest: 'Trophy',
  career: 'Briefcase',
  // moods (check-in)
  mood_low: 'Face exhaling',
  mood_meh: 'Neutral face',
  mood_ok: 'Slightly smiling face',
  mood_good: 'Face with steam from nose',
  // spot art
  vacation: 'Palm tree',
  benefit: 'Wrapped gift',
  target: 'Bullseye',
  fire: 'Fire',
  sparkles: 'Sparkles',
  locked: 'Locked',
  books: 'Books',
  calendar: 'Calendar',
  moon: 'Crescent moon',
  star: 'Glowing star',
  check: 'Check mark button',
  party: 'Party popper',
};

const snake = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_');

async function fetchFirst(urls) {
  for (const u of urls) {
    const r = await fetch(u);
    if (r.ok) return Buffer.from(await r.arrayBuffer());
  }
  return null;
}

let ok = 0, fail = [];
for (const [key, name] of Object.entries(ASSETS)) {
  const dest = join(outDir, `${key}.png`);
  if (existsSync(dest)) { ok++; continue; }
  const s = snake(name);
  const buf = await fetchFirst([
    `${BASE}/${encodeURIComponent(name)}/3D/${s}_3d.png`,
    `${BASE}/${encodeURIComponent(name)}/Default/3D/${s}_3d_default.png`,
  ]);
  if (buf) { writeFileSync(dest, buf); ok++; console.log(`✓ ${key} ← ${name}`); }
  else { fail.push(`${key} (${name})`); console.error(`✗ ${key} ← ${name}`); }
}
console.log(`\n${ok}/${Object.keys(ASSETS).length} assets ready in ${outDir}`);
if (fail.length) { console.error('Missing:', fail.join(', ')); process.exit(1); }
