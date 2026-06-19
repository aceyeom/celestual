// creature-hero.jsx — React wrapper that mounts the live Three.js guardian (creature.js)
// and binds it to DOLBOMI's live state: 6 stats sculpt the body, milestones add orbiting
// ornaments, theme/accent follow the app, and a pulse signal fires the milestone reaction.
(function () {
const { useRef, useEffect, useState } = React;
const T = window.DOLBOMI;

const PATHS = [
  { key: 'haechi',  ko: '해치',   en: 'HAECHI',  desc: '정의의 수호 · 균형' },
  { key: 'dragon',  ko: '청룡',   en: 'DRAGON',  desc: '비상의 기개 · 도전' },
  { key: 'phoenix', ko: '봉황',   en: 'PHOENIX', desc: '재생의 의지 · 회복' },
  { key: 'tiger',   ko: '백호',   en: 'TIGER',   desc: '용맹의 힘 · 추진' },
];
window.CREATURE_PATHS = PATHS;

const ANIMALS = [
  { key: 'ram', ko: '숫양', en: 'RAM',  desc: '묵직한 의지 · 버팅' },
  { key: 'fox', ko: '여우', en: 'FOX',  desc: '영리함 · 기지' },
];
window.CREATURE_ANIMALS = ANIMALS;

// resolve a CSS custom property on the nearest .dolbomi root to a real color string
function resolveAccent(el) {
  let n = el;
  while (n && !(n.classList && n.classList.contains('dolbomi'))) n = n.parentElement;
  const cs = getComputedStyle(n || document.documentElement);
  const v = cs.getPropertyValue('--accent').trim();
  return v || '#E7A33C';
}

function statsToCreature(stats) {
  const m = {};
  (stats || []).forEach((s) => { m[s.key] = s.cur; });
  return m;
}

function CreatureHero({ path = 'haechi', animal = 'ram', companion = null, stats, milestones = 0, theme = 'dark', pulseSignal = 0, level = 1, interactive = false, onCompanionTap = null }) {
  const hostRef = useRef(null);
  const apiRef = useRef(null);
  const tapRef = useRef(onCompanionTap);
  tapRef.current = onCompanionTap;
  const [ready, setReady] = useState(!!window.DolbomiCreature);

  // wait for the ES module to attach window.DolbomiCreature
  useEffect(() => {
    if (window.DolbomiCreature) { setReady(true); return; }
    const on = () => setReady(true);
    window.addEventListener('dolbomi-creature-ready', on);
    const iv = setInterval(() => { if (window.DolbomiCreature) { setReady(true); clearInterval(iv); } }, 120);
    return () => { window.removeEventListener('dolbomi-creature-ready', on); clearInterval(iv); };
  }, []);

  // create once ready
  useEffect(() => {
    if (!ready || !hostRef.current || apiRef.current) return;
    const accent = resolveAccent(hostRef.current);
    try {
      apiRef.current = window.DolbomiCreature.create({
        container: hostRef.current,
        path, animal, companion, theme, accent, interactive,
        stats: statsToCreature(stats),
        milestones,
        onCompanionTap: (p) => { if (tapRef.current) tapRef.current(p); },
      });
      window.__cr = apiRef.current;
      window.__crPath = path;
    } catch (e) { console.error('creature init failed', e); }
    return () => { if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; } };
  }, [ready]);

  // live updates
  useEffect(() => { if (apiRef.current) apiRef.current.setStats(statsToCreature(stats)); }, [stats]);
  useEffect(() => { if (apiRef.current) apiRef.current.setMilestones(milestones); }, [milestones]);
  useEffect(() => { if (apiRef.current) { apiRef.current.setPath(path); window.__crPath = path; } }, [path]);
  useEffect(() => { if (apiRef.current && apiRef.current.setCompanion) apiRef.current.setCompanion(companion); }, [companion]);
  useEffect(() => {
    if (apiRef.current && hostRef.current) apiRef.current.setTheme(theme, resolveAccent(hostRef.current));
  }, [theme]);
  useEffect(() => { if (apiRef.current && pulseSignal > 0) apiRef.current.pulse(); }, [pulseSignal]);

  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0 }}>
      {!ready && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--faint)', fontSize: 12 }}>수호신 깨어나는 중…</div>
      )}
    </div>
  );
}

window.CreatureHero = CreatureHero;
})();
