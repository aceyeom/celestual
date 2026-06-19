import { useState, useMemo, useEffect } from 'react';
import { Icon } from './icons';
import { ScreenHead } from './components/ui';
import { useStore } from './store';
import { HomeScreen } from './screens/HomeScreen';
import { QuestScreen } from './screens/QuestScreen';
import { RadarScreen } from './screens/RadarScreen';
import { ProfileScreen, StatDetailPage, RoadmapPage, TitlesPage, RecordsPage } from './screens/ProfileScreen';
import { OppDetail } from './screens/OppDetail';
import { OppPlan } from './screens/OppPlan';
import { AuthScreen } from './screens/AuthScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AddOppScreen } from './screens/AddOppScreen';
import { AdminScreen } from './screens/AdminScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CheckInSheet, QuestComplete, Wrapped } from './components/Overlays';
import { AvatarViewer } from './components/creature/AvatarViewer';
import { CREATURE_PATHS } from './components/creature/CreatureHero';
import { evolutionOf, COMPANION_STAGE } from './components/creature/GuardianCard';
import { useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakRadio } from './components/TweaksPanel';

import './styles/tokens.css';

// Secondary dev knobs (the production theme/palette/path now live in store prefs
// + the Settings screen). These remain default-only.
const TWEAK_DEFAULTS = { istroke: 1.75, game: 20, statMode: '단색', showAi: true };

const PAL_MAP = { '그린': 'green', '골드': 'gold', '스틸': 'steel' };
const PATH_KEYS = new Set(CREATURE_PATHS.map((p) => p.key));
const ANIMAL_FOR_PATH = { haechi: 'ram', dragon: 'fox' };

// 4 tabs with one job each: 홈 = the guardian dashboard, 퀘스트 = the daily
// action, 기회 = browse (탐색·휴가·혜택 as segments), 프로필 = the Receipt + hub.
const NAV = [
  { key: 'home', label: '홈', icon: 'home' },
  { key: 'quests', label: '퀘스트', icon: 'moon' },
  { key: 'radar', label: '기회', icon: 'target' },
  { key: 'profile', label: '프로필', icon: 'user' },
];
const TAB_TITLES = { home: '', quests: '퀘스트', radar: '기회', profile: '프로필' };

