// dolbomi-data.jsx — shared data + icon set for all DOLBOMI home-screen skins.
// Attaches everything to window.DOLBOMI so each babel script can read it.

const DOLBOMI = {
  soldier: {
    name: '김도현',
    rank: '상병',
    rankEn: 'CPL',
    title: '불굴',          // 칭호
    unit: '제3보병사단',
    dday: 291,              // 전역까지
    served: 0.55,           // fraction of service complete
    streak: 14,
    savingsNow: 3120000,
    savingsProjected: 7840000,
    deltaMonth: 640000,
  },
  // 6 stats — military skin name + the real-life capability + now/target (The Gap)
  stats: [
    { key: 'body',   mil: '전투력', en: 'BODY',   real: '체력·건강',   cur: 62, tgt: 80 },
    { key: 'mind',   mil: '정신력', en: 'MIND',   real: '멘탈·집중',   cur: 55, tgt: 75 },
    { key: 'money',  mil: '자산력', en: 'MONEY',  real: '자산·금융',   cur: 48, tgt: 70 },
    { key: 'craft',  mil: '숙련도', en: 'CRAFT',  real: '기술·자격',   cur: 71, tgt: 90 },
    { key: 'people', mil: '지휘력', en: 'PEOPLE', real: '리더십·소통', cur: 40, tgt: 65 },
    { key: 'edge',   mil: '담력',   en: 'EDGE',   real: '용기·도전',   cur: 28, tgt: 60 },
  ],
  // Tonight's 3 — sized small for a low-energy night
  quests: [
    { stat: 'body', txt: '팔굽혀펴기 50개',        min: 5,  xp: 3 },
    { stat: 'mind', txt: '책 10페이지 읽기',         min: 10, xp: 2 },
    { stat: 'edge', txt: '선임에게 자격증 추천받기', min: 3,  xp: 4, hard: true },
  ],
  won(n) {
    return '₩' + n.toLocaleString('en-US');
  },
};

// Stat icons — simple line glyphs. icon(key, {size, color, stroke})
DOLBOMI.icon = function (key, { size = 20, color = 'currentColor', stroke = 1.8 } = {}) {
  const p = {
    fill: 'none', stroke: color, strokeWidth: stroke,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  const paths = {
    body: <g {...p}><path d="M3 9v6M21 9v6M6 7v10M18 7v10M6 12h12" /></g>,            // dumbbell
    mind: <g {...p}><path d="M12 3a6 6 0 0 0-6 6c0 2 1 3 1 5v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3c0-2 1-3 1-5a6 6 0 0 0-6-6Z" /><path d="M9.5 9.5l2 2 3-3.5" /></g>, // head + spark
    money: <g {...p}><circle cx="12" cy="12" r="9" /><path d="M8 8l4 6 4-6M9.2 12.4h5.6M9.2 14.6h5.6" /></g>, // ₩ coin
    craft: <g {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2.2 2.2M16.8 16.8 19 19M19 5l-2.2 2.2M7.2 16.8 5 19" /></g>, // gear
    people: <g {...p}><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 6.5a3 3 0 0 1 0 5.5M17 14.5a5.2 5.2 0 0 1 3.5 4.5" /></g>, // people
    edge: <g {...p}><path d="M12 3c1.5 3.5-1.5 4.5-1.5 7A3.2 3.2 0 0 0 12 13c1.2-1 1.2-2.5 1-3.2 1.8 1.3 3 3.2 3 5.4A4 4 0 0 1 12 21a4 4 0 0 1-4-4c0-3.8 2.5-5.2 4-7.8Z" /></g>, // flame
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      {paths[key]}
    </svg>
  );
};

// Bottom-nav glyphs. navIcon(key,{size,color,stroke,active})
DOLBOMI.navIcon = function (key, { size = 24, color = 'currentColor', stroke = 1.8 } = {}) {
  const p = { fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const g = {
    home:   <g {...p}><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z" /></g>,
    radar:  <g {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill={color} /><path d="M12 12l6-4" /></g>,
    ai:     <g {...p}><path d="M5 5h14v10H9l-4 4Z" /><path d="M12 8.5l.9 1.8 1.8.4-1.8.4-.9 1.8-.9-1.8-1.8-.4 1.8-.4Z" /></g>,
    squad:  <g {...p}><circle cx="8" cy="9" r="2.6" /><circle cx="16" cy="9" r="2.6" /><path d="M3.5 18a4.5 4.5 0 0 1 9 0M11.5 18a4.5 4.5 0 0 1 9 0" /></g>,
    profile:<g {...p}><circle cx="12" cy="8.5" r="3.4" /><path d="M5 19.5a7 7 0 0 1 14 0" /></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>{g[key]}</svg>;
};

DOLBOMI.nav = [
  { key: 'home', label: '홈' },
  { key: 'radar', label: '레이더' },
  { key: 'ai', label: 'AI' },
  { key: 'squad', label: '분대' },
  { key: 'profile', label: '프로필' },
];

window.DOLBOMI = DOLBOMI;
