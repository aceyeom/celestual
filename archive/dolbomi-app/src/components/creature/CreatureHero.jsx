import React, { useRef, useEffect } from 'react';
import { create } from '../../3d/creature';

const PATHS = [
  { key: 'haechi', ko: '해치', en: 'HAECHI', desc: '정의의 수호 · 균형' },
  { key: 'dragon', ko: '청룡', en: 'DRAGON', desc: '비상의 기개 · 도전' },
];

const ANIMALS = [
  { key: 'ram', ko: '숫양', en: 'RAM', desc: '묵직한 의지 · 버팅' },
  { key: 'fox', ko: '여우', en: 'FOX', desc: '영리함 · 기지' },
];

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

  // create once host is available
  useEffect(() => {
    if (!hostRef.current || apiRef.current) return;
    const accent = resolveAccent(hostRef.current);
    try {
      apiRef.current = create({
        container: hostRef.current,
        path, animal, companion, theme, accent, interactive,
        stats: statsToCreature(stats),
        milestones,
        onCompanionTap: (p) => { if (tapRef.current) tapRef.current(p); },
      });
    } catch (e) { console.error('creature init failed', e); }
    return () => { if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null; } };
  }, []);

  // live updates
  useEffect(() => { if (apiRef.current) apiRef.current.setStats(statsToCreature(stats)); }, [stats]);
  useEffect(() => { if (apiRef.current) apiRef.current.setMilestones(milestones); }, [milestones]);
  useEffect(() => { if (apiRef.current) apiRef.current.setPath(path); }, [path]);
  useEffect(() => { if (apiRef.current && apiRef.current.setCompanion) apiRef.current.setCompanion(companion); }, [companion]);
  useEffect(() => {
    if (apiRef.current && hostRef.current) apiRef.current.setTheme(theme, resolveAccent(hostRef.current));
  }, [theme]);
  useEffect(() => { if (apiRef.current && pulseSignal > 0) apiRef.current.pulse(); }, [pulseSignal]);

  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
  );
}

export { CreatureHero, PATHS as CREATURE_PATHS, ANIMALS as CREATURE_ANIMALS };