export default function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useState('home');
  const [pushed, setPushed] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [celebrate, setCelebrate] = useState(null);
  const [showAvatar, setShowAvatar] = useState(false);
  const [pulse, setPulse] = useState(0);

  // live data + auth from the store
  const loaded = useStore((s) => s.loaded);
  const authReady = useStore((s) => s.authReady);
  const needsAuth = useStore((s) => s.needsAuth);
  const online = useStore((s) => s.online);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const soldier = useStore((s) => s.soldier);
  const allStats = useStore((s) => s.stats);
  const quests = useStore((s) => s.tonight);
  const catalog = useStore((s) => s.catalog);
  const prefs = useStore((s) => s.prefs);
  const mood = useStore((s) => s.mood);
  const bootstrap = useStore((s) => s.bootstrap);
  const oppById = useStore((s) => s.oppById);
  const setPref = useStore((s) => s.setPref);
  const storeToggleTonight = useStore((s) => s.toggleTonight);
  const storeToggleSubquest = useStore((s) => s.toggleSubquest);
  const storeAddTonight = useStore((s) => s.addTonight);
  const storeCheckin = useStore((s) => s.checkin);
  const toast = useStore((s) => s.toast);
  const showToast = useStore((s) => s.showToast);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  // toast auto-dismiss: render straight from the store, expire by id
  const [toastExpiredId, setToastExpiredId] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToastExpiredId(toast.id), 2600);
    return () => clearTimeout(t);
  }, [toast]);
  const toastShown = toast && toast.id !== toastExpiredId ? toast : null;

  const pushedOpp = pushed && pushed.id ? oppById(pushed.id) : null;
  const getMs = (o) => o.milestones;

  const statMode = t.statMode === '컬러' ? 'color' : 'mono';
  const theme = prefs.theme === 'light' ? 'light' : 'dark';
  const creaturePath = PATH_KEYS.has(prefs.path) ? prefs.path : 'haechi';
  const creatureAnimal = ANIMAL_FOR_PATH[creaturePath] || 'ram';
  // the unchosen guardian unlocks as a companion at 성체 (COMPANION_STAGE)
  const pickPath = (key) => {
    if (!PATH_KEYS.has(key) || key === creaturePath) return;
    if (evolutionOf(allStats).stage < COMPANION_STAGE) {
      showToast('동료 수호신은 성체 단계(140 XP)에 만날 수 있어요');
      return;
    }
    setPref('path', key);
  };

  const milestones = useMemo(() => {
    const cat = (catalog || []).reduce((n, o) =>
      n + o.milestones.filter((m) => m.subquests.length && m.subquests.every((s) => s.done)).length, 0);
    return cat + quests.filter((q) => q.done).length;
  }, [catalog, quests]);

  const toggleQuest = (id) => {
    const q = quests.find((x) => x.id === id);
    if (q && !q.done) setCelebrate(q);
    storeToggleTonight(id);
  };

  const goTab = (k) => { setPushed(null); setTab(k); };
  const openOpp = (o) => setPushed({ type: 'opp', id: o.id });
  const openPlan = (o) => setPushed({ type: 'oppPlan', id: o.id });
  const makeQuest = (oId) => { if (oppById(oId)) setPushed({ type: 'opp', id: oId }); };
  const addToTonight = (oId) => { storeAddTonight(oId); setPushed(null); setTab('quests'); };

  const isDark = theme === 'dark';
  const palData = PAL_MAP[prefs.palette] || 'green';

  // ── gates: loading → auth → app ──────────────────────────────────────
  if (!authReady || !loaded) {
    return (
      <div className="dolbomi" data-pal={palData} data-theme={theme}
        style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--sub)' }}>
          {Icon('sparkle', { size: 28, color: 'var(--accent)', stroke: 1.8 })}
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '.04em' }}>DOLBOMI 불러오는 중…</span>
        </div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="dolbomi" data-pal={palData} data-theme={theme} style={{ height: '100dvh', position: 'relative', background: 'var(--bg)' }}>
        <AuthScreen />
      </div>
    );
  }

  if (!soldier) return null;

  // signed in but profile not set up yet → guided onboarding wizard
  if (online && !soldier.onboarded) {
    return (
      <div className="dolbomi" data-pal={palData} data-theme={theme} style={{ height: '100dvh', position: 'relative', background: 'var(--bg)' }}>
        <OnboardingScreen soldier={soldier} onComplete={completeOnboarding} />
      </div>
    );
  }

  let screen = null;
  if (tab === 'home') screen = <HomeScreen soldier={soldier} stats={allStats} quests={quests} mood={mood} showAi={t.showAi} creaturePath={creaturePath} creatureAnimal={creatureAnimal} theme={theme} pulseSignal={pulse} milestones={milestones} onPickPath={pickPath} onOpenAvatar={() => setShowAvatar(true)} onGoQuests={() => goTab('quests')} catalog={catalog} />;
  else if (tab === 'quests') screen = <QuestScreen soldier={soldier} stats={allStats} quests={quests} mood={mood} onToggleQuest={toggleQuest} onOpenCheckin={() => setSheet('checkin')} onOpenPlan={openPlan} onGoRadar={() => goTab('radar')} />;
  else if (tab === 'radar') screen = <RadarScreen onOpenOpp={openOpp} onAddOpp={() => setPushed({ type: 'addOpp' })} onMakeQuest={makeQuest} soldier={soldier} />;
  else if (tab === 'profile') screen = <ProfileScreen soldier={soldier} stats={allStats} statMode={statMode} onOpen={(k) => setPushed({ type: k })} onOpenOpp={makeQuest} onOpenAvatar={() => setShowAvatar(true)} onOpenSettings={() => setPushed({ type: 'settings' })} onGoRadar={() => goTab('radar')} />;

  let pushContent = null, pushTitle = '';
  if (pushed) {
    if (pushed.type === 'opp' && pushedOpp) {
      pushContent = <OppDetail o={pushedOpp} ms={getMs(pushedOpp)} onOpenPlan={() => openPlan(pushedOpp)} onAddTonight={() => addToTonight(pushedOpp.id)} onDeleted={() => setPushed(null)} />;
      pushTitle = '기회 상세';
    } else if (pushed.type === 'oppPlan' && pushedOpp) {
      pushContent = <OppPlan o={pushedOpp} ms={getMs(pushedOpp)} onToggle={(mid, sid, v) => storeToggleSubquest(pushedOpp.id, sid, v)} onAddTonight={() => addToTonight(pushedOpp.id)} />;
      pushTitle = '전체 계획';
    } else if (pushed.type === 'wrapped') {
      pushContent = <Wrapped />;
      pushTitle = '월간 결산';
    } else if (pushed.type === 'statDetail') {
      pushContent = <StatDetailPage stats={allStats} statMode={statMode} onOpenOpp={makeQuest} />;
      pushTitle = '능력치 상세';
    } else if (pushed.type === 'roadmap') {
      pushContent = <RoadmapPage stats={allStats} />;
      pushTitle = '진화 로드맵';
    } else if (pushed.type === 'titles') {
      pushContent = <TitlesPage />;
      pushTitle = '칭호';
    } else if (pushed.type === 'records') {
      pushContent = <RecordsPage onOpenRecap={() => setPushed({ type: 'wrapped' })} />;
      pushTitle = '기록';
    } else if (pushed.type === 'addOpp') {
      pushContent = <AddOppScreen onSaved={(id) => setPushed({ type: 'opp', id })} />;
      pushTitle = '기회 직접 추가';
    } else if (pushed.type === 'admin') {
      pushContent = <AdminScreen />;
      pushTitle = '관리자 · 심사';
    } else if (pushed.type === 'settings') {
      pushContent = <SettingsScreen onOpenAdmin={() => setPushed({ type: 'admin' })} />;
      pushTitle = '설정';
    }
  }

  const tabTitle = TAB_TITLES[tab];

  return (
    <div className="dolbomi" data-pal={palData} data-theme={theme}
      style={{ '--game': (t.game ?? 20) / 100, '--istroke': t.istroke ?? 1.75, height: '100dvh', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 240, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(90% 60% at 50% -12%, rgba(var(--accent-rgb), calc(.10 * (var(--game) + .4))), transparent 66%)' }} />

      <main style={{ position: 'relative', flex: 1, overflow: 'hidden', zIndex: 1 }}>
        <div key={tab} style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 20px 0' }}>
          {tabTitle && <ScreenHead title={tabTitle} />}
          {screen}
          <div style={{ height: 104 }} />
        </div>

        {!pushed && (
          <button onClick={() => setPushed({ type: 'settings' })} aria-label="설정" className="tm-tap" style={{ position: 'absolute', top: 14, right: 18, zIndex: 8,
            width: 34, height: 34, borderRadius: 999, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
            {Icon('sliders', { size: 18, color: 'var(--sub)', stroke: 1.9 })}
          </button>
        )}

        {pushed && (
            <div key={pushed.type + (pushed.id || '')} style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: 'calc(env(safe-area-inset-top, 0px) + 56px) 20px 0', background: 'var(--bg)', zIndex: 5, animation: 'tmSlideIn .3s cubic-bezier(.2,.8,.2,1)' }}>
            <ScreenHead title={pushTitle} onBack={() => setPushed(null)} />
            {pushContent}
            <div style={{ height: 104 }} />
          </div>
        )}
      </main>

      <nav style={{ position: 'relative', zIndex: 20, display: 'flex', justifyContent: 'space-between', padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 10px)',
        background: 'linear-gradient(0deg, var(--bg) 62%, transparent)', boxShadow: 'inset 0 1px 0 var(--line)' }}>
        {NAV.map((n) => {
          const on = tab === n.key && !pushed;
          const c = on ? 'var(--accent)' : 'var(--faint)';
          return (
            <button key={n.key} onClick={() => goTab(n.key)} className="tm-tap" style={{ border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '2px 6px', flex: 1 }}>
              {Icon(n.icon, { size: 23, color: c, stroke: on ? 2.05 : 1.7 })}
              <span style={{ fontSize: 9.5, fontWeight: on ? 800 : 600, color: c }}>{n.label}</span>
            </button>
          );
        })}
      </nav>

      {toastShown && (
        <div key={toastShown.id} style={{ position: 'absolute', left: 20, right: 20, bottom: 104, zIndex: 70, display: 'flex', justifyContent: 'center',
          pointerEvents: 'none', animation: 'tmRise .35s cubic-bezier(.2,.8,.2,1) both' }}>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', padding: '11px 17px', borderRadius: 999,
            background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--line), 0 14px 34px -14px rgba(0,0,0,.55)' }}>
            {toastShown.msg}
          </span>
        </div>
      )}

      {sheet === 'checkin' &&<CheckInSheet guardianPath={creaturePath} onClose={() => setSheet(null)} onDone={(m) => { storeCheckin(m.key, m.energy); setSheet(null); }} />}
      {celebrate && <QuestComplete quest={celebrate} guardianName={(CREATURE_PATHS || []).find((p) => p.key === creaturePath)?.ko || '수호신'} onClose={() => { setCelebrate(null); setPulse((p) => p + 1); }} />}
      {showAvatar && <AvatarViewer stats={allStats} creaturePath={creaturePath} creatureAnimal={creatureAnimal} onSwapPath={pickPath} milestones={milestones} theme={theme} soldier={soldier} onClose={() => setShowAvatar(false)} />}

      <TweaksPanel>
        <TweakSection label="아이콘" />
        <TweakRadio label="두께" value={String(t.istroke)} options={['1.5', '1.75', '2.1']} onChange={(v) => setTweak('istroke', Number(v))} />
        <TweakSection label="연출 강도" />
        <TweakSlider label="게임성" value={t.game} min={0} max={100} step={10} unit="%" onChange={(v) => setTweak('game', v)} />
        <TweakSection label="스탯" />
        <TweakRadio label="색" value={t.statMode} options={['단색', '컬러']} onChange={(v) => setTweak('statMode', v)} />
        <TweakToggle label="오늘의 한 줄" value={t.showAi} onChange={(v) => setTweak('showAi', v)} />
      </TweaksPanel>
    </div>
  );
}
