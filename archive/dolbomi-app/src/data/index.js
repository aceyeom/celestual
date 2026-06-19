// DOLBOMI unified data module.
//
// This is the SINGLE SOURCE OF TRUTH for *reference* content (the opportunity
// catalog, benefits, titles, the quest pool) and the static UI config (moods,
// categories, filters). The Supabase reference tables are generated from this
// file by `scripts/gen-supabase-seed.mjs`, and it is also the offline fallback
// the store uses when no Supabase session is available.
//
// Per-user *mutable* state (a soldier's stats, tonight's quests, completion,
// streak, titles, activity) lives in Supabase, NOT here.

import { rawCatalog, rawQuestPool, INTERESTS, QUEST_INFO } from './catalog.js';

export { INTERESTS, QUEST_INFO, rawQuestPool };
// plain-language detail for a quest (detail bottom sheet) — keyed by txt
export const questInfoOf = (txt) => QUEST_INFO[txt] || null;

// ── Date helpers — D-day advances with real time ──────────────────────
const DAY = 86400000;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
export function daysUntil(iso, from = new Date()) {
  return Math.max(0, Math.round((startOfDay(iso) - startOfDay(from)) / DAY));
}
export function ddayLabel(iso, from = new Date()) {
  const n = daysUntil(iso, from);
  return n === 0 ? 'D-day' : `D-${n}`;
}
// 'YYYY-MM-DD' for the current Asia/Seoul day — matches profiles.last_checkin_date
export function seoulToday(from = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(from);
}

// ── Soldier profile (demo persona / offline fallback) ─────────────────
// Real users get their own profile from Supabase. `dday`/`served` are derived
// live from the discharge/enlist dates so they are never frozen (LOGIC-GAPS I2).
const ENLIST_DATE = '2025-06-10';
const DISCHARGE_DATE = '2027-03-28';
export function servedBetween(enlist = ENLIST_DATE, discharge = DISCHARGE_DATE, from = new Date()) {
  const a = startOfDay(enlist), b = startOfDay(discharge), now = startOfDay(from);
  const total = b - a;
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, (now - a) / total));
}
const servedFraction = servedBetween;

export const soldier = {
  name: '김도현',
  rank: '상병',
  rankEn: 'CPL',
  title: '불굴',
  unit: '제3보병사단',
  branch: '육군',
  mos: '정보',
  interests: ['coding', 'finance', 'fitness'],
  goal: 'career',
  onboarded: true, // the demo persona is fully set up; real accounts run the wizard
  role: 'user',
  enlistDate: ENLIST_DATE,
  dischargeDate: DISCHARGE_DATE,
  get dday() { return daysUntil(DISCHARGE_DATE); },
  get served() { return servedFraction(); },
  streak: 14,
};

// ── Enlisted ranks ────────────────────────────────────────────────────
export const RANKS = [
  { ko: '이병', en: 'PVT' }, { ko: '일병', en: 'PFC' },
  { ko: '상병', en: 'CPL' }, { ko: '병장', en: 'SGT' },
];

