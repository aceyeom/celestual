// app-shell.jsx — App shell: palettes, tab router, push-nav, overlays, tweaks.
(function () {
const { Icon, ScreenHead } = window.TU;
const T = window.DOLBOMI;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "골드",
  "theme": "다크",
  "creaturePath": "해치",
  "creatureAnimal": "숫양",
  "istroke": 1.75,
  "game": 20,
  "statMode": "단색",
  "showAi": true
}/*EDITMODE-END*/;

const PAL_MAP = { '골드': 'gold', '택티컬': 'green', '스틸': 'steel' };
const PATH_MAP = { '해치': 'haechi', '청룡': 'dragon', '봉황': 'phoenix', '백호': 'tiger' };
const PATH_KO = { haechi: '해치', dragon: '청룡', phoenix: '봉황', tiger: '백호' };
// identity now drives the body — there is no separate Fox/Ram toggle.
const ANIMAL_FOR_PATH = { haechi: 'ram', dragon: 'fox', phoenix: 'ram', tiger: 'fox' };

const NAV = [
  { key: 'home', label: '홈', icon: 'home' },
  { key: 'radar', label: '기회', icon: 'target' },
  { key: 'vacation', label: '휴가', icon: 'palm' },
  { key: 'benefits', label: '혜택', icon: 'shieldGift' },
  { key: 'profile', label: '프로필', icon: 'user' },
];
const TAB_TITLES = { home: '', radar: '기회 레이더', vacation: '휴가 사다리', benefits: '혜택', profile: '프로필' };

function App({ theme: themeProp, setTheme: setThemeProp }) {
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = React.useState('home');
  const [pushed, setPushed] = React.useState(null);
  const [sheet, setSheet] = React.useState(null);
  const [celebrate, setCelebrate] = React.useState(null);
  const [showAvatar, setShowAvatar] = React.useState(false);
  const [quests, setQuests] = React.useState(T.tonight);
  const [mood, setMood] = React.useState(null);
  const [pulse, setPulse] = React.useState(0);
  // working milestone state per opportunity (shared by detail + plan screens)
  const [oppMs, setOppMs] = React.useState({});
  const getMs = (o) => oppMs[o.id] || o.milestones.map((m) => ({ ...m, subquests: m.subquests.map((s) => ({ ...s })) }));
  const toggleSub = (oppId, mid, sid, verified) => setOppMs((prev) => {
    const o = T.oppById(oppId);
    const base = prev[oppId] || o.milestones.map((m) => ({ ...m, subquests: m.subquests.map((s) => ({ ...s })) }));
    const next = base.map((m) => m.id !== mid ? m : ({ ...m, subquests: m.subquests.map((s) => s.id !== sid ? s : ({ ...s, done: !s.done, verified: !s.done ? !!verified : false })) }));
    return { ...prev, [oppId]: next };
  });

  const statMode = t.statMode === '컬러' ? 'color' : 'mono';
  const theme = (t.theme === '라이트') ? 'light' : 'dark';
  const creaturePath = PATH_MAP[t.creaturePath] || 'haechi';
  const creatureAnimal = ANIMAL_FOR_PATH[creaturePath] || 'ram';
  // tapping the background guardian swaps it to the front (selects its path)
  const swapToPath = (key) => setTweak('creaturePath', PATH_KO[key] || '해치');

  // keep the iOS bezel + status bar in sync with the in-app theme
  React.useEffect(() => { if (setThemeProp) setThemeProp(theme); }, [theme]);

  // milestones achieved → orbiting ornaments on the guardian
  const milestones = React.useMemo(() => {
    const cat = (T.catalog || []).reduce((n, o) =>
      n + o.milestones.filter((m) => m.subquests.every((s) => s.done)).length, 0);
    return cat + quests.filter((q) => q.done).length;
  }, [quests]);

  const toggleQuest = (id) => setQuests((qs) => qs.map((q) => {
    if (q.id !== id) return q;
    const nd = !q.done; if (nd) { setCelebrate(q); }
    return { ...q, done: nd };
  }));

  const goTab = (k) => { setPushed(null); setTab(k); };
  const openOpp = (o) => setPushed({ type: 'opp', data: o });
  const openPlan = (o) => setPushed({ type: 'oppPlan', data: o });
  const makeQuest = (oppId) => { const o = T.oppById(oppId); if (o) setPushed({ type: 'opp', data: o }); };

  // active tab screen
  let screen = null;
  if (tab === 'home') screen = <window.HomeScreen soldier={T.soldier} stats={T.stats} quests={quests} statMode={statMode} mood={mood} showAi={t.showAi} onToggleQuest={toggleQuest} onOpenCheckin={() => setSheet('checkin')} creaturePath={creaturePath} theme={theme} pulseSignal={pulse} milestones={milestones} onPickPath={(v) => setTweak('creaturePath', v)} onOpenOpp={makeQuest} onOpenAvatar={() => setShowAvatar(true)} />;
  else if (tab === 'radar') screen = <window.RadarScreen onOpenOpp={openOpp} />;
  else if (tab === 'vacation') screen = <window.VacationScreen onOpenOpp={openOpp} />;
  else if (tab === 'benefits') screen = <window.BenefitsScreen onMakeQuest={makeQuest} />;
  else if (tab === 'profile') screen = <window.ProfileScreen soldier={T.soldier} stats={T.stats} statMode={statMode} onOpen={(k) => setPushed({ type: k })} creaturePath={creaturePath} creatureAnimal={creatureAnimal} milestones={milestones} pulseSignal={pulse} onPickPath={(v) => setTweak('creaturePath', v)} onOpenOpp={makeQuest} onOpenAvatar={() => setShowAvatar(true)} />;

  // pushed content
  let pushContent = null, pushTitle = '';
  if (pushed) {
    if (pushed.type === 'opp') { pushContent = <window.OppDetail o={pushed.data} ms={getMs(pushed.data)} onOpenPlan={() => openPlan(pushed.data)} onAddTonight={() => { setPushed(null); setTab('home'); }} />; pushTitle = '기회 상세'; }
    else if (pushed.type === 'oppPlan') { pushContent = <window.OppPlan o={pushed.data} ms={getMs(pushed.data)} onToggle={(mid, sid, v) => toggleSub(pushed.data.id, mid, sid, v)} onAddTonight={() => { setPushed(null); setTab('home'); }} />; pushTitle = '전체 계획'; }
    else if (pushed.type === 'wrapped') { pushContent = <window.Wrapped />; pushTitle = '월간 결산'; }
  }

  const tabTitle = TAB_TITLES[tab];

  return (
    <div className="dolbomi" data-pal={PAL_MAP[t.palette] || 'gold'} data-theme={theme}
      style={{ '--game': (t.game ?? 20) / 100, '--istroke': t.istroke ?? 1.75, height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ambient glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 240, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(90% 60% at 50% -12%, rgba(var(--accent-rgb), calc(.10 * (var(--game) + .4))), transparent 66%)' }} />

      <main style={{ position: 'relative', flex: 1, overflow: 'hidden', zIndex: 1 }}>
        <div key={tab} style={{ position: 'absolute', inset: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '56px 20px 0' }}>
          {tabTitle && <ScreenHead title={tabTitle} />}
          {screen}
          <div style={{ height: 104 }} />
        </div>

        {pushed && (
          <div key={pushed.type + (pushed.data ? pushed.data.id : '')} style={{ position: 'absolute', inset: 0, overflowY: 'auto', padding: '56px 20px 0', background: 'var(--bg)', zIndex: 5, animation: 'tmSlideIn .3s cubic-bezier(.2,.8,.2,1)' }}>
            <ScreenHead title={pushTitle} onBack={() => setPushed(null)} />
            {pushContent}
            <div style={{ height: 104 }} />
          </div>
        )}
      </main>

      {/* bottom tab bar */}
      <nav style={{ position: 'relative', zIndex: 20, display: 'flex', justifyContent: 'space-between', padding: '10px 18px 26px',
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

      {/* overlays */}
      {sheet === 'checkin' && <window.CheckInSheet onClose={() => setSheet(null)} onDone={(m) => { setMood(m); setSheet(null); }} />}
      {celebrate && <window.QuestComplete quest={celebrate} guardianName={(window.CREATURE_PATHS || []).find((p) => p.key === creaturePath)?.ko || '수호신'} onClose={() => { setCelebrate(null); setPulse((p) => p + 1); }} />}
      {showAvatar && <window.AvatarViewer stats={T.stats} creaturePath={creaturePath} creatureAnimal={creatureAnimal} onSwapPath={swapToPath} milestones={milestones} theme={theme} soldier={T.soldier} onClose={() => setShowAvatar(false)} />}

      {/* Tweaks */}
      <window.TweaksPanel>
        <window.TweakSection label="테마 · 팔레트" />
        <window.TweakRadio label="모드" value={t.theme} options={["다크", "라이트"]} onChange={(v) => setTweak('theme', v)} />
        <window.TweakRadio label="색" value={t.palette} options={["골드", "택티컬", "스틸"]} onChange={(v) => setTweak('palette', v)} />
        <window.TweakSection label="수호신" />
        <window.TweakSelect label="수호신 / 길" value={t.creaturePath} options={["해치", "청룡", "봉황", "백호"]} onChange={(v) => setTweak('creaturePath', v)} />
        <window.TweakSection label="아이콘" />
        <window.TweakRadio label="두께" value={String(t.istroke)} options={["1.5", "1.75", "2.1"]} onChange={(v) => setTweak('istroke', Number(v))} />
        <window.TweakSection label="연출 강도" />
        <window.TweakSlider label="게임성" value={t.game} min={0} max={100} step={10} unit="%" onChange={(v) => setTweak('game', v)} />
        <window.TweakSection label="스탯" />
        <window.TweakRadio label="색" value={t.statMode} options={["단색", "컬러"]} onChange={(v) => setTweak('statMode', v)} />
        <window.TweakToggle label="오늘의 한 줄" value={t.showAi} onChange={(v) => setTweak('showAi', v)} />
      </window.TweaksPanel>
    </div>
  );
}

window.DolbomiApp = App;
})();
