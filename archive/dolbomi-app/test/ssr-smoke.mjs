// SSR smoke test: render every screen + overlay synchronously to catch runtime
// errors. useEffect doesn't fire under SSR, so Three.js/WebGL never run.
import { createServer } from 'vite';

const noop = () => {};
const fakeEl = () => ({
  setAttribute: noop, appendChild: noop, append: noop, remove: noop,
  style: {}, classList: { add: noop, remove: noop }, addEventListener: noop,
  removeEventListener: noop, getContext: () => null, dataset: {},
});
globalThis.document = {
  getElementById: () => null, createElement: fakeEl, createElementNS: fakeEl,
  head: fakeEl(), body: fakeEl(), documentElement: fakeEl(),
  addEventListener: noop, removeEventListener: noop,
};
globalThis.window = globalThis;
globalThis.addEventListener = noop;
globalThis.removeEventListener = noop;
globalThis.matchMedia = () => ({ matches: false, addEventListener: noop, removeEventListener: noop, addListener: noop, removeListener: noop });
globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
globalThis.requestAnimationFrame = noop;
globalThis.cancelAnimationFrame = noop;
globalThis.parent = { postMessage: noop };

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
const React = (await import('react')).default;
const { renderToString } = await import('react-dom/server');

let failed = 0;
function tryRender(label, el) {
  try {
    const html = renderToString(el);
    console.log(`✓ ${label.padEnd(22)} ${html.length} bytes`);
    return html;
  } catch (e) {
    console.log(`✗ ${label} FAILED:`);
    console.log('   ' + (e && e.stack ? e.stack.split('\n').slice(0, 4).join('\n   ') : String(e)));
    failed++;
    return '';
  }
}
const h = React.createElement;

try {
  const data = await server.ssrLoadModule('/src/data/index.js');
  const opp = data.oppById('startup');
  const ms = opp.milestones.map((m) => ({ ...m, subquests: m.subquests.map((s) => ({ ...s })) }));
  const baseGuardian = { soldier: data.soldier, stats: data.stats, creaturePath: 'haechi', creatureAnimal: 'ram', milestones: 2, pulseSignal: 0, onPickPath: noop, onOpenAvatar: noop };

  // top-level app. Load App first (populates the SSR module cache), then mark
  // the store loaded via the same instance App imported, so the gate opens and
  // App renders the full home screen with real data.
  const App = (await server.ssrLoadModule('/src/App.jsx')).default;
  // Under SSR the App renders its loading gate (bootstrap is client-only); we
  // just assert it renders without throwing. Store-backed screens below are
  // rendered directly to validate the data path.
  tryRender('App (loading gate)', h(App));

  // each screen
  const Home = (await server.ssrLoadModule('/src/screens/HomeScreen.jsx')).HomeScreen;
  tryRender('HomeScreen', h(Home, { ...baseGuardian, quests: data.tonight, statMode: 'mono', mood: null, showAi: true, onToggleQuest: noop, onOpenCheckin: noop, theme: 'dark', onOpenOpp: noop, variant: 'home' }));

  const Radar = (await server.ssrLoadModule('/src/screens/RadarScreen.jsx')).RadarScreen;
  tryRender('RadarScreen', h(Radar, { onOpenOpp: noop }));

  const Vac = (await server.ssrLoadModule('/src/screens/VacationScreen.jsx')).VacationScreen;
  tryRender('VacationScreen', h(Vac, { onOpenOpp: noop }));

  const Ben = (await server.ssrLoadModule('/src/screens/BenefitsScreen.jsx')).BenefitsScreen;
  tryRender('BenefitsScreen', h(Ben, { onMakeQuest: noop }));

  const Prof = (await server.ssrLoadModule('/src/screens/ProfileScreen.jsx')).ProfileScreen;
  tryRender('ProfileScreen', h(Prof, { ...baseGuardian, statMode: 'mono', onOpen: noop, onOpenOpp: noop, variant: 'profile' }));

  const OppDetail = (await server.ssrLoadModule('/src/screens/OppDetail.jsx')).OppDetail;
  tryRender('OppDetail', h(OppDetail, { o: opp, ms, onOpenPlan: noop, onAddTonight: noop }));

  const OppPlan = (await server.ssrLoadModule('/src/screens/OppPlan.jsx')).OppPlan;
  tryRender('OppPlan', h(OppPlan, { o: opp, ms, onToggle: noop, onAddTonight: noop }));

  // overlays
  const ov = await server.ssrLoadModule('/src/components/Overlays.jsx');
  tryRender('CheckInSheet', h(ov.CheckInSheet, { onClose: noop, onDone: noop }));
  tryRender('QuestComplete', h(ov.QuestComplete, { quest: data.tonight[0], guardianName: '해치', onClose: noop }));
  tryRender('Wrapped', h(ov.Wrapped, {}));

  // 3D-backed components (canvas init is in useEffect → safe under SSR)
  const av = (await server.ssrLoadModule('/src/components/creature/AvatarViewer.jsx')).AvatarViewer;
  tryRender('AvatarViewer', h(av, { stats: data.stats, creaturePath: 'haechi', creatureAnimal: 'ram', onSwapPath: noop, milestones: 2, theme: 'dark', soldier: data.soldier, onClose: noop }));

  const gc = (await server.ssrLoadModule('/src/components/creature/GuardianCard.jsx')).GuardianHero;
  tryRender('GuardianHero', h(gc, { ...baseGuardian, variant: 'home' }));

  // gated components (normally behind click/expand state)
  const sd = await server.ssrLoadModule('/src/components/SkillDetail.jsx');
  tryRender('SkillDetail', h(sd.SkillDetail, { statKey: 'craft', onOpenOpp: noop }));
  const bd = await server.ssrLoadModule('/src/components/Badges.jsx');
  tryRender('BadgeCard', h(bd.BadgeCard, { t: data.titles[0] }));
  const al = await server.ssrLoadModule('/src/components/ActivityLog.jsx');
  tryRender('ActivityLog', h(al.ActivityLog, { onOpenRecap: noop }));
} catch (e) {
  console.log('✗ HARNESS ERROR:', e && e.stack ? e.stack : String(e));
  failed++;
}

await server.close();
console.log(failed ? `\n${failed} failure(s)` : '\nAll screens render cleanly ✓');
process.exit(failed ? 1 : 0);