// ── Branches: service length, major units, enlisted 병과 ──────────────
// Drives the onboarding wizard. `units` are the major commands a soldier can
// pick (plus free-text 직접 입력); `mos` is the enlisted specialty list.
export const BRANCH_INFO = {
  육군: {
    serviceMonths: 18,
    units: [
      '제1보병사단', '제3보병사단', '제5보병사단', '제6보병사단', '제7보병사단',
      '제9보병사단', '제11기동사단', '제12보병사단', '제15보병사단', '제17보병사단',
      '제21보병사단', '제22보병사단', '제25보병사단', '제28보병사단', '수도기계화보병사단',
      '수도방위사령부', '특수전사령부', '제2신속대응사단', '육군훈련소',
    ],
    mos: ['보병', '포병', '기갑', '공병', '통신', '정보', '의무', '군사경찰', '운전', '취사', '행정', '정비', '화생방', '항공'],
  },
  해군: {
    serviceMonths: 20,
    units: ['제1함대', '제2함대', '제3함대', '잠수함사령부', '진해기지사령부', '인천해역방어사령부', '해군교육사령부', '해군작전사령부'],
    mos: ['갑판', '조타', '전탐', '음탐', '기관', '전기', '보수', '통신', '조리', '군사경찰', '행정', '보급'],
  },
  공군: {
    serviceMonths: 21,
    units: [
      '제1전투비행단', '제3훈련비행단', '제5공중기동비행단', '제8전투비행단', '제10전투비행단',
      '제11전투비행단', '제15특수임무비행단', '제16전투비행단', '제17전투비행단', '제18전투비행단',
      '제19전투비행단', '제20전투비행단', '공군교육사령부', '방공유도탄사령부', '방공관제사령부',
    ],
    mos: ['항공기정비', '항공무기정비', '방공포', '방공관제', '기상', '군사경찰', '급양', '운전', '행정', '통신전자', '보급수송', '의무'],
  },
  해병대: {
    serviceMonths: 18,
    units: ['해병대 제1사단', '해병대 제2사단', '해병대 제6여단', '연평부대', '해병대 교육훈련단', '해병대사령부'],
    mos: ['보병', '포병', '기갑', '상륙장갑차', '공병', '통신', '군사경찰', '행정', '운전', '정비', '의무'],
  },
};
export const BRANCHES = Object.keys(BRANCH_INFO);

// ── 6 stats ───────────────────────────────────────────────────────────
// `base` is the starting value a brand-new account gets (used by the Supabase
// new-user trigger); `cur` is the demo persona's value for the offline fallback.
// base = 0 on purpose: every pixel of a real user's bars is something they did.
// Primary names are plain everyday Korean (design revamp v2 V5) — the invented
// military vocabulary (전투력/지휘력/담력…) was a decoding tax on every screen.
export const stats = [
  { key: 'body',   mil: '체력', en: 'BODY',   real: '몸·건강',     cur: 62, tgt: 80, base: 0 },
  { key: 'mind',   mil: '정신', en: 'MIND',   real: '멘탈·집중',   cur: 55, tgt: 75, base: 0 },
  { key: 'money',  mil: '자산', en: 'MONEY',  real: '돈·금융',     cur: 48, tgt: 70, base: 0 },
  { key: 'craft',  mil: '기술', en: 'CRAFT',  real: '기술·자격증', cur: 71, tgt: 90, base: 0 },
  { key: 'people', mil: '관계', en: 'PEOPLE', real: '리더십·소통', cur: 40, tgt: 65, base: 0 },
  { key: 'edge',   mil: '도전', en: 'EDGE',   real: '용기·새로움', cur: 28, tgt: 60, base: 0 },
];
export const STAT_CAP = 100; // a stat's `cur` is clamped to this; six caps = 600 = top band

// ── Goal templates (전역 목표 아키타입) ────────────────────────────────
// Picked at onboarding; sets the per-stat discharge-day targets (`stats.tgt`)
// that draw the Gap on the profile Receipt. Individually adjustable later.
export const GOAL_TEMPLATES = [
  { key: 'career',  ko: '취업 준비형', icon: 'briefcase', desc: '자격증과 이력을 채워서 바로 일하러 가요',
    targets: { body: 50, mind: 70, money: 50, craft: 85, people: 75, edge: 60 } },
  { key: 'fitness', ko: '체력 단련형', icon: 'body', desc: '입대 전보다 강한 몸으로 나가요',
    targets: { body: 90, mind: 60, money: 40, craft: 50, people: 55, edge: 65 } },
  { key: 'asset',   ko: '자산 형성형', icon: 'wallet', desc: '통장과 금융 지식을 같이 채워요',
    targets: { body: 50, mind: 55, money: 90, craft: 60, people: 50, edge: 55 } },
  { key: 'founder', ko: '창업 도전형', icon: 'zap', desc: '아이디어를 실행으로 옮기는 연습을 해요',
    targets: { body: 55, mind: 65, money: 70, craft: 70, people: 70, edge: 90 } },
];
export const goalTemplateOf = (key) => GOAL_TEMPLATES.find((g) => g.key === key) || null;

