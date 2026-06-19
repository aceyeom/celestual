// app-data.jsx — full content model for the DOLBOMI app. Extends window.DOLBOMI.
(function () {
const T = window.DOLBOMI;

// ── Tonight's quests (sized to a low-energy night) ─────────────
T.tonight = [
  { id: 'q1', stat: 'body',  txt: '팔굽혀펴기 50개',          min: 5,  xp: 3, done: false },
  { id: 'q2', stat: 'mind',  txt: '책 10페이지 읽기',          min: 10, xp: 2, done: false },
  { id: 'q3', stat: 'edge',  txt: '선임에게 자격증 추천받기',  min: 3,  xp: 4, done: false, hard: true },
];

// mood / energy options for the 60s check-in
T.moods = [
  { key: 'low',  emoji: '😮‍💨', label: '지친다' },
  { key: 'meh',  emoji: '😐',   label: '그저그럼' },
  { key: 'ok',   emoji: '🙂',   label: '괜찮아' },
  { key: 'good', emoji: '😤',   label: '의욕충전' },
];
T.energy = ['바닥', '낮음', '보통', '높음'];

// ── Opportunity Radar ──────────────────────────────────────────
T.opps = [
  { id: 'o1', cat: '대회', title: '육군창업경진대회', dday: 45, reward: '포상휴가 최대 7일', sub: 'K-스타트업 전국 본선 연계', stat: 'edge', hot: true,
    why: '입상 = 포상휴가. 네 아이디어로 휴가 따자.', steps: ['아이디어 한 줄 정리', '시장 조사 30분', '팀원 1명 찾기', '제출용 한 장 덱'] },
  { id: 'o2', cat: '자격증', title: '정보처리기능사', dday: 12, reward: '자격증 + 응시료 지원', sub: '자기개발비로 응시료 전액', stat: 'craft', hot: true,
    why: '분기 자기개발비 6만원 남음 → 응시료로 신청. 마감 D-12.', steps: ['필기 기출 1회분', '실기 환경 세팅', '응시 접수 (자기개발비)'] },
  { id: 'o3', cat: '대회', title: '여단 체력왕 선발', dday: 9, reward: '포상휴가 3일', sub: '3km 러닝 + 윗몸 + 팔굽', stat: 'body',
    why: '전투력 이미 62. 9일이면 충분히 노린다.', steps: ['3km 기록 측정', '주 4회 인터벌', '윗몸 2분 테스트'] },
  { id: 'o4', cat: '교육', title: '데이터 분석 입문 (군 e-러닝)', dday: 30, reward: '학점은행제 3학점', sub: '전역 후 편입·복학 인정', stat: 'craft',
    why: '시간 날 때 듣기만 해도 학점. 안 들으면 손해.', steps: ['1주차 강의 수강', '중간 퀴즈', '수료 인증'] },
  { id: 'o5', cat: '자격증', title: '한국사능력검정시험', dday: 20, reward: '공기업·공무원 가산점', sub: '심화 1급 목표', stat: 'mind',
    why: '전역 후 채용에 바로 쓰인다.', steps: ['기본서 1회독', '기출 3회분', '접수'] },
  { id: 'o6', cat: '채용', title: '청년 코딩 부트캠프 (전역 연계)', dday: 60, reward: '국비 지원 + 채용 연계', sub: '전역 직후 입과 가능', stat: 'craft',
    why: '전역하자마자 이어서. 공백 없이.', steps: ['사전 신청', '코딩 테스트 준비', '면접 일정 확인'] },
];
T.cat = {
  '대회':   { c: 'var(--accent)' },
  '자격증': { c: '#6fb1d6' },
  '교육':   { c: 'var(--olive)' },
  '채용':   { c: '#b89be0' },
};

// ── Vacation Engine (포상휴가) ─────────────────────────────────
T.vacation = {
  secured: 4,
  next: 7, // days to next milestone display
  pipeline: [
    { title: '육군창업경진대회 입상', days: 7, prog: 0.25, status: '진행 중' },
    { title: '여단 체력왕 선발', days: 3, prog: 0.6, status: '진행 중' },
    { title: '대대장 표창 (모범병사)', days: 2, prog: 0.4, status: '대기' },
    { title: '정보처리기능사 취득', days: 1, prog: 0.7, status: '진행 중' },
  ],
};

// 자기개발비 navigator
T.devFund = { quarterLeft: 60000, total: 120000, deadline: 12, suggest: '정보처리기능사 응시료' };

// ── AI companion conversation (분대장 AI / 말년 병장) ──────────
T.aiSeed = [
  { from: 'ai', text: '왔냐. 오늘 일지 봤다. 야간근무 끝나고도 책 폈더라.' },
  { from: 'ai', text: '근데 담력 스탯 2주째 그대로네. 자격증 추천받는 거 — 뭐가 무서워서 미루냐?' },
];
T.aiReplies = [
  '선임한테 말 거는 게 좀 부담돼요',
  '오늘 너무 지쳤어요',
  '알겠어요, 내일 바로 할게요',
];
T.aiAnswers = {
  '선임한테 말 거는 게 좀 부담돼요': '부담되는 게 정상이야. 근데 그게 바로 담력 스탯이 안 오르는 이유다. 딱 한 마디면 돼 — "병장님, 자격증 뭐 따셨어요?" 내일 점호 끝나고 던져봐.',
  '오늘 너무 지쳤어요': '그래. 오늘은 5분짜리만 해. 팔굽 50개면 충분하다. 지친 날 안 무너지는 게 진짜 실력이야. 내일 다시 가자.',
  '알겠어요, 내일 바로 할게요': '그래 그거면 됐다. 말년인 내가 보기엔 너 입대 때보다 확실히 달라졌어. 기록이 증명한다. 가서 자.',
};

// ── Squad (분대) ───────────────────────────────────────────────
T.squad = {
  name: '불꽃 7분대',
  members: [
    { name: '김도현', init: '김', me: true, done: 2, of: 3 },
    { name: '이준서', init: '이', done: 3, of: 3 },
    { name: '박민규', init: '박', done: 1, of: 3 },
    { name: '최우진', init: '최', done: 3, of: 3 },
    { name: '정해성', init: '정', done: 0, of: 3 },
    { name: '강태윤', init: '강', done: 2, of: 3 },
    { name: '윤상호', init: '윤', done: 3, of: 3 },
  ],
  challenge: { title: '이번 주 분대 챌린지', goal: '합산 퀘스트 100개', cur: 64, of: 100, reward: '분대 배너 「강철」' },
};

// ── Anonymous Wall (익명 고충 벽) ──────────────────────────────
T.wall = [
  { id: 'w1', text: '오늘 면회 못 왔다. 괜찮은 척 했는데 안 괜찮더라.', salutes: 47, ago: '12분 전', saluted: false },
  { id: 'w2', text: '전역한 친구가 취업했다고. 나만 멈춰있는 기분.', salutes: 128, ago: '38분 전', saluted: false },
  { id: 'w3', text: '그래도 오늘 운동 했다. 작은 거라도.', salutes: 92, ago: '1시간 전', saluted: false },
  { id: 'w4', text: '동기랑 싸웠다. 좁은 데서 부대끼니까 별게 다 크게 느껴진다.', salutes: 64, ago: '2시간 전', saluted: false },
];

// ── Titles (칭호) ──────────────────────────────────────────────
T.titles = [
  { name: '불굴', desc: '14일 연속 출석', rarity: '보유', owned: true, equipped: true },
  { name: '철벽', desc: '전투력 60 돌파', rarity: '보유', owned: true },
  { name: '정보처리 장인', desc: '정보처리기능사 취득', rarity: '보유', owned: true },
  { name: '새벽의 독서가', desc: '독서 퀘스트 30회', rarity: '보유', owned: true },
  { name: '분대의 기둥', desc: '분대 챌린지 3회 완료', rarity: '잠김', owned: false },
  { name: '심연의 담력', desc: '담력 60 돌파 (최고 난도)', rarity: '잠김', owned: false, legendary: true },
];

// ── Monthly Wrapped ────────────────────────────────────────────
T.wrapped = {
  month: '5월', quests: 42, topStat: { mil: '전투력', gain: 3 },
  savings: 640000, newTitle: '불굴', certs: 1, salutesGiven: 23,
  line: '이번 달, 너는 멈추지 않았다.',
  // weekly cadence (completed quests per week) — for the recap chart
  weekly: [6, 9, 11, 16],
  // per-stat XP gained this month — drives the recap breakdown bars
  gains: [
    { key: 'body', val: 3 }, { key: 'craft', val: 5 }, { key: 'money', val: 4 },
    { key: 'mind', val: 2 }, { key: 'people', val: 1 }, { key: 'edge', val: 2 },
  ],
};

// ── Activity log — the real running record (newest first) ──────
T.activity = [
  { day: '오늘',    time: '21:04', type: 'quest',  stat: 'craft',  text: '정보처리 필기 기출 1회독', xp: 12 },
  { day: '오늘',    time: '07:10', type: 'checkin', text: '오늘의 컨디션 체크인 · 의욕충전', streak: 14 },
  { day: '어제',    time: '22:31', type: 'money',  text: '국군적금 5월분 자동납입', amount: 400000 },
  { day: '어제',    time: '13:48', type: 'quest',  stat: 'body',   text: '체력단련 3km + 팔굽혀펴기', xp: 8 },
  { day: '5.27',   time: '20:15', type: 'title',  text: "칭호 획득 · 불굴", legendary: false },
  { day: '5.27',   time: '19:02', type: 'quest',  stat: 'mind',   text: '독서 30분 · 자기계발서', xp: 6 },
  { day: '5.25',   time: '18:40', type: 'milestone', text: '정보처리기능사 필기 접수 완료', opp: 'jeongcheo' },
  { day: '5.24',   time: '21:55', type: 'quest',  stat: 'edge',   text: '발표 자원 · 분대 브리핑', xp: 10 },
  { day: '5.22',   time: '12:10', type: 'cert',   text: '한국사능력검정 2급 합격', xp: 0 },
];

// ── Money Machine defaults ─────────────────────────────────────
T.money = { monthly: 400000, months: 10, matchRate: 0.71, base: 3120000 };

// ── Receipt extras ─────────────────────────────────────────────
T.receipt = {
  certs: ['정보처리기능사', '한국사 2급'],
  enlistStats: { body: 41, mind: 38, money: 12, craft: 30, people: 28, edge: 15 },
};

window.DOLBOMI = T;
})();
