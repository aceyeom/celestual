// data-catalog.jsx — the real Opportunity Catalog (spec Part 4) + Benefits Hub (Part 5)
// + derived Vacation Ladder. Rich enough to drive the detailed progress bar.
(function () {
const T = window.DOLBOMI;

// xp by size (opportunity sub-quests carry the ×1.5 real-stakes bonus, Part 2.2)
const XP = { S: 15, M: 38, L: 90 };
const sq = (id, text, size, stat, done, service) => ({ id, text, size, xp: XP[size], stat, done: !!done, service: service || null });

// ── catalog categories ─────────────────────────────────────────
T.cats = {
  금융:   { c: 'var(--positive)', icon: 'wallet' },
  자격증: { c: '#6FB4E0', icon: 'craft' },
  어학:   { c: '#6FB4E0', icon: 'graduation' },
  학점:   { c: '#9B8CF5', icon: 'book' },
  교육:   { c: '#9B8CF5', icon: 'graduation' },
  대회:   { c: 'var(--accent)', icon: 'flag' },
  체력:   { c: '#FF9F4A', icon: 'body' },
  정신:   { c: '#45C7C2', icon: 'mind' },
};

// helper to compute fill% from done sub-quests, weighted by xp
function fillOf(ms) {
  const all = ms.flatMap((m) => m.subquests);
  const tot = all.reduce((a, s) => a + s.xp, 0) || 1;
  const got = all.filter((s) => s.done).reduce((a, s) => a + s.xp, 0);
  return Math.round((got / tot) * 100);
}

// ── THE CATALOG ─────────────────────────────────────────────────
T.catalog = [
  // E1 · 육군창업경진대회 — flagship 휴가 hook (담력/edge)
  {
    id: 'startup', cat: '대회', stat: 'edge', title: '육군창업경진대회', hot: true,
    sub: 'K-스타트업 전국 본선 연계 · 2~5인 팀',
    what: '육군이 여는 창업 경진대회. 본선 수상하면 포상휴가에 상금, 창업멘토링캠프까지. 도전! K-스타트업 국가 파이프라인으로 이어진다.',
    eligibility: '육군 (장교·부사관·병) · 2~5인 팀 (단독 불가)',
    applyWhere: 'army-startup.co.kr', source: '육군본부 · army-startup.co.kr', verified: '2026.05',
    cost: '무료', dday: 45, started: true,
    reward: { kind: '휴가', finish: '+2~5일', label: '본선 수상 포상휴가 2~5일 + 상금', note: '부대 내규 · 본선 수상자 기준' },
    why: '입상 = 포상휴가. 네 아이디어로 휴가 따자.',
    expectedPct: 38, status: 'tight',
    milestones: [
      { id: 'm1', title: '아이디어 확정', date: '~D-40', subquests: [
        sq('s1', '아이디어 한 줄로 정리', 'S', 'edge', true),
        sq('s2', '비슷한 서비스 3개 시장조사', 'M', 'edge', true),
      ] },
      { id: 'm2', title: '팀 + 사업모델', date: '~D-25', subquests: [
        sq('s3', '팀원 1~4명 모으기', 'M', 'people', false),
        sq('s4', '사업모델 한 장(BMC) 작성', 'L', 'edge', false),
      ] },
      { id: 'm3', title: '제출', date: '~D-10', subquests: [
        sq('s5', '5분 발표영상 촬영', 'L', 'edge', false),
        sq('s6', '유튜브 업로드 + 예선 접수', 'M', 'edge', false, { name: 'army-startup.co.kr', kind: '접수', gov: true }),
        sq('s7', '본선 Q&A 리허설', 'M', 'people', false),
      ] },
    ],
  },
  // C1 · 정보처리산업기사 — 국방부 무료검정 (숙련도/craft)
  {
    id: 'jeongcheo', cat: '자격증', stat: 'craft', title: '정보처리산업기사', hot: true,
    sub: '국방부 위탁 무료검정 · 응시료 0원',
    what: '군이 직접 여는 무료 국가기술자격 검정. 필기·실기 모두 부대 안에서. 국가 자격증 + 이력서 한 줄 + 부대에 따라 포상휴가까지.',
    eligibility: '육·해·공·해병·국직·카투사·상근 현역',
    applyWhere: '국방부 위탁검정 · Q-Net', source: 'korea.kr · 위탁검정 안내', verified: '2026.04',
    cost: '무료 (위탁검정)', dday: 12, started: true,
    reward: { kind: 'cert', finish: '자격증', label: '국가기술자격 + 포상휴가 보통 2~5일', note: '포상휴가는 부대 내규' },
    why: '응시료 0원, 자격증은 평생 간다. 필기 D-12.',
    expectedPct: 60, status: 'tight',
    milestones: [
      { id: 'm1', title: '필기', date: 'D-12', subquests: [
        sq('s1', '종목·시험일 D-day 등록', 'S', 'craft', true),
        sq('s2', '소프트웨어설계 기출 1회분', 'M', 'craft', true),
        sq('s3', '데이터베이스 기출 1회분', 'M', 'craft', true),
        sq('s4', '프로그래밍언어 기출 1회분', 'M', 'craft', false),
        sq('s5', '필기 응시', 'L', 'craft', false),
      ] },
      { id: 'm2', title: '실기', date: 'D-48', subquests: [
        sq('s6', '실기 환경 세팅', 'M', 'craft', false),
        sq('s7', '실기 기출 2회분', 'L', 'craft', false),
        sq('s8', '실기 응시', 'L', 'craft', false),
      ] },
      { id: 'm3', title: '마무리', date: 'D-55', subquests: [
        sq('s9', '합격 확인 + 포상휴가 신청', 'S', 'craft', false),
      ] },
    ],
  },
  // C4 · TOEIC 900 — the referral flagship (어학/craft)
  {
    id: 'toeic', cat: '어학', stat: 'craft', title: 'TOEIC 900', hot: false,
    sub: '취업 필수 스펙 · 응시료 자기개발비',
    what: '이력서의 기본기. 매일 30분이면 전역 전에 충분히 만든다. 응시료는 자기개발비로 환급, 학습 앱은 제휴 링크로 연결.',
    eligibility: '전 군 공통',
    applyWhere: 'TOEIC 접수 · 학습 앱 제휴', source: 'ETS · 자기개발비 안내', verified: '2026.03',
    cost: '응시료 자기개발비 대상', dday: 35, started: true,
    reward: { kind: '휴가', finish: '+4~5일', label: '포상휴가 4~5일(부대 내규·보통 1회) + 취업 스펙', note: '어학 포상휴가는 부대별 상이·보통 어학당 1회' },
    why: '하루 30분이면 D-35에 900 가능. 페이스 좋아.',
    expectedPct: 42, status: 'on',
    milestones: [
      { id: 'm1', title: '진단 + 루틴', date: '~D-30', subquests: [
        sq('s1', '모의고사로 현재 점수 진단', 'M', 'craft', true),
        sq('s2', 'LC Part 2 30분', 'M', 'craft', true, { name: '산타토익', kind: '학습', gov: false }),
        sq('s3', 'RC Part 5 문법 30분', 'M', 'craft', false, { name: '산타토익', kind: '학습', gov: false }),
      ] },
      { id: 'm2', title: '실전', date: '~D-10', subquests: [
        sq('s4', '실전 모의고사 1회', 'L', 'craft', false),
        sq('s5', '오답 노트 정리', 'M', 'craft', false),
      ] },
      { id: 'm3', title: '응시', date: 'D-35', subquests: [
        sq('s6', '응시 접수 (자기개발비)', 'S', 'craft', false, { name: '나라사랑포털', kind: '환급', gov: true }),
      ] },
    ],
  },
  // C3 · 한국사능력검정 1급 (정신력/mind)
  {
    id: 'hanguksa', cat: '자격증', stat: 'mind', title: '한국사능력검정 1급', hot: false,
    sub: '공무원·공기업 가산점 · 문과 친화',
    what: '공무원·공기업 채용 가산점에 바로 쓰이는 국가 시험. 학습 부담이 낮아 군 생활 중에 따기 좋다.',
    eligibility: '전 군 공통',
    applyWhere: '국사편찬위원회', source: 'historyexam.go.kr', verified: '2026.04',
    cost: '응시료 자기개발비 대상', dday: 20, started: true,
    reward: { kind: '휴가', finish: '+2박3일', label: '포상휴가 흔히 2박3일 + 채용 가산점', note: '부대 내규' },
    why: '20일 남았는데 기출이 밀렸다. 페이스 끌어올려야 함.',
    expectedPct: 55, status: 'risk',
    milestones: [
      { id: 'm1', title: '개념', date: '~D-14', subquests: [
        sq('s1', '기본서 전근대 1회독', 'L', 'mind', true),
        sq('s2', '기본서 근현대 1회독', 'L', 'mind', false),
      ] },
      { id: 'm2', title: '기출', date: '~D-5', subquests: [
        sq('s3', '기출 1회분', 'M', 'mind', false),
        sq('s4', '기출 2회분', 'M', 'mind', false),
        sq('s5', '기출 3회분', 'M', 'mind', false),
      ] },
      { id: 'm3', title: '응시', date: 'D-20', subquests: [
        sq('s6', '시험 접수', 'S', 'mind', false),
      ] },
    ],
  },
  // M1 · 장병내일준비적금 (자산력/money)
  {
    id: 'jeokgeum', cat: '금융', stat: 'money', title: '장병내일준비적금', hot: false,
    sub: '정부가 원금 100% 매칭 · 전역일 ~2,000만',
    what: '정부가 납입 원금을 100% 얹어주는 군인 전용 적금. 비과세에 기본 이자까지. 전역까지 유지하면 매칭이 그대로 들어온다 — 안 하면 손해.',
    eligibility: '현역병·상근·사회복무 등 (1인, 최대 2계좌)',
    applyWhere: '은행 앱 (KB·IBK·NH 등) + 나라사랑카드', source: 'mnd.go.kr · 병무청', verified: '2026.05',
    cost: '무료', dday: 291, started: true,
    reward: { kind: 'money', finish: '~2,000만', label: '전역일 예상 ~2,000만 (정부 매칭 포함)', note: '만기(전역일)까지 유지 시' },
    why: '매달 납입만 유지하면 됨. 정부 돈 990만이 공짜로 따라온다.',
    expectedPct: 70, status: 'on',
    milestones: [
      { id: 'm1', title: '개설', date: '완료', subquests: [
        sq('s1', '나라사랑카드 확인', 'S', 'money', true),
        sq('s2', '적금 계좌 개설', 'M', 'money', true, { name: 'KB스타뱅킹', kind: '개설', gov: false }),
        sq('s3', '납입한도 55만 상향', 'S', 'money', true),
      ] },
      { id: 'm2', title: '유지', date: '매달', subquests: [
        sq('s4', '이번 달 납입 확인', 'S', 'money', false),
      ] },
      { id: 'm3', title: '만기', date: 'D-291', subquests: [
        sq('s5', '만기일(전역일) 추적', 'S', 'money', false),
      ] },
    ],
  },
  // B1 · 체력검정 특급 (전투력/body)
  {
    id: 'cheryeok', cat: '체력', stat: 'body', title: '여단 체력왕 선발', hot: false,
    sub: '3km 러닝 + 윗몸 + 팔굽 · 측정 D-9',
    what: '체력검정 특급은 여러 부대에서 포상휴가로 직결된다. 측정 가능한 세 종목을 사다리식으로 끌어올린다.',
    eligibility: '소속 부대 체력검정 대상',
    applyWhere: '부대 체력검정', source: '군인 휴가규정 · 부대 내규', verified: '2026.05',
    cost: '무료', dday: 9, started: true,
    reward: { kind: '휴가', finish: '+3일', label: '포상휴가 3일 (부대 내규)', note: '부대별 상이' },
    why: '전투력 이미 62. 9일이면 충분히 노린다.',
    expectedPct: 55, status: 'on',
    milestones: [
      { id: 'm1', title: '측정', date: 'D-9', subquests: [
        sq('s1', '3km 현재 기록 측정', 'M', 'body', true),
        sq('s2', '윗몸 2분 테스트', 'S', 'body', true),
      ] },
      { id: 'm2', title: '훈련', date: '~D-2', subquests: [
        sq('s3', '인터벌 러닝 (주 4회)', 'M', 'body', false),
        sq('s4', '팔굽혀펴기 루틴', 'S', 'body', false),
      ] },
      { id: 'm3', title: '검정', date: 'D-day', subquests: [
        sq('s5', '체력검정 응시', 'M', 'body', false),
      ] },
    ],
  },
  // C10 · 군 장병 SW·AI 교육 (구름 × 국방부) — 숙련도/craft
  {
    id: 'swai', cat: '자격증', stat: 'craft', title: '장병 SW·AI 역량강화', hot: true,
    sub: '구름(goorm) × 국방부 · 온라인 무료',
    what: '국방부와 구름이 함께 여는 장병 대상 SW·AI 무료 교육. 부대 안에서 온라인으로 수강하고, 수료증은 전역 후 IT 취업 포트폴리오로 직결된다.',
    eligibility: '현역 장병 (온라인 수강)',
    applyWhere: 'edu.goorm.io · 국방부 공지', source: '국방부 · goorm', verified: '2026.05',
    cost: '무료', dday: 28, started: true,
    reward: { kind: 'cert', finish: '수료증', label: 'SW·AI 수료증 + 포트폴리오', note: '취업 연계' },
    why: '시간 날 때 듣기만 해도 포트폴리오. IT 취업의 첫 줄.',
    expectedPct: 30, status: 'on',
    milestones: [
      { id: 'm1', title: '입문', date: '~D-22', subquests: [
        sq('s1', '계정 만들고 과정 등록', 'S', 'craft', true, { name: 'goorm EDU', kind: '등록', gov: false }),
        sq('s2', '1주차 강의 수강', 'M', 'craft', true),
        sq('s3', '2주차 강의 + 실습', 'M', 'craft', false),
      ] },
      { id: 'm2', title: '프로젝트', date: '~D-8', subquests: [
        sq('s4', '미니 프로젝트 제출', 'L', 'craft', false),
      ] },
      { id: 'm3', title: '수료', date: 'D-28', subquests: [
        sq('s5', '수료 인증 + 포트폴리오 정리', 'S', 'craft', false),
      ] },
    ],
  },
  // M4 · 청년미래적금 — 2026.06 신규 (자산력/money) · D-90 해금
  {
    id: 'cheongnyeon', cat: '금융', stat: 'money', title: '청년미래적금', hot: true,
    sub: '2026.06 신설 · 청년 자산형성 매칭', d90: true,
    what: '2026년 6월 출시된 청년 자산형성 적금. 일정 소득 이하 청년이 납입하면 정부가 비율로 매칭한다. 전역 직후(D-90 구간) 가입 자격을 확인하고 장병적금과 이어서 굴린다.',
    eligibility: '자격·소득 요건 충족 청년 (전역 후 확인)',
    applyWhere: '서민금융진흥원 · 은행 앱', source: '금융위 · 2026.06 시행', verified: '2026.06',
    cost: '무료', dday: 90, started: false,
    reward: { kind: 'money', finish: '+매칭', label: '정부 매칭 6%/12% (요건별)', note: '소득·자격 요건 확인 필수' },
    why: '전역하면 바로 자격 확인. 장병적금 → 청년미래적금으로 끊김 없이.',
    expectedPct: 0, status: 'on',
    milestones: [
      { id: 'm1', title: '자격 확인', date: 'D-90 해금', subquests: [
        sq('s1', '소득·연령 요건 셀프 체크', 'S', 'money', false),
        sq('s2', '필요 서류 확인', 'S', 'money', false),
      ] },
      { id: 'm2', title: '가입', date: '전역 후', subquests: [
        sq('s3', '은행 앱에서 가입', 'M', 'money', false, { name: '서민금융진흥원', kind: '가입', gov: true }),
      ] },
    ],
  },
  // T2 · 국민내일배움카드 — 전역 후 D-90 해금 (담력/edge: 진로 전환)
  {
    id: 'naeil', cat: '교육', stat: 'edge', title: '국민내일배움카드', hot: false,
    sub: '훈련비 국비 지원 · 전역 후 즉시', d90: true,
    what: '직업훈련비를 국가가 대주는 카드. 전역 직후(D-90 구간) 발급받아 코딩·디자인·자격증 부트캠프를 국비로 듣는다. 공백 없이 다음 스텝으로 점프하는 도약대.',
    eligibility: '구직자·재직자 등 (전역 후 발급)',
    applyWhere: 'HRD-Net · 고용센터', source: '고용노동부 · HRD-Net', verified: '2026.05',
    cost: '발급 무료 (훈련비 국비)', dday: 90, started: false,
    reward: { kind: 'cert', finish: '국비 훈련', label: '최대 수백만원 훈련비 지원', note: '훈련 과정·요건별 상이' },
    why: '전역 = 끝이 아니라 시작. 내일배움카드로 바로 부트캠프.',
    expectedPct: 0, status: 'on',
    milestones: [
      { id: 'm1', title: '발급', date: 'D-90 해금', subquests: [
        sq('s1', 'HRD-Net 가입 + 동영상 교육', 'M', 'edge', false, { name: 'HRD-Net', kind: '발급', gov: true }),
        sq('s2', '카드 신청', 'S', 'edge', false),
      ] },
      { id: 'm2', title: '훈련 선택', date: '전역 후', subquests: [
        sq('s3', '관심 과정 3개 비교', 'M', 'craft', false),
        sq('s4', '수강 신청', 'M', 'edge', false),
      ] },
    ],
  },
  // E6 · 국방 AI 활용 아이디어 경연 (담력/edge)
  {
    id: 'defai', cat: '대회', stat: 'edge', title: '국방 AI 아이디어 경연', hot: false,
    sub: '전군 대상 · AI 활용 아이디어',
    what: '국방 분야 AI 활용 아이디어를 겨루는 경연. 수상하면 포상휴가에 더해 군 SW·AI 교육과 이어진다. 기술과 담력을 한 번에.',
    eligibility: '전 군 공통 (개인·팀)',
    applyWhere: '국방부 공지 · 접수처', source: '국방부', verified: '2026.05',
    cost: '무료', dday: 52, started: false,
    reward: { kind: '휴가', finish: '+2~4일', label: '수상 포상휴가 2~4일 (부대 내규)', note: '부대 내규' },
    why: 'SW·AI 교육에서 배운 걸 바로 아이디어로. 입상하면 휴가.',
    expectedPct: 0, status: 'on',
    milestones: [
      { id: 'm1', title: '아이디어', date: '~D-40', subquests: [
        sq('s1', '국방 문제 1개 정하기', 'S', 'edge', false),
        sq('s2', 'AI 적용 방식 스케치', 'M', 'edge', false),
      ] },
      { id: 'm2', title: '제출', date: 'D-52', subquests: [
        sq('s3', '제안서 한 장 작성', 'L', 'edge', false),
        sq('s4', '접수', 'S', 'edge', false),
      ] },
    ],
  },
];

// finalize fill% from sub-quests + attach a real, topical photo per opportunity
const OPP_IMG = {
  startup: '1542744173-8e7e53415bb0', jeongcheo: '1498050108023-c5249f4df085',
  toeic: '1513258496099-48168024aec0', hanguksa: '1481627834876-b7833e8f5570',
  jeokgeum: '1551288049-bebda4e38f71', cheryeok: '1552674605-db6ffd4facb5',
  swai: '1461749280684-dccba630e2f6', cheongnyeon: '1460925895917-afdab827c52f',
  naeil: '1522071820081-009f0129c71c', defai: '1555066931-4365d14bab8c',
};
T.catalog.forEach((o) => {
  o.fill = fillOf(o.milestones);
  o.img = `https://images.unsplash.com/photo-${OPP_IMG[o.id] || OPP_IMG.startup}?w=720&h=420&fit=crop&q=72`;
});
T.oppById = (id) => T.catalog.find((o) => o.id === id);

// ── Vacation Ladder (휴가 사다리) — derived from 휴가-reward opps ─
T.vacation = {
  secured: 4,
  ladder: T.catalog.filter((o) => o.reward.kind === '휴가').map((o) => ({
    id: o.id, title: o.title, days: o.reward.finish, fill: o.fill, status: o.status, note: o.reward.note,
  })),
};

// ── Benefits Hub (Part 5) — self-filter, store nothing ─────────
T.benefits = [
  { id: 'b1', title: '장병내일준비적금', icon: 'wallet', tone: 'positive', value: '원금 100% 정부 매칭 → 전역일 ~2,000만',
    where: '은행 앱 + 나라사랑카드', tags: ['전군'], oppId: 'jeokgeum', headline: true },
  { id: 'b2', title: '자기개발비', icon: 'coins', tone: 'positive', value: '응시료·도서·강좌 80% 환급 · 연 최대 12만',
    where: '나라사랑포털 → 자기개발', tags: ['전군'], oppId: 'toeic' },
  { id: 'b3', title: '국가기술자격 무료검정', icon: 'craft', tone: 'accent', value: '~82개 종목 무료 응시 (위탁검정)',
    where: '국방부 위탁검정', tags: ['전군'], oppId: 'jeongcheo' },
  { id: 'b4', title: '대학 원격강좌 학점', icon: 'graduation', tone: 'accent', value: '학기당 6 / 연 12학점, 등록금 80% 환급',
    where: '나라사랑포털 → 군 e-러닝', tags: ['전군'] },
  { id: 'b5', title: '군 e-러닝 강좌', icon: 'book', tone: 'accent', value: '8,000+ 무료/할인 (어학·IT·자격증) + 전화영어',
    where: '나라사랑포털', tags: ['전군'] },
  { id: 'b6', title: '어학 응시료 할인', icon: 'graduation', tone: 'neutral', value: 'TOEIC 등 제휴 할인',
    where: '나라사랑포털 제휴', tags: ['전군'], oppId: 'toeic' },
  { id: 'b7', title: '나라사랑카드 혜택', icon: 'wallet', tone: 'neutral', value: '제휴 할인·포인트 적립',
    where: '카드 혜택', tags: ['전군'] },
  { id: 'b8', title: '제대군인·청년 지원', icon: 'briefcase', tone: 'neutral', value: '취업·정책 연계 (전역 후)',
    where: '셀프 필터 → 포털', tags: ['전역 D-90'] },
];
T.benefitFilters = { 군별: ['육군', '해군', '공군', '해병'], 관심: ['자격증', '금융', '어학', '체력', '창업'] };

window.DOLBOMI = T;
})();