export function won(n) {
  return '₩' + n.toLocaleString('en-US');
}

// ── Tonight's quests (starter set for a fresh account / offline) ───────
export const tonight = [
  { id: 'q1', stat: 'body',  txt: '팔굽혀펴기 50개',          min: 5,  xp: 3, done: false },
  { id: 'q2', stat: 'mind',  txt: '책 10페이지 읽기',          min: 10, xp: 2, done: false },
  { id: 'q3', stat: 'edge',  txt: '선임에게 자격증 추천받기',  min: 3,  xp: 4, done: false, hard: true },
];

// ── Quest pool — the check-in regenerates "오늘 밤의 3" from this by energy ──
// (LOGIC-GAPS B1/B3). Interest `tags` weight the picks toward what the
// soldier chose at onboarding. Mirrored into the Supabase `quest_pool` table.
export const questPool = rawQuestPool;

// ── Mood / energy ─────────────────────────────────────────────────────
export const moods = [
  { key: 'low',  emoji: '😮‍💨', label: '지쳤어요' },
  { key: 'meh',  emoji: '😐',   label: '그저 그래요' },
  { key: 'ok',   emoji: '🙂',   label: '괜찮아요' },
  { key: 'good', emoji: '😤',   label: '힘이 나요' },
];
export const energy = ['바닥', '낮음', '보통', '높음'];

// ── Catalog categories ────────────────────────────────────────────────
export const cats = {
  금융:   { c: 'var(--positive)', icon: 'wallet' },
  자격증: { c: '#6FB4E0', icon: 'craft' },
  어학:   { c: '#6FB4E0', icon: 'graduation' },
  학점:   { c: '#9B8CF5', icon: 'book' },
  교육:   { c: '#9B8CF5', icon: 'graduation' },
  대회:   { c: 'var(--accent)', icon: 'flag' },
  체력:   { c: '#FF9F4A', icon: 'body' },
  취업:   { c: '#5BC4A0', icon: 'briefcase' },
  창업:   { c: '#E78A5A', icon: 'zap' },
};

// ── Opportunity Catalog ───────────────────────────────────────────────
// The full 40-entry catalog lives in ./catalog.js (rawCatalog). Each entry
// carries an absolute `deadline` so D-day decrements with real time, and
// `unlockDday` (90) marks post-discharge prep that only opens inside the
// D-90 window (LOGIC-GAPS I3 gating). `tags` reference INTERESTS keys.

function fillOf(ms) {
  const all = ms.flatMap((m) => m.subquests);
  const tot = all.reduce((a, s) => a + s.xp, 0) || 1;
  const got = all.filter((s) => s.done).reduce((a, s) => a + s.xp, 0);
  return Math.round((got / tot) * 100);
}

// deterministic image for entries without one (community / user-created)
const IMG_POOL = [
  '1542744173-8e7e53415bb0', '1498050108023-c5249f4df085', '1513258496099-48168024aec0',
  '1481627834876-b7833e8f5570', '1551288049-bebda4e38f71', '1552674605-db6ffd4facb5',
  '1461749280684-dccba630e2f6', '1460925895917-afdab827c52f', '1522071820081-009f0129c71c',
  '1555066931-4365d14bab8c',
];
const imgUrl = (photoId) => `https://images.unsplash.com/photo-${photoId}?w=720&h=420&fit=crop&q=72`;
export function fallbackImg(id) {
  let h = 0;
  for (let i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) >>> 0;
  return imgUrl(IMG_POOL[h % IMG_POOL.length]);
}

// Finalize derived fields (fill%, live dday, img)
export const catalog = rawCatalog.map((o) => ({
  ...o,
  fill: fillOf(o.milestones),
  dday: daysUntil(o.deadline),
  img: o.imgId ? imgUrl(o.imgId) : fallbackImg(o.id),
}));
export const oppById = (id) => catalog.find((o) => o.id === id);

// Radar filter chips — derived, so every category that exists in the catalog
// is filterable (LOGIC-GAPS I1).
export const radarCats = ['전체', ...new Set(catalog.map((o) => o.cat))];

// ── Vacation Ladder (offline fallback) ────────────────────────────────
// `secured` now reflects only fully-completed vacation opportunities — no
// constant fallback (LOGIC-GAPS H1). maxDays comes from each opp's reward, the
// single source of truth (LOGIC-GAPS H2).
function securedDays(cat = catalog) {
  return cat
    .filter((o) => o.reward.kind === '휴가')
    .reduce((n, o) => {
      const allDone = o.milestones.every((m) => m.subquests.every((s) => s.done));
      return n + (allDone ? (o.reward.maxDays || 0) : 0);
    }, 0);
}
export const vacation = {
  secured: securedDays(),
  ladder: catalog.filter((o) => o.reward.kind === '휴가').map((o) => ({
    id: o.id, title: o.title, days: o.reward.finish, fill: o.fill, status: o.status, note: o.reward.note,
  })),
};

// ── Benefits Hub ──────────────────────────────────────────────────────
// `branches` drives the branch filter (LOGIC-GAPS F6). '전군' matches every branch.
export const benefits = [
  { id: 'b1', title: '장병내일준비적금', icon: 'wallet', tone: 'positive', value: '원금 100% 정부 매칭 → 전역일 ~2,000만',
    where: '은행 앱 + 나라사랑카드', branches: ['전군'], oppId: 'jeokgeum', headline: true },
  { id: 'b2', title: '자기개발비', icon: 'coins', tone: 'positive', value: '응시료·도서·강좌 80% 환급 · 연 최대 12만',
    where: '나라사랑포털 → 자기개발', branches: ['전군'], oppId: 'toeic' },
  { id: 'b3', title: '국가기술자격 무료검정', icon: 'craft', tone: 'accent', value: '~82개 종목 무료 응시 (위탁검정)',
    where: '국방부 위탁검정', branches: ['전군'], oppId: 'jeongcheo' },
  { id: 'b4', title: '대학 원격강좌 학점', icon: 'graduation', tone: 'accent', value: '학기당 6 / 연 12학점, 등록금 80% 환급',
    where: '나라사랑포털 → 군 e-러닝', branches: ['전군'] },
  { id: 'b5', title: '군 e-러닝 강좌', icon: 'book', tone: 'accent', value: '8,000+ 무료/할인 (어학·IT·자격증) + 전화영어',
    where: '나라사랑포털', branches: ['전군'] },
  { id: 'b6', title: '어학 응시료 할인', icon: 'graduation', tone: 'neutral', value: 'TOEIC 등 제휴 할인',
    where: '나라사랑포털 제휴', branches: ['전군'], oppId: 'toeic' },
  { id: 'b7', title: '나라사랑카드 혜택', icon: 'wallet', tone: 'neutral', value: '제휴 할인·포인트 적립',
    where: '카드 혜택', branches: ['전군'] },
  { id: 'b8', title: '해군 함정근무 가산점', icon: 'shield', tone: 'neutral', value: '함정 근무일 비례 자기개발 가산',
    where: '해군 인사근무', branches: ['해군'] },
  { id: 'b9', title: '공군 어학특기 우대', icon: 'graduation', tone: 'neutral', value: '어학 성적 보직·교육 우대',
    where: '공군 인사', branches: ['공군'] },
  { id: 'b10', title: '해병대 특수전 수당', icon: 'medal', tone: 'neutral', value: '특수 임무 수당·포상휴가 연계',
    where: '해병대 인사', branches: ['해병대'] },
  { id: 'b11', title: '제대군인·청년 지원', icon: 'briefcase', tone: 'neutral', value: '취업·정책 연계 (전역 후)',
    where: '셀프 필터 → 포털', branches: ['전군'] },
];

// ── Titles (칭호) ─────────────────────────────────────────────────────
// `req` drives automatic awarding (LOGIC-GAPS J1). Mirrored into Supabase
// `titles` and evaluated by the award_titles() SQL routine.
//   { kind:'stat', stat, val } | { kind:'streak', val } | { kind:'total', val } | { kind:'manual' }
export const titles = [
  { name: '첫 걸음', desc: '총 경험치 10 — 시작했다', rarity: '보유', req: { kind: 'total', val: 10 } },
  { name: '불굴', desc: '14일 연속 출석', rarity: '보유', req: { kind: 'streak', val: 14 } },
  { name: '철벽', desc: '전투력 60 돌파', rarity: '보유', req: { kind: 'stat', stat: 'body', val: 60 } },
  { name: '숙련의 증표', desc: '숙련도 70 돌파', rarity: '보유', req: { kind: 'stat', stat: 'craft', val: 70 } },
  { name: '새벽의 독서가', desc: '정신력 60 돌파', rarity: '보유', req: { kind: 'stat', stat: 'mind', val: 60 } },
  { name: '분대의 기둥', desc: '지휘력 55 돌파', rarity: '잠김', req: { kind: 'stat', stat: 'people', val: 55 } },
  { name: '정예', desc: '총 경험치 300 · 정예 진화', rarity: '잠김', req: { kind: 'total', val: 300 } },
  { name: '수호신의 주인', desc: '총 경험치 480 · 최종 진화', rarity: '잠김', req: { kind: 'total', val: 480 } },
  { name: '심연의 담력', desc: '담력 60 돌파 (최고 난도)', rarity: '잠김', legendary: true, req: { kind: 'stat', stat: 'edge', val: 60 } },
];

// Title ownership for the OFFLINE persona (online users earn these by logic).
const OFFLINE_OWNED = { '첫 걸음': true, '불굴': true, '철벽': true, '숙련의 증표': true };
export const offlineTitles = titles.map((t) => ({
  name: t.name, desc: t.desc, rarity: t.rarity, legendary: !!t.legendary,
  owned: !!OFFLINE_OWNED[t.name], equipped: t.name === soldier.title,
}));

// ── Monthly Wrapped (recap copy; the live values are derived from activity) ──
export const wrapped = {
  month: '5월', topStat: { mil: '전투력', gain: 3 },
  newTitle: '불굴', line: '이번 달, 너는 멈추지 않았다.',
  weekly: [6, 9, 11, 16],
  gains: [
    { key: 'body', val: 3 }, { key: 'craft', val: 5 }, { key: 'money', val: 4 },
    { key: 'mind', val: 2 }, { key: 'people', val: 1 }, { key: 'edge', val: 2 },
  ],
};

// ── Activity log (offline fallback) ───────────────────────────────────
export const activity = [
  { day: '오늘',  time: '21:04', type: 'quest',  stat: 'craft',  text: '정보처리 필기 기출 1회독', xp: 12 },
  { day: '오늘',  time: '07:10', type: 'checkin', text: '오늘의 컨디션 체크인 · 의욕충전', streak: 14 },
  { day: '어제',  time: '13:48', type: 'quest',  stat: 'body',   text: '체력단련 3km + 팔굽혀펴기', xp: 8 },
  { day: '5.27',  time: '20:15', type: 'title',  text: '칭호 획득 · 불굴', legendary: false },
  { day: '5.27',  time: '19:02', type: 'quest',  stat: 'mind',   text: '독서 30분 · 자기계발서', xp: 6 },
  { day: '5.25',  time: '18:40', type: 'milestone', text: '정보처리기능사 필기 접수 완료', opp: 'jeongcheo' },
  { day: '5.24',  time: '21:55', type: 'quest',  stat: 'edge',   text: '발표 자원 · 분대 브리핑', xp: 10 },
  { day: '5.22',  time: '12:10', type: 'cert',   text: '한국사능력검정 2급 합격', xp: 0 },
];

// ── Benefit filters ───────────────────────────────────────────────────
export const benefitFilters = {
  군별: ['전군', '육군', '해군', '공군', '해병대'],
};
