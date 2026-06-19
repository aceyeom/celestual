// DOLBOMI expanded catalog module.
//
// RAW reference content for the opportunity radar: the full 40-entry
// opportunity catalog (`rawCatalog`), the expanded nightly quest pool
// (`rawQuestPool`), and the interest taxonomy (`INTERESTS`) that powers
// onboarding personalization and quest/opportunity matching.
//
// Entries here are *raw*: no derived fields (fill%, live dday, img URL).
// `imgId` is an unsplash photo id; consumers build the URL themselves.
// `tags` reference INTERESTS keys. `unlockDday: 90` marks post-discharge
// prep that only opens inside the D-90 window. Deadlines are absolute ISO
// dates so D-day decrements with real time. Reward days vary by unit —
// where they do, we say '부대 내규' and stay conservative.

// ── XP helpers (same scale as data/index.js) ──────────────────────────
const XP = { S: 15, M: 38, L: 90 };
const sq = (id, text, size, stat, done, service) => ({
  id, text, size, xp: XP[size], stat, done: !!done, service: service || null,
});

// ── Opportunity Catalog (40) ──────────────────────────────────────────
export const rawCatalog = [
  // ── 기존 10 (data/index.js에서 이관 · 진행 플래그 초기화) ──────────
  {
    id: 'startup', cat: '대회', stat: 'edge', title: '육군창업경진대회', hot: true,
    sub: 'K-스타트업 전국 본선 연계 · 2~5인 팀', deadline: '2026-07-25',
    what: '육군이 여는 창업 경진대회. 본선 수상하면 포상휴가에 상금, 창업멘토링캠프까지.',
    eligibility: '육군 (장교·부사관·병) · 2~5인 팀 (단독 불가)',
    applyWhere: 'army-startup.co.kr', source: '육군본부 · army-startup.co.kr', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: '휴가', finish: '+2~5일', maxDays: 5, label: '본선 수상 포상휴가 2~5일 + 상금', note: '부대 내규 · 본선 수상자 기준' },
    why: '입상 = 포상휴가. 네 아이디어로 휴가 따자.',
    expectedPct: 38, status: 'tight',
    tags: ['startup'], imgId: '1542744173-8e7e53415bb0',
    milestones: [
      { id: 'm1', title: '아이디어 확정', date: '~D-40', subquests: [
        sq('s1', '아이디어 한 줄로 정리', 'S', 'edge', false),
        sq('s2', '비슷한 서비스 3개 시장조사', 'M', 'edge', false),
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
  {
    id: 'jeongcheo', cat: '자격증', stat: 'craft', title: '정보처리산업기사', hot: true,
    sub: '국방부 위탁 무료검정 · 응시료 0원', deadline: '2026-06-22',
    what: '군이 직접 여는 무료 국가기술자격 검정. 필기·실기 모두 부대 안에서.',
    eligibility: '육·해·공·해병·국직·카투사·상근 현역',
    applyWhere: '국방부 위탁검정 · Q-Net', source: 'korea.kr · 위탁검정 안내', verified: '2026.04',
    cost: '무료 (위탁검정)', started: false,
    reward: { kind: 'cert', finish: '자격증', label: '국가기술자격 + 포상휴가 보통 2~5일', note: '포상휴가는 부대 내규' },
    why: '응시료 0원, 자격증은 평생 간다. 필기 임박.',
    expectedPct: 60, status: 'tight',
    tags: ['coding', 'cert_tech'], imgId: '1498050108023-c5249f4df085',
    milestones: [
      { id: 'm1', title: '필기', date: 'D-12', subquests: [
        sq('s1', '종목·시험일 D-day 등록', 'S', 'craft', false),
        sq('s2', '소프트웨어설계 기출 1회분', 'M', 'craft', false),
        sq('s3', '데이터베이스 기출 1회분', 'M', 'craft', false),
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
  {
    id: 'toeic', cat: '어학', stat: 'craft', title: 'TOEIC 900', hot: false,
    sub: '취업 필수 스펙 · 응시료 자기개발비', deadline: '2026-07-15',
    what: '이력서의 기본기. 매일 30분이면 전역 전에 충분히 만든다.',
    eligibility: '전 군 공통',
    applyWhere: 'TOEIC 접수 · 학습 앱 제휴', source: 'ETS · 자기개발비 안내', verified: '2026.03',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: '휴가', finish: '+4~5일', maxDays: 5, label: '포상휴가 4~5일(부대 내규) + 취업 스펙', note: '어학 포상휴가는 부대별 상이' },
    why: '하루 30분이면 900 가능. 페이스 좋아.',
    expectedPct: 42, status: 'on',
    tags: ['language', 'career'], imgId: '1513258496099-48168024aec0',
    milestones: [
      { id: 'm1', title: '진단 + 루틴', date: '~D-30', subquests: [
        sq('s1', '모의고사로 현재 점수 진단', 'M', 'craft', false),
        sq('s2', 'LC Part 2 30분', 'M', 'craft', false, { name: '산타토익', kind: '학습', gov: false }),
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
  {
    id: 'hanguksa', cat: '자격증', stat: 'mind', title: '한국사능력검정 1급', hot: false,
    sub: '공무원·공기업 가산점 · 문과 친화', deadline: '2026-06-30',
    what: '공무원·공기업 채용 가산점에 바로 쓰이는 국가 시험.',
    eligibility: '전 군 공통',
    applyWhere: '국사편찬위원회', source: 'historyexam.go.kr', verified: '2026.04',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: '휴가', finish: '+2박3일', maxDays: 3, label: '포상휴가 흔히 2박3일 + 채용 가산점', note: '부대 내규' },
    why: '기출이 밀렸다. 페이스 끌어올려야 함.',
    expectedPct: 55, status: 'risk',
    tags: ['civil_exam', 'cert_tech'], imgId: '1481627834876-b7833e8f5570',
    milestones: [
      { id: 'm1', title: '개념', date: '~D-14', subquests: [
        sq('s1', '기본서 전근대 1회독', 'L', 'mind', false),
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
  {
    id: 'jeokgeum', cat: '금융', stat: 'money', title: '장병내일준비적금', hot: false,
    sub: '정부가 원금 100% 매칭 · 전역일 ~2,000만', deadline: '2027-03-28',
    what: '정부가 납입 원금을 100% 얹어주는 군인 전용 적금. 비과세에 기본 이자까지.',
    eligibility: '현역병·상근·사회복무 등 (1인, 최대 2계좌)',
    applyWhere: '은행 앱 (KB·IBK·NH 등) + 나라사랑카드', source: 'mnd.go.kr · 병무청', verified: '2026.05',
    cost: '무료', started: true,
    reward: { kind: 'money', finish: '~2,000만', label: '전역일 예상 ~2,000만 (정부 매칭 포함)', note: '만기(전역일)까지 유지 시' },
    why: '매달 납입만 유지하면 됨. 정부 돈 990만이 공짜로 따라온다.',
    expectedPct: 70, status: 'on',
    tags: ['finance'], imgId: '1551288049-bebda4e38f71',
    milestones: [
      { id: 'm1', title: '개설', date: '완료', subquests: [
        sq('s1', '나라사랑카드 확인', 'S', 'money', false),
        sq('s2', '적금 계좌 개설', 'M', 'money', false, { name: 'KB스타뱅킹', kind: '개설', gov: false }),
        sq('s3', '납입한도 55만 상향', 'S', 'money', false),
      ] },
      { id: 'm2', title: '유지', date: '매달', subquests: [
        sq('s4', '이번 달 납입 확인', 'S', 'money', false),
      ] },
      { id: 'm3', title: '만기', date: '전역일', subquests: [
        sq('s5', '만기일(전역일) 추적', 'S', 'money', false),
      ] },
    ],
  },
  {
    id: 'cheryeok', cat: '체력', stat: 'body', title: '여단 체력왕 선발', hot: false,
    sub: '3km 러닝 + 윗몸 + 팔굽 · 측정 임박', deadline: '2026-06-19',
    what: '체력검정 특급은 여러 부대에서 포상휴가로 직결된다.',
    eligibility: '소속 부대 체력검정 대상',
    applyWhere: '부대 체력검정', source: '군인 휴가규정 · 부대 내규', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: '휴가', finish: '+3일', maxDays: 3, label: '포상휴가 3일 (부대 내규)', note: '부대별 상이' },
    why: '전투력 이미 좋다. 충분히 노린다.',
    expectedPct: 55, status: 'on',
    tags: ['fitness'], imgId: '1552674605-db6ffd4facb5',
    milestones: [
      { id: 'm1', title: '측정', date: 'D-9', subquests: [
        sq('s1', '3km 현재 기록 측정', 'M', 'body', false),
        sq('s2', '윗몸 2분 테스트', 'S', 'body', false),
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
  {
    id: 'swai', cat: '자격증', stat: 'craft', title: '장병 SW·AI 역량강화', hot: true,
    sub: '구름(goorm) × 국방부 · 온라인 무료', deadline: '2026-07-08',
    what: '국방부와 구름이 함께 여는 장병 대상 SW·AI 무료 교육.',
    eligibility: '현역 장병 (온라인 수강)',
    applyWhere: 'edu.goorm.io · 국방부 공지', source: '국방부 · goorm', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: 'cert', finish: '수료증', label: 'SW·AI 수료증 + 포트폴리오', note: '취업 연계' },
    why: '시간 날 때 듣기만 해도 포트폴리오. IT 취업의 첫 줄.',
    expectedPct: 30, status: 'on',
    tags: ['coding'], imgId: '1461749280684-dccba630e2f6',
    milestones: [
      { id: 'm1', title: '입문', date: '~D-22', subquests: [
        sq('s1', '계정 만들고 과정 등록', 'S', 'craft', false, { name: 'goorm EDU', kind: '등록', gov: false }),
        sq('s2', '1주차 강의 수강', 'M', 'craft', false),
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
  {
    id: 'cheongnyeon', cat: '금융', stat: 'money', title: '청년미래적금', hot: true,
    sub: '2026.06 신설 · 청년 자산형성 매칭', deadline: '2026-09-08', unlockDday: 90,
    what: '2026년 6월 출시된 청년 자산형성 적금. 전역 직후(D-90 구간) 가입 자격을 확인한다.',
    eligibility: '자격·소득 요건 충족 청년 (전역 후 확인)',
    applyWhere: '서민금융진흥원 · 은행 앱', source: '금융위 · 2026.06 시행', verified: '2026.06',
    cost: '무료', started: false,
    reward: { kind: 'money', finish: '+매칭', label: '정부 매칭 6%/12% (요건별)', note: '소득·자격 요건 확인 필수' },
    why: '전역하면 바로 자격 확인. 장병적금 → 청년미래적금으로 끊김 없이.',
    expectedPct: 0, status: 'on',
    tags: ['finance'], imgId: '1460925895917-afdab827c52f',
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
  {
    id: 'naeil', cat: '교육', stat: 'edge', title: '국민내일배움카드', hot: false,
    sub: '훈련비 국비 지원 · 전역 후 즉시', deadline: '2026-09-08', unlockDday: 90,
    what: '직업훈련비를 국가가 대주는 카드. 전역 직후(D-90 구간) 발급받아 코딩·디자인 부트캠프를 국비로 듣는다.',
    eligibility: '구직자·재직자 등 (전역 후 발급)',
    applyWhere: 'HRD-Net · 고용센터', source: '고용노동부 · HRD-Net', verified: '2026.05',
    cost: '발급 무료 (훈련비 국비)', started: false,
    reward: { kind: 'cert', finish: '국비 훈련', label: '최대 수백만원 훈련비 지원', note: '훈련 과정·요건별 상이' },
    why: '전역 = 끝이 아니라 시작. 내일배움카드로 바로 부트캠프.',
    expectedPct: 0, status: 'on',
    tags: ['career', 'coding'], imgId: '1522071820081-009f0129c71c',
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
  {
    id: 'defai', cat: '대회', stat: 'edge', title: '국방 AI 아이디어 경연', hot: false,
    sub: '전군 대상 · AI 활용 아이디어', deadline: '2026-08-01',
    what: '국방 분야 AI 활용 아이디어를 겨루는 경연. 수상하면 포상휴가에 더해 군 SW·AI 교육과 이어진다.',
    eligibility: '전 군 공통 (개인·팀)',
    applyWhere: '국방부 공지 · 접수처', source: '국방부', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: '휴가', finish: '+2~4일', maxDays: 4, label: '수상 포상휴가 2~4일 (부대 내규)', note: '부대 내규' },
    why: 'SW·AI 교육에서 배운 걸 바로 아이디어로. 입상하면 휴가.',
    expectedPct: 0, status: 'on',
    tags: ['startup', 'coding'], imgId: '1555066931-4365d14bab8c',
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

  // ── 자격증 ──────────────────────────────────────────────────────────
  {
    id: 'jeongbogisa', cat: '자격증', stat: 'craft', title: '정보처리기사', hot: true,
    sub: 'IT 채용 단골 자격 · 필기 7월', deadline: '2026-07-18',
    what: 'IT 직군 채용에서 가장 자주 요구되는 국가기술자격. 산업기사 다음 스텝.',
    eligibility: '관련 학과 4학년 재학·졸업예정 등 응시자격 확인 필요',
    applyWhere: 'Q-Net', source: '한국산업인력공단 · q-net.or.kr', verified: '2026.05',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: 'cert', finish: '자격증', label: '국가기술자격 + 포상휴가 (부대 내규)', note: '포상휴가는 부대 내규' },
    why: '산업기사 다음은 기사. IT 이력서 첫 줄이 바뀐다.',
    expectedPct: 0, status: 'on',
    tags: ['coding', 'cert_tech'], imgId: '1461749280684-dccba630e2f6',
    milestones: [
      { id: 'm1', title: '자격 + 접수', date: '~D-30', subquests: [
        sq('s1', '응시자격 셀프 체크', 'S', 'craft', false),
        sq('s2', '필기 접수', 'S', 'craft', false, { name: 'Q-Net', kind: '접수', gov: true }),
      ] },
      { id: 'm2', title: '필기', date: '~D-7', subquests: [
        sq('s3', '소프트웨어설계 기출 1회분', 'M', 'craft', false),
        sq('s4', '데이터베이스구축 기출 1회분', 'M', 'craft', false),
        sq('s5', '필기 응시', 'L', 'craft', false),
      ] },
      { id: 'm3', title: '실기', date: '필기 후', subquests: [
        sq('s6', '실기 기출 2회분', 'L', 'craft', false),
        sq('s7', '실기 응시', 'L', 'craft', false),
      ] },
    ],
  },
  {
    id: 'comhwal', cat: '자격증', stat: 'craft', title: '컴퓨터활용능력 1급', hot: false,
    sub: '엑셀·액세스 · 상시검정으로 아무 때나', deadline: '2027-03-28',
    what: '공기업·사무직 가산점 단골. 상시검정이라 복무 중 일정 맞추기 쉽다.',
    eligibility: '전 군 공통 (상시검정)',
    applyWhere: '대한상공회의소 자격평가사업단', source: 'license.korcham.net', verified: '2026.05',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: 'cert', finish: '자격증', label: '공기업 가산점 + 포상휴가 (부대 내규)', note: '부대 내규' },
    why: '사무직 어디서나 통하는 만능 자격. 상시라 핑계가 없다.',
    expectedPct: 0, status: 'on',
    tags: ['coding', 'cert_tech', 'civil_exam'], imgId: '1486312338219-ce68d2c6f44d',
    milestones: [
      { id: 'm1', title: '필기', date: '~D-45', subquests: [
        sq('s1', '필기 기출 1회분', 'M', 'craft', false),
        sq('s2', '필기 기출 2회분', 'M', 'craft', false),
        sq('s3', '필기 접수 + 응시', 'M', 'craft', false, { name: '대한상공회의소', kind: '접수', gov: false }),
      ] },
      { id: 'm2', title: '실기', date: '~D-10', subquests: [
        sq('s4', '엑셀 함수 모의 3회', 'L', 'craft', false),
        sq('s5', '액세스 쿼리 모의 3회', 'L', 'craft', false),
        sq('s6', '실기 응시', 'L', 'craft', false),
      ] },
    ],
  },
  {
    id: 'jigecha', cat: '자격증', stat: 'craft', title: '지게차·굴착기 운전기능사', hot: false,
    sub: '국방부 위탁검정 종목 · 전역 후 바로 쓰는 기술', deadline: '2026-08-21',
    what: '중장비 양대 자격. 위탁검정 종목이라 부대 안에서 무료 응시 기회가 열린다.',
    eligibility: '전 군 공통 (위탁검정 일정은 부대 공지)',
    applyWhere: '국방부 위탁검정 · Q-Net', source: '한국산업인력공단 · 위탁검정 안내', verified: '2026.05',
    cost: '무료 (위탁검정) / 일반 접수 시 응시료', started: false,
    reward: { kind: 'cert', finish: '자격증', label: '국가기술자격 2종 + 포상휴가 (부대 내규)', note: '실기는 장비 교육장 일정 확인' },
    why: '전역 다음 날부터 돈 되는 자격. 둘 다 따면 더 세다.',
    expectedPct: 0, status: 'on',
    tags: ['cert_tech'], imgId: '1517245386807-bb43f82c33c4',
    milestones: [
      { id: 'm1', title: '필기', date: '~D-40', subquests: [
        sq('s1', '위탁검정 일정 확인', 'S', 'craft', false),
        sq('s2', '지게차 필기 기출 2회분', 'M', 'craft', false),
        sq('s3', '굴착기 필기 기출 2회분', 'M', 'craft', false),
      ] },
      { id: 'm2', title: '응시', date: '~D-10', subquests: [
        sq('s4', '필기 접수', 'S', 'craft', false, { name: 'Q-Net', kind: '접수', gov: true }),
        sq('s5', '필기 응시', 'L', 'craft', false),
      ] },
      { id: 'm3', title: '실기 준비', date: '필기 후', subquests: [
        sq('s6', '실기 코스 영상 3개 시청', 'M', 'craft', false),
        sq('s7', '실기 일정 등록', 'S', 'craft', false),
      ] },
    ],
  },
  {
    id: 'gisul-jeongi', cat: '자격증', stat: 'craft', title: '전기기능사', hot: false,
    sub: '평생 기술 베이스 · 시설·전기 직무 입문', deadline: '2026-09-06',
    what: '전기 분야 입문 국가기술자격. 시설관리·공기업 기술직의 출발점.',
    eligibility: '전 군 공통 (응시자격 제한 없음)',
    applyWhere: 'Q-Net', source: '한국산업인력공단 · q-net.or.kr', verified: '2026.05',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: 'cert', finish: '자격증', label: '국가기술자격 + 포상휴가 (부대 내규)', note: '부대 내규' },
    why: '자격 제한 없음. 전기는 어느 시대에도 안 죽는 기술.',
    expectedPct: 0, status: 'on',
    tags: ['cert_tech'], imgId: '1434030216411-0b793f4b4173',
    milestones: [
      { id: 'm1', title: '필기', date: '~D-30', subquests: [
        sq('s1', '전기이론 기출 1회분', 'M', 'craft', false),
        sq('s2', '전기기기·설비 기출 1회분', 'M', 'craft', false),
        sq('s3', '필기 접수 + 응시', 'M', 'craft', false, { name: 'Q-Net', kind: '접수', gov: true }),
      ] },
      { id: 'm2', title: '실기', date: '필기 후', subquests: [
        sq('s4', '배선 작업 영상 학습', 'M', 'craft', false),
        sq('s5', '실기 응시', 'L', 'craft', false),
      ] },
    ],
  },
  {
    id: 'jori', cat: '자격증', stat: 'craft', title: '한식조리기능사', hot: false,
    sub: '취사병이면 절반은 먹고 들어간다', deadline: '2026-08-30',
    what: '요식업·급식 분야 기본 국가기술자격. 상시검정이라 일정이 유연하다.',
    eligibility: '전 군 공통 (취사병 실습 경험 유리)',
    applyWhere: 'Q-Net (상시검정)', source: '한국산업인력공단 · q-net.or.kr', verified: '2026.05',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: 'cert', finish: '자격증', label: '국가기술자격 + 포상휴가 (부대 내규)', note: '부대 내규' },
    why: '매일 하는 일이 곧 시험 준비. 자격증으로 박제하자.',
    expectedPct: 0, status: 'on',
    tags: ['cert_tech'], imgId: '1546410531-bb4caa6b424d',
    milestones: [
      { id: 'm1', title: '필기', date: '~D-40', subquests: [
        sq('s1', '위생·재료 이론 기출 2회분', 'M', 'craft', false),
        sq('s2', '필기 접수 + 응시', 'M', 'craft', false, { name: 'Q-Net', kind: '접수', gov: true }),
      ] },
      { id: 'm2', title: '실기', date: '~D-10', subquests: [
        sq('s3', '실기 과제 레시피 암기', 'L', 'craft', false),
        sq('s4', '실기 응시', 'L', 'craft', false),
      ] },
    ],
  },
  {
    id: 'daehyeong', cat: '자격증', stat: 'craft', title: '운전면허 1종대형', hot: false,
    sub: '군 운전병 부대 취득 지원', deadline: '2027-03-28',
    what: '수송 특기 병사는 복무 중 1종대형 취득을 지원받을 수 있다. 버스·화물 취업의 기본.',
    eligibility: '운전병·수송 특기 우선 · 1종보통 취득 후 1년 경과',
    applyWhere: '소속 수송부 · 부대 공지', source: '육군 수송 교육 안내 · 부대 내규', verified: '2026.04',
    cost: '부대 지원 시 무료', started: false,
    reward: { kind: 'cert', finish: '면허', label: '1종대형 면허 (취업 직결)', note: '지원 여부는 부대 내규' },
    why: '군에서 공짜로 따는 대형면허. 사회에선 학원비 수십만원.',
    expectedPct: 0, status: 'on',
    tags: ['cert_tech', 'career'], imgId: '1450101499163-c8848c66ca85',
    milestones: [
      { id: 'm1', title: '요건 확인', date: '~D-60', subquests: [
        sq('s1', '1종보통 1년 경과 확인', 'S', 'craft', false),
        sq('s2', '수송부에 지원 절차 문의', 'S', 'people', false),
      ] },
      { id: 'm2', title: '교육 + 시험', date: '부대 일정', subquests: [
        sq('s3', '코스·도로 연습 참여', 'L', 'craft', false),
        sq('s4', '기능시험 응시', 'L', 'craft', false),
      ] },
    ],
  },
  {
    id: 'wiheomul', cat: '자격증', stat: 'craft', title: '위험물기능사', hot: false,
    sub: '주유·화학·소방 분야 필수 자격', deadline: '2026-09-20',
    what: '위험물 취급 국가기술자격. 시설·안전 직무 채용에서 꾸준히 찾는다.',
    eligibility: '전 군 공통 (응시자격 제한 없음)',
    applyWhere: 'Q-Net', source: '한국산업인력공단 · q-net.or.kr', verified: '2026.05',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: 'cert', finish: '자격증', label: '국가기술자격 + 포상휴가 (부대 내규)', note: '부대 내규' },
    why: '암기형이라 생활관 학습과 찰떡. 수요는 꾸준하다.',
    expectedPct: 0, status: 'on',
    tags: ['cert_tech'], imgId: '1434030216411-0b793f4b4173',
    milestones: [
      { id: 'm1', title: '필기', date: '~D-30', subquests: [
        sq('s1', '화재예방·소화 기출 1회분', 'M', 'craft', false),
        sq('s2', '위험물 성질 암기 카드 만들기', 'M', 'craft', false),
        sq('s3', '필기 접수 + 응시', 'M', 'craft', false, { name: 'Q-Net', kind: '접수', gov: true }),
      ] },
      { id: 'm2', title: '실기', date: '필기 후', subquests: [
        sq('s4', '실기 필답 기출 2회분', 'L', 'craft', false),
        sq('s5', '실기 응시', 'L', 'craft', false),
      ] },
    ],
  },
  {
    id: 'adsp', cat: '자격증', stat: 'craft', title: 'ADsP 데이터분석 준전문가', hot: false,
    sub: '데이터 직무 입문 자격 · 필기만으로 끝', deadline: '2026-08-09',
    what: '한국데이터산업진흥원의 데이터분석 입문 자격. 실기 없이 필기 한 번으로 취득.',
    eligibility: '전 군 공통 (응시자격 제한 없음)',
    applyWhere: 'dataq.or.kr', source: '한국데이터산업진흥원', verified: '2026.05',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: 'cert', finish: '자격증', label: '데이터 직무 입문 스펙', note: '연 4회 시행' },
    why: '시험 한 번이면 끝. 데이터 직무 이력서의 첫 줄.',
    expectedPct: 0, status: 'on',
    tags: ['coding', 'cert_tech'], imgId: '1551288049-bebda4e38f71',
    milestones: [
      { id: 'm1', title: '개념', date: '~D-25', subquests: [
        sq('s1', '데이터 이해 파트 1회독', 'M', 'craft', false),
        sq('s2', '분석 기획 파트 1회독', 'M', 'craft', false),
        sq('s3', '통계·분석 파트 1회독', 'L', 'craft', false),
      ] },
      { id: 'm2', title: '실전', date: '~D-5', subquests: [
        sq('s4', '기출 2회분 풀기', 'M', 'craft', false),
        sq('s5', '접수 + 응시', 'M', 'craft', false, { name: 'dataq.or.kr', kind: '접수', gov: true }),
      ] },
    ],
  },

  // ── 어학 ────────────────────────────────────────────────────────────
  {
    id: 'speaking', cat: '어학', stat: 'craft', title: '영어 스피킹 IH (오픽·토익스피킹)', hot: false,
    sub: '대기업 지원 최소선 · 상시 응시', deadline: '2026-08-15',
    what: '대기업·공기업 채용에서 점점 더 보는 말하기 점수. OPIc IH 또는 토익스피킹 동급이 목표.',
    eligibility: '전 군 공통',
    applyWhere: 'OPIc · YBM 토익스피킹', source: 'opic.or.kr · exam.toeicswt.co.kr', verified: '2026.05',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: '휴가', finish: '+2~4일', maxDays: 4, label: '어학 포상휴가 (부대 내규) + 취업 스펙', note: '어학 포상휴가는 부대별 상이' },
    why: '읽기 점수는 다 있다. 말하기가 진짜 차별화.',
    expectedPct: 0, status: 'on',
    tags: ['language', 'career'], imgId: '1513258496099-48168024aec0',
    milestones: [
      { id: 'm1', title: '루틴', date: '~D-30', subquests: [
        sq('s1', '자기소개 답변 스크립트 작성', 'M', 'craft', false),
        sq('s2', '주제별 답변 10개 녹음', 'L', 'craft', false),
        sq('s3', '전화영어 주 2회 (밀리어학)', 'M', 'craft', false, { name: '나라사랑포털', kind: '학습', gov: true }),
      ] },
      { id: 'm2', title: '응시', date: '~D-7', subquests: [
        sq('s4', '모의 1세트 셀프 녹화', 'M', 'craft', false),
        sq('s5', '시험 접수 + 응시', 'M', 'craft', false),
      ] },
    ],
  },
  {
    id: 'jlpt', cat: '어학', stat: 'mind', title: 'JLPT N2', hot: false,
    sub: '12월 시험 · 접수 9월 · 일본 취업·교환 기본선', deadline: '2026-12-06',
    what: '일본어능력시험 N2는 일본계 기업·교환학생의 사실상 커트라인. 연 2회뿐이라 역산이 중요.',
    eligibility: '전 군 공통',
    applyWhere: 'jlpt.or.kr', source: 'JLPT 한국 시행처', verified: '2026.05',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: 'cert', finish: 'N2', label: 'JLPT N2 인증 + 어학 포상휴가 (부대 내규)', note: '부대 내규' },
    why: '연 2회뿐인 시험. 12월을 놓치면 반년이 사라진다.',
    expectedPct: 0, status: 'on',
    tags: ['language'], imgId: '1481627834876-b7833e8f5570',
    milestones: [
      { id: 'm1', title: '기초 체력', date: '~D-120', subquests: [
        sq('s1', 'N2 한자 800자 1회독', 'L', 'mind', false),
        sq('s2', '문법 100문형 정리', 'L', 'mind', false),
      ] },
      { id: 'm2', title: '접수 + 실전', date: '~D-60', subquests: [
        sq('s3', '9월 접수 기간에 접수', 'S', 'mind', false, { name: 'jlpt.or.kr', kind: '접수', gov: false }),
        sq('s4', '기출 2회분 풀기', 'L', 'mind', false),
      ] },
      { id: 'm3', title: '응시', date: 'D-day', subquests: [
        sq('s5', '청해 모의 1회', 'M', 'mind', false),
        sq('s6', '응시 + 성적 확인', 'L', 'mind', false),
      ] },
    ],
  },
  {
    id: 'hsk', cat: '어학', stat: 'mind', title: 'HSK 4급', hot: false,
    sub: '매월 시행 · 중국어 이력서 최소선', deadline: '2026-09-12',
    what: '중국어 능력 표준시험. 4급부터 이력서에 쓸 수 있는 급수로 본다.',
    eligibility: '전 군 공통',
    applyWhere: 'HSK 한국사무국', source: 'hsk-korea.co.kr', verified: '2026.05',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: 'cert', finish: '4급', label: 'HSK 4급 + 어학 포상휴가 (부대 내규)', note: '부대 내규' },
    why: '매월 시험이 있다. 단어 1,200개면 충분히 닿는다.',
    expectedPct: 0, status: 'on',
    tags: ['language'], imgId: '1456513080510-7bf3a84b82f8',
    milestones: [
      { id: 'm1', title: '단어', date: '~D-45', subquests: [
        sq('s1', '4급 단어 600개 암기', 'L', 'mind', false),
        sq('s2', '4급 단어 1,200개 완성', 'L', 'mind', false),
      ] },
      { id: 'm2', title: '실전', date: '~D-10', subquests: [
        sq('s3', '듣기 기출 1회분', 'M', 'mind', false),
        sq('s4', '독해·쓰기 기출 1회분', 'M', 'mind', false),
        sq('s5', '접수 + 응시', 'M', 'mind', false),
      ] },
    ],
  },

  // ── 금융 ────────────────────────────────────────────────────────────
  {
    id: 'jeokmax', cat: '금융', stat: 'money', title: '장병내일적금 한도 풀납입', hot: false,
    sub: '월 55만 한도 + 2계좌 분산 점검', deadline: '2026-07-31',
    what: '납입한도를 꽉 채워야 정부 매칭도 최대. 한도 상향과 2계좌 분산을 한 번에 점검한다.',
    eligibility: '장병내일준비적금 가입자',
    applyWhere: '가입 은행 앱', source: 'mnd.go.kr · 병무청', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: 'money', finish: '+매칭 최대', label: '정부 매칭 극대화 (납입액 비례)', note: '만기까지 유지 시' },
    why: '같은 18개월, 납입만 늘려도 전역 통장이 달라진다.',
    expectedPct: 0, status: 'on',
    tags: ['finance'], imgId: '1554224155-6726b3ff858f',
    milestones: [
      { id: 'm1', title: '점검', date: '~D-20', subquests: [
        sq('s1', '현재 월 납입액 확인', 'S', 'money', false),
        sq('s2', '한도 55만 상향 신청', 'S', 'money', false, { name: '은행 앱', kind: '변경', gov: false }),
      ] },
      { id: 'm2', title: '분산', date: '~D-7', subquests: [
        sq('s3', '2계좌 분산 여부 결정', 'S', 'money', false),
        sq('s4', '자동이체 금액 재설정', 'S', 'money', false),
      ] },
    ],
  },
  {
    id: 'bonggeup', cat: '금융', stat: 'money', title: '병 봉급 적립 챌린지', hot: false,
    sub: '월 자기관리 · 봉급의 50% 이상 저축', deadline: '2027-03-28',
    what: '병 봉급이 크게 오른 시대. 매달 저축률 50%를 지키는 셀프 챌린지다.',
    eligibility: '현역병 전원',
    applyWhere: '셀프 챌린지 (은행 앱 + 가계부)', source: '국방부 봉급 인상 발표', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: 'money', finish: '습관', label: '저축률 50% 습관 + 전역 자금', note: '적금과 별도 비상금 형성' },
    why: '봉급은 오르는데 통장이 그대로면 내 문제다.',
    expectedPct: 0, status: 'on',
    tags: ['finance'], imgId: '1460925895917-afdab827c52f',
    milestones: [
      { id: 'm1', title: '세팅', date: '~D-14', subquests: [
        sq('s1', '월 고정지출 목록 작성', 'S', 'money', false),
        sq('s2', '저축률 목표(50%+) 확정', 'S', 'money', false),
      ] },
      { id: 'm2', title: '매달 루틴', date: '매달', subquests: [
        sq('s3', '봉급일 자동이체 확인', 'S', 'money', false),
        sq('s4', '월말 지출 결산 10분', 'M', 'money', false),
      ] },
    ],
  },
  {
    id: 'isa', cat: '금융', stat: 'money', title: 'ISA·청년도약계좌 사전 학습', hot: false,
    sub: '전역 후 첫 금융 세팅 · 미리 공부', deadline: '2026-09-08', unlockDday: 90,
    what: '전역하면 바로 부딪히는 ISA와 청년도약계좌. D-90 구간에 구조와 가입 요건을 미리 익힌다.',
    eligibility: '요건 충족 청년 (전역 후 가입)',
    applyWhere: '서민금융진흥원 · 은행 앱', source: '금융위 · 서민금융진흥원', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: 'money', finish: '+비과세', label: '비과세·정부기여금 혜택 선점', note: '소득·연령 요건 확인 필수' },
    why: '전역 첫 달에 헤매지 않게, 군에서 미리 끝내는 공부.',
    expectedPct: 0, status: 'on',
    tags: ['finance'], imgId: '1554224155-6726b3ff858f',
    milestones: [
      { id: 'm1', title: '학습', date: 'D-90 해금', subquests: [
        sq('s1', 'ISA 구조 30분 정리', 'M', 'money', false),
        sq('s2', '청년도약계좌 요건 셀프 체크', 'S', 'money', false),
      ] },
      { id: 'm2', title: '플랜', date: '전역 전', subquests: [
        sq('s3', '적금 만기금 배분 계획 작성', 'M', 'money', false),
        sq('s4', '가입 은행 1곳 정하기', 'S', 'money', false),
      ] },
    ],
  },

  // ── 학점 / 교육 ─────────────────────────────────────────────────────
  {
    id: 'hakbank', cat: '학점', stat: 'mind', title: '학점은행제 원격강좌', hot: false,
    sub: '학기 6학점 · 등록금 80% 환급', deadline: '2026-08-20',
    what: '복무 중 원격강좌로 학점을 쌓는다. 군 복무 학점 인정과 등록금 환급까지.',
    eligibility: '전 군 공통 (소속 대학·학점은행 등록자)',
    applyWhere: '나라사랑포털 · 학점은행제(cb.or.kr)', source: '국가평생교육진흥원', verified: '2026.05',
    cost: '등록금 80% 환급 대상', started: false,
    reward: { kind: 'cert', finish: '6학점', label: '학기 최대 6학점 (연 12학점)', note: '환급 요건은 수료 기준' },
    why: '동기들 1학기 앞설 기회. 침대에서 학점이 쌓인다.',
    expectedPct: 0, status: 'on',
    tags: ['university'], imgId: '1523240795612-9a054b0db644',
    milestones: [
      { id: 'm1', title: '신청', date: '~D-30', subquests: [
        sq('s1', '수강 가능 강좌 3개 비교', 'M', 'mind', false),
        sq('s2', '2학기 수강 신청', 'S', 'mind', false, { name: '나라사랑포털', kind: '신청', gov: true }),
      ] },
      { id: 'm2', title: '수강', date: '학기 중', subquests: [
        sq('s3', '주 2회 강의 수강 루틴', 'L', 'mind', false),
        sq('s4', '중간·기말 과제 제출', 'L', 'mind', false),
      ] },
      { id: 'm3', title: '환급', date: '수료 후', subquests: [
        sq('s5', '성적 확인 + 등록금 환급 신청', 'S', 'money', false, { name: '나라사랑포털', kind: '환급', gov: true }),
        sq('s6', '다음 학기 수강 계획 작성', 'S', 'mind', false),
      ] },
    ],
  },
  {
    id: 'elearn', cat: '교육', stat: 'craft', title: '군 e-러닝 어학 루틴', hot: false,
    sub: '밀리어학 전화영어 · 8,000+ 무료/할인 강좌', deadline: '2027-03-28',
    what: '나라사랑포털의 군 e-러닝. 전화영어와 어학·IT 강좌를 복무 내내 무료/할인으로.',
    eligibility: '전 군 공통',
    applyWhere: '나라사랑포털 → 군 e-러닝', source: '나라사랑포털', verified: '2026.05',
    cost: '무료/할인', started: false,
    reward: { kind: 'cert', finish: '수료증', label: '수료증 + 어학 기초 체력', note: '강좌별 수료 기준 상이' },
    why: '이미 낸 세금으로 깔린 강의 8,000개. 안 들으면 손해.',
    expectedPct: 0, status: 'on',
    tags: ['language', 'university'], imgId: '1517245386807-bb43f82c33c4',
    milestones: [
      { id: 'm1', title: '세팅', date: '~D-14', subquests: [
        sq('s1', '나라사랑포털 e-러닝 가입', 'S', 'craft', false, { name: '나라사랑포털', kind: '등록', gov: true }),
        sq('s2', '전화영어 레벨테스트', 'S', 'craft', false),
      ] },
      { id: 'm2', title: '루틴', date: '매주', subquests: [
        sq('s3', '전화영어 주 2회', 'M', 'craft', false),
        sq('s4', '어학 강좌 주 1강', 'M', 'craft', false),
      ] },
      { id: 'm3', title: '수료', date: '분기', subquests: [
        sq('s5', '강좌 1개 수료증 발급', 'S', 'craft', false),
        sq('s6', '다음 분기 강좌 1개 선택', 'S', 'craft', false),
      ] },
    ],
  },
  {
    id: 'dokhak', cat: '학점', stat: 'mind', title: '독학학위제 1단계', hot: false,
    sub: '교양과정 인정시험 · 시험 한 번 = 학점', deadline: '2026-10-25',
    what: '독학으로 학사학위까지 가는 제도의 첫 관문. 교양과정 시험을 복무 중에 끝낸다.',
    eligibility: '고졸 이상 (전 군 공통)',
    applyWhere: '국가평생교육진흥원 독학학위제', source: 'bdes.nile.or.kr', verified: '2026.05',
    cost: '응시료 자기개발비 대상', started: false,
    reward: { kind: 'cert', finish: '1단계', label: '교양과정 합격 (학위 단계 진입)', note: '연 1회 시행 · 일정 확인 필수' },
    why: '대학 안 다녀도 학위로 가는 길. 1단계는 군에서 끝낸다.',
    expectedPct: 0, status: 'on',
    tags: ['university'], imgId: '1481627834876-b7833e8f5570',
    milestones: [
      { id: 'm1', title: '과목 선정', date: '~D-90', subquests: [
        sq('s1', '응시 과목 4개 확정', 'S', 'mind', false),
        sq('s2', '교재 4권 확보', 'S', 'mind', false),
      ] },
      { id: 'm2', title: '학습', date: '~D-30', subquests: [
        sq('s3', '과목별 기출 1회분씩', 'L', 'mind', false),
        sq('s4', '취약 과목 오답 정리', 'M', 'mind', false),
      ] },
      { id: 'm3', title: '응시', date: 'D-day', subquests: [
        sq('s5', '접수 + 응시', 'M', 'mind', false, { name: '독학학위제', kind: '접수', gov: true }),
        sq('s6', '합격 확인 + 2단계 계획 작성', 'S', 'mind', false),
      ] },
    ],
  },
  {
    id: 'kmooc', cat: '교육', stat: 'mind', title: 'K-MOOC 수료', hot: false,
    sub: '대학 강의 무료 수강 · 수료증 발급', deadline: '2027-03-28',
    what: '국내 대학 강의를 무료로 듣는 K-MOOC. 수료증은 자소서의 학습 근거가 된다.',
    eligibility: '전 군 공통 (사이버지식정보방 이용)',
    applyWhere: 'kmooc.kr', source: '국가평생교육진흥원 · kmooc.kr', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: 'cert', finish: '수료증', label: '대학 강의 수료증 (일부 학점 연계)', note: '강좌별 인정 범위 상이' },
    why: '서울대 강의도 공짜. 수료증 한 장이 자소서 한 문단.',
    expectedPct: 0, status: 'on',
    tags: ['university', 'coding'], imgId: '1498050108023-c5249f4df085',
    milestones: [
      { id: 'm1', title: '선택', date: '~D-14', subquests: [
        sq('s1', '진로 관련 강좌 3개 비교', 'S', 'mind', false),
        sq('s2', '수강 신청', 'S', 'mind', false, { name: 'K-MOOC', kind: '등록', gov: true }),
      ] },
      { id: 'm2', title: '완주', date: '~8주', subquests: [
        sq('s3', '주 2강 수강 루틴', 'L', 'mind', false),
        sq('s4', '퀴즈·과제 전부 제출', 'M', 'mind', false),
        sq('s5', '수료증 발급', 'S', 'mind', false),
      ] },
    ],
  },

  // ── 대회 ────────────────────────────────────────────────────────────
  {
    id: 'defstartup', cat: '대회', stat: 'edge', title: '국방 스타트업 챌린지', hot: true,
    sub: '국방부 × 창업진흥원 · 장병 창업 등용문', deadline: '2026-08-14',
    what: '국방 문제를 푸는 창업 아이디어 경진. 수상팀은 사업화 지원과 후속 창업 프로그램으로 이어진다.',
    eligibility: '현역 장병 (개인·팀)',
    applyWhere: 'K-Startup · 국방부 공지', source: '국방부 · 창업진흥원', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: '휴가', finish: '+2~4일', maxDays: 4, label: '수상 포상휴가 (부대 내규) + 사업화 연계', note: '부대 내규' },
    why: '군에서 본 불편함이 곧 아이템. 수상하면 창업 트랙 직행.',
    expectedPct: 0, status: 'on',
    tags: ['startup'], imgId: '1542744173-8e7e53415bb0',
    milestones: [
      { id: 'm1', title: '아이템', date: '~D-40', subquests: [
        sq('s1', '군 생활 불편함 10개 메모', 'S', 'edge', false),
        sq('s2', '아이템 1개 선정 + 검증 질문 작성', 'M', 'edge', false),
      ] },
      { id: 'm2', title: '제안서', date: '~D-14', subquests: [
        sq('s3', '문제-해결 1장 요약', 'M', 'edge', false),
        sq('s4', '제안서 작성', 'L', 'edge', false),
      ] },
      { id: 'm3', title: '접수', date: '~D-3', subquests: [
        sq('s5', '온라인 접수', 'S', 'edge', false, { name: 'K-Startup', kind: '접수', gov: true }),
        sq('s6', '발표 대비 예상 Q&A 5개 작성', 'M', 'people', false),
      ] },
    ],
  },
  {
    id: 'munhak', cat: '대회', stat: 'mind', title: '병영문학상·독서왕', hot: false,
    sub: '국방일보 주관 · 글 한 편으로 도전', deadline: '2026-09-04',
    what: '장병 대상 문학 공모. 시·수필·독후감 부문이 있어 독서 루틴과 바로 이어진다.',
    eligibility: '현역 장병',
    applyWhere: '국방일보 공모 안내', source: '국방홍보원 · 국방일보', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: '휴가', finish: '+2~4일', maxDays: 4, label: '입상 포상휴가 (부대 내규) + 상금', note: '부대 내규' },
    why: '진중문고는 공짜, 원고지는 무기다. 읽은 만큼 쓴다.',
    expectedPct: 0, status: 'on',
    tags: ['reading', 'content'], imgId: '1456513080510-7bf3a84b82f8',
    milestones: [
      { id: 'm1', title: '독서', date: '~D-50', subquests: [
        sq('s1', '진중문고 1권 완독', 'L', 'mind', false),
        sq('s2', '인상 깊은 문장 10개 수집', 'S', 'mind', false),
      ] },
      { id: 'm2', title: '집필', date: '~D-14', subquests: [
        sq('s3', '초고 작성', 'L', 'mind', false),
        sq('s4', '퇴고 2회', 'M', 'mind', false),
      ] },
      { id: 'm3', title: '응모', date: '~D-3', subquests: [
        sq('s5', '맞춤법 검사 돌리기', 'S', 'mind', false),
        sq('s6', '응모 양식 확인 + 제출', 'S', 'mind', false),
      ] },
    ],
  },
  {
    id: 'kfn', cat: '대회', stat: 'edge', title: '국군방송 콘텐츠 공모전', hot: false,
    sub: 'KFN · 영상·사진·숏폼 부문', deadline: '2026-08-31',
    what: '국군방송(KFN)이 여는 장병 콘텐츠 공모. 스마트폰 하나로 찍은 숏폼도 응모 가능.',
    eligibility: '현역 장병 (개인·팀)',
    applyWhere: 'KFN 공모 안내', source: '국방홍보원 · KFN', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: '휴가', finish: '+2~3일', maxDays: 3, label: '입상 포상휴가 (부대 내규) + 상금', note: '부대 내규' },
    why: '매일 보는 군 생활이 남들에겐 콘텐츠다. 폰 하나면 충분.',
    expectedPct: 0, status: 'on',
    tags: ['content', 'design'], imgId: '1522071820081-009f0129c71c',
    milestones: [
      { id: 'm1', title: '기획', date: '~D-30', subquests: [
        sq('s1', '주제·부문 정하기', 'S', 'edge', false),
        sq('s2', '스토리보드 8컷 그리기', 'M', 'edge', false),
      ] },
      { id: 'm2', title: '제작', date: '~D-10', subquests: [
        sq('s3', '촬영 (보안 규정 확인)', 'L', 'edge', false),
        sq('s4', '컷 편집 + 자막', 'L', 'craft', false),
      ] },
      { id: 'm3', title: '출품', date: '~D-3', subquests: [
        sq('s5', '제출 파일 규격 확인', 'S', 'edge', false),
        sq('s6', '응모 접수', 'S', 'edge', false),
      ] },
    ],
  },
  {
    id: 'sports', cat: '대회', stat: 'body', title: '군 체육대회 종목 선발', hot: false,
    sub: '부대 대표 선발 · 축구·족구·달리기', deadline: '2026-07-10',
    what: '부대 단위 체육대회 대표 선발. 입상하면 포상으로 이어지는 부대가 많다.',
    eligibility: '소속 부대 장병',
    applyWhere: '소속 부대 (인사과 공지)', source: '부대 내규', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: '휴가', finish: '+1~3일', maxDays: 3, label: '입상 포상휴가 (부대 내규)', note: '부대별 상이' },
    why: '어차피 하는 운동, 대표로 뛰면 휴가가 걸린다.',
    expectedPct: 0, status: 'on',
    tags: ['fitness'], imgId: '1552674605-db6ffd4facb5',
    milestones: [
      { id: 'm1', title: '지원', date: '~D-20', subquests: [
        sq('s1', '종목 1개 정해 지원', 'S', 'body', false),
        sq('s2', '같이 나갈 동기 모으기', 'S', 'people', false),
      ] },
      { id: 'm2', title: '훈련', date: '~D-3', subquests: [
        sq('s3', '종목 연습 주 3회', 'M', 'body', false),
        sq('s4', '선발전 참가', 'M', 'body', false),
      ] },
    ],
  },

  // ── 체력 ────────────────────────────────────────────────────────────
  {
    id: 'teukgeup', cat: '체력', stat: 'body', title: '특급전사 체력검정', hot: true,
    sub: '3km·팔굽·윗몸 전 종목 특급 도전', deadline: '2026-08-28',
    what: '체력검정 전 종목 특급 달성. 다수 부대에서 포상휴가와 표창으로 직결된다.',
    eligibility: '소속 부대 체력검정 대상',
    applyWhere: '부대 체력검정', source: '육군 체력검정 기준 · 부대 내규', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: '휴가', finish: '+3~5일', maxDays: 5, label: '특급전사 포상휴가 (부대 내규)', note: '사격 등 추가 기준은 부대 확인' },
    why: '몸은 군에서 만드는 게 제일 싸다. 특급은 훈장이다.',
    expectedPct: 0, status: 'on',
    tags: ['fitness'], imgId: '1517836357463-d25dfeac3438',
    milestones: [
      { id: 'm1', title: '기준 확인', date: '~D-60', subquests: [
        sq('s1', '특급 기준표 확인 + 현재 기록 측정', 'M', 'body', false),
        sq('s2', '종목별 부족분 계산', 'S', 'body', false),
      ] },
      { id: 'm2', title: '훈련', date: '~D-14', subquests: [
        sq('s3', '3km 인터벌 주 3회', 'M', 'body', false),
        sq('s4', '팔굽·윗몸 피라미드 세트', 'M', 'body', false),
        sq('s5', '중간 모의 측정 1회', 'M', 'body', false),
      ] },
      { id: 'm3', title: '검정', date: 'D-day', subquests: [
        sq('s6', '체력검정 전 종목 특급 응시', 'L', 'body', false),
        sq('s7', '결과 확인 + 포상휴가 신청', 'S', 'body', false),
      ] },
    ],
  },
  {
    id: 'marathon', cat: '체력', stat: 'body', title: '군 마라톤 10km 완주', hot: false,
    sub: '가을 대회 시즌 · 부대 단위 참가', deadline: '2026-10-17',
    what: '군 관련 마라톤 대회 10km 완주 도전. 부대 단위 참가 공지를 노린다.',
    eligibility: '부대 승인 장병',
    applyWhere: '부대 공지 · 대회 접수처', source: '부대 내규 · 대회 요강', verified: '2026.05',
    cost: '참가비 대회별 상이', started: false,
    reward: { kind: 'cert', finish: '완주', label: '완주 메달 + 기록증', note: '포상 여부는 부대 내규' },
    why: '전역 전에 10km 완주 기록 하나. 평생 자랑거리.',
    expectedPct: 0, status: 'on',
    tags: ['fitness'], imgId: '1571019613454-1cb2f99b2d8b',
    milestones: [
      { id: 'm1', title: '베이스', date: '~D-90', subquests: [
        sq('s1', '5km 쉬지 않고 달리기', 'M', 'body', false),
        sq('s2', '주 3회 러닝 루틴 고정', 'M', 'body', false),
      ] },
      { id: 'm2', title: '거리 늘리기', date: '~D-30', subquests: [
        sq('s3', '8km 장거리 1회', 'L', 'body', false),
        sq('s4', '대회 접수 (부대 승인)', 'S', 'body', false),
      ] },
      { id: 'm3', title: '완주', date: 'D-day', subquests: [
        sq('s5', '레이스 페이스 전략 작성', 'S', 'body', false),
        sq('s6', '10km 완주', 'L', 'body', false),
      ] },
    ],
  },
  {
    id: 'bodyprofile', cat: '체력', stat: 'body', title: '바디프로필 6개월 플랜', hot: false,
    sub: '전역 전 인생 몸 · 식단은 짬밥으로', deadline: '2026-12-10',
    what: '체계적인 운동이 가장 쉬운 곳이 군대다. 6개월 루틴으로 촬영 가능한 몸을 만든다.',
    eligibility: '본인 의지 (부대 체단실 이용)',
    applyWhere: '셀프 플랜 + 휴가 중 촬영 예약', source: '셀프 챌린지', verified: '2026.05',
    cost: '촬영비 본인 부담', started: false,
    reward: { kind: 'cert', finish: '촬영', label: '인생 사진 + 운동 습관', note: '촬영은 휴가/외출 활용' },
    why: '시간·식단·헬스장 3박자가 공짜인 건 지금뿐이다.',
    expectedPct: 0, status: 'on',
    tags: ['fitness', 'content'], imgId: '1517836357463-d25dfeac3438',
    milestones: [
      { id: 'm1', title: '벌크', date: '~D-120', subquests: [
        sq('s1', '3분할 루틴 작성', 'S', 'body', false),
        sq('s2', '주 4회 웨이트 4주 유지', 'L', 'body', false),
        sq('s3', '체성분 측정 기록', 'S', 'body', false),
      ] },
      { id: 'm2', title: '커팅', date: '~D-30', subquests: [
        sq('s4', '식단 조절 4주 (짬밥 선택 전략)', 'L', 'body', false),
        sq('s5', '유산소 주 3회 추가', 'M', 'body', false),
      ] },
      { id: 'm3', title: '촬영', date: 'D-day', subquests: [
        sq('s6', '스튜디오 3곳 비교 + 예약', 'S', 'body', false),
        sq('s7', '휴가 일정에 촬영 확정', 'S', 'body', false),
      ] },
    ],
  },

  // ── 취업 / 전역준비 ─────────────────────────────────────────────────
  {
    id: 'jobsupport', cat: '취업', stat: 'people', title: '전역예정 장병 취업지원', hot: false,
    sub: '국방전직교육원 · 고용센터 연계', deadline: '2026-09-08', unlockDday: 90,
    what: '전역 전 받을 수 있는 진로·취업 지원을 한 번에 점검한다. 진로상담부터 전직지원 제도까지.',
    eligibility: '전역예정 장병 (제도별 대상 상이)',
    applyWhere: '국방전직교육원 · 고용센터', source: '국방전직교육원 · 고용노동부', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: 'cert', finish: '연계', label: '진로상담 + 채용 연계 프로그램', note: '전직지원금 등은 복무 형태별 대상 확인' },
    why: '나라가 차려둔 취업 지원, 신청한 사람만 먹는다.',
    expectedPct: 0, status: 'on',
    tags: ['career'], imgId: '1507003211169-0a1dd7228f2d',
    milestones: [
      { id: 'm1', title: '점검', date: 'D-90 해금', subquests: [
        sq('s1', '받을 수 있는 지원 목록 정리', 'M', 'people', false),
        sq('s2', '전직지원금·지원사업 대상 여부 확인', 'S', 'money', false),
      ] },
      { id: 'm2', title: '신청', date: '전역 전', subquests: [
        sq('s3', '진로도움 상담 신청', 'S', 'people', false, { name: '국방전직교육원', kind: '신청', gov: true }),
        sq('s4', '워크넷 구직 등록', 'S', 'people', false, { name: '고용24', kind: '등록', gov: true }),
      ] },
    ],
  },
  {
    id: 'bootcamp', cat: '취업', stat: 'craft', title: '채용연계형 SW 부트캠프', hot: true,
    sub: 'K-디지털 트레이닝 · 군 장병 사전 트랙', deadline: '2026-08-07',
    what: '전역 후 합류할 채용연계형 부트캠프를 미리 고르고, 복무 중 코딩테스트 기초를 다진다.',
    eligibility: '현역 장병 (본 과정은 전역 후 수강)',
    applyWhere: 'HRD-Net · 각 부트캠프 홈페이지', source: '고용노동부 K-디지털 트레이닝', verified: '2026.05',
    cost: '국비 지원 과정 다수', started: false,
    reward: { kind: 'cert', finish: '합류', label: '국비 부트캠프 + 채용 연계', note: '과정별 선발 기준 상이' },
    why: '전역하고 알아보면 늦다. 침상에서 코테 기초부터.',
    expectedPct: 0, status: 'on',
    tags: ['coding', 'career'], imgId: '1498050108023-c5249f4df085',
    milestones: [
      { id: 'm1', title: '리서치', date: '~D-30', subquests: [
        sq('s1', '부트캠프 3곳 모집 요강 비교', 'M', 'craft', false),
        sq('s2', '선발 코테 유형 파악', 'S', 'craft', false),
      ] },
      { id: 'm2', title: '기초 훈련', date: '~D-7', subquests: [
        sq('s3', '프로그래밍 기초 강의 1과정', 'L', 'craft', false),
        sq('s4', '쉬운 코테 문제 10개 풀기', 'L', 'craft', false),
      ] },
      { id: 'm3', title: '지원 준비', date: '전역 전', subquests: [
        sq('s5', '지원 일정 캘린더 등록', 'S', 'craft', false),
        sq('s6', '지원서 양식 미리 작성', 'M', 'craft', false),
      ] },
    ],
  },
  {
    id: 'resume', cat: '취업', stat: 'people', title: '이력서·자소서 완성 플랜', hot: false,
    sub: '전역 전 제출 가능한 서류 1세트', deadline: '2026-09-08', unlockDday: 90,
    what: 'D-90부터 시작해 전역일에 바로 지원 가능한 이력서·자소서 1세트를 완성한다.',
    eligibility: '전역예정 장병',
    applyWhere: '셀프 플랜 (고용24 양식 활용)', source: '고용24 · 잡코리아 가이드', verified: '2026.05',
    cost: '무료', started: false,
    reward: { kind: 'cert', finish: '서류 1세트', label: '즉시 지원 가능한 이력서·자소서', note: '군 경험 직무 연결이 핵심' },
    why: '전역일 = 지원 시작일. 서류는 군에서 끝내고 나간다.',
    expectedPct: 0, status: 'on',
    tags: ['career'], imgId: '1486312338219-ce68d2c6f44d',
    milestones: [
      { id: 'm1', title: '재료 모으기', date: 'D-90 해금', subquests: [
        sq('s1', '군 경험·자격·수상 목록화', 'M', 'people', false),
        sq('s2', '지원 직무 2개 확정', 'S', 'people', false),
      ] },
      { id: 'm2', title: '작성', date: '~D-30', subquests: [
        sq('s3', '이력서 초안 작성', 'L', 'people', false),
        sq('s4', '자소서 공통 문항 2개 작성', 'L', 'people', false),
      ] },
      { id: 'm3', title: '검수', date: '전역 전', subquests: [
        sq('s5', '간부·선임에게 피드백 받기', 'M', 'people', false),
        sq('s6', '최종본 클라우드 저장', 'S', 'people', false),
      ] },
    ],
  },

  // ── 창업 ────────────────────────────────────────────────────────────
  {
    id: 'ycsa', cat: '창업', stat: 'edge', title: '청년창업사관학교 사전준비', hot: false,
    sub: '중진공 · 최대 1억 지원 · 연초 모집', deadline: '2027-01-29',
    what: '만 39세 이하 청년창업가를 키우는 정부 대표 프로그램. 복무 중 아이템과 서류를 미리 만든다.',
    eligibility: '만 39세 이하 예비·초기 창업자 (전역 후 지원)',
    applyWhere: 'K-Startup · 중소벤처기업진흥공단', source: 'kosmes.or.kr · K-Startup', verified: '2026.05',
    cost: '무료 (지원 시)', started: false,
    reward: { kind: 'money', finish: '최대 1억', label: '사업화 자금 최대 1억 + 보육', note: '선정 시 · 경쟁률 높음' },
    why: '모집은 연초 한 번. 서류는 군에서 만든 사람이 이긴다.',
    expectedPct: 0, status: 'on',
    tags: ['startup'], imgId: '1522071820081-009f0129c71c',
    milestones: [
      { id: 'm1', title: '아이템 검증', date: '~D-150', subquests: [
        sq('s1', '아이템 1줄 정의 + 고객 정의', 'M', 'edge', false),
        sq('s2', '경쟁 서비스 5개 분석', 'M', 'edge', false),
      ] },
      { id: 'm2', title: '서류 초안', date: '~D-60', subquests: [
        sq('s3', '사업계획서 양식 1회독', 'M', 'edge', false),
        sq('s4', '사업계획서 초안 작성', 'L', 'edge', false),
      ] },
      { id: 'm3', title: '지원', date: '모집 공고', subquests: [
        sq('s5', '제출 서류 체크리스트 점검', 'S', 'edge', false),
        sq('s6', '공고 알림 등록 + 접수', 'S', 'edge', false, { name: 'K-Startup', kind: '접수', gov: true }),
      ] },
    ],
  },
  {
    id: 'yebi', cat: '창업', stat: 'edge', title: '예비창업패키지 스터디', hot: false,
    sub: '창업진흥원 · 사업화 자금 + 멘토링', deadline: '2027-02-26', unlockDday: 90,
    what: '예비창업자에게 사업화 자금과 멘토링을 주는 프로그램. D-90부터 요건과 사업계획서를 스터디한다.',
    eligibility: '예비창업자 (전역 후 지원)',
    applyWhere: 'K-Startup', source: '창업진흥원 · K-Startup', verified: '2026.05',
    cost: '무료 (지원 시)', started: false,
    reward: { kind: 'money', finish: '+사업화', label: '사업화 자금 + 전담 멘토링', note: '선정 시 · 모집은 통상 연초' },
    why: '전역 직후가 예비창업자 신분 그 자체. 준비된 자만 잡는다.',
    expectedPct: 0, status: 'on',
    tags: ['startup'], imgId: '1542744173-8e7e53415bb0',
    milestones: [
      { id: 'm1', title: '스터디', date: 'D-90 해금', subquests: [
        sq('s1', '지원 요건·평가 기준 정리', 'M', 'edge', false),
        sq('s2', '전년도 선정 사례 3개 분석', 'M', 'edge', false),
      ] },
      { id: 'm2', title: '준비물', date: '전역 전', subquests: [
        sq('s3', '사업계획서 PSST 구조 익히기', 'M', 'edge', false),
        sq('s4', '아이템 요약 1장 완성', 'L', 'edge', false),
      ] },
    ],
  },
];

// ── Quest Pool (45) — 체크인이 '오늘 밤의 3'을 여기서 뽑는다 ──────────
// `tags`는 INTERESTS 키. 온보딩에서 고른 관심사와 매칭해 추천 가중치를 준다.
export const rawQuestPool = [
  // 기존 14 (data/index.js에서 이관 + tags 부여)
  { stat: 'body',   txt: '팔굽혀펴기 50개',           min: 5,  xp: 3, hard: false, tags: ['fitness'] },
  { stat: 'body',   txt: '플랭크 2분',                 min: 3,  xp: 2, hard: false, tags: ['fitness'] },
  { stat: 'body',   txt: '3km 러닝',                   min: 20, xp: 5, hard: true,  tags: ['fitness'] },
  { stat: 'mind',   txt: '책 10페이지 읽기',           min: 10, xp: 2, hard: false, tags: ['reading'] },
  { stat: 'mind',   txt: '기출 한 문제 풀기',          min: 5,  xp: 2, hard: false, tags: ['civil_exam', 'cert_tech'] },
  { stat: 'mind',   txt: '오답 노트 30분 정리',        min: 30, xp: 5, hard: true,  tags: ['civil_exam', 'cert_tech'] },
  { stat: 'craft',  txt: '강의 한 챕터 듣기',          min: 15, xp: 3, hard: false, tags: ['university', 'cert_tech'] },
  { stat: 'craft',  txt: '코드 한 줄 커밋하기',        min: 10, xp: 3, hard: false, tags: ['coding'] },
  { stat: 'money',  txt: '이번 달 납입 확인',          min: 2,  xp: 2, hard: false, tags: ['finance'] },
  { stat: 'money',  txt: '지출 내역 5분 점검',         min: 5,  xp: 2, hard: false, tags: ['finance'] },
  { stat: 'people', txt: '선임/후임에게 안부 묻기',    min: 3,  xp: 2, hard: false, tags: ['career'] },
  { stat: 'people', txt: '분대 브리핑 자원하기',       min: 10, xp: 4, hard: true,  tags: ['career'] },
  { stat: 'edge',   txt: '선임에게 자격증 추천받기',   min: 3,  xp: 4, hard: true,  tags: ['cert_tech', 'career'] },
  { stat: 'edge',   txt: '새로운 기회 한 개 살펴보기', min: 5,  xp: 2, hard: false, tags: ['career', 'startup'] },
  // 신규 31
  { stat: 'body',   txt: '턱걸이 10개 3세트',          min: 10, xp: 3, hard: false, tags: ['fitness'] },
  { stat: 'body',   txt: '취침 전 스트레칭 15분',      min: 15, xp: 2, hard: false, tags: ['fitness'] },
  { stat: 'body',   txt: '윗몸일으키기 100개',         min: 10, xp: 3, hard: false, tags: ['fitness'] },
  { stat: 'body',   txt: '인터벌 러닝 20분',           min: 20, xp: 5, hard: true,  tags: ['fitness'] },
  { stat: 'mind',   txt: '영단어 30개 암기',           min: 15, xp: 3, hard: false, tags: ['language'] },
  { stat: 'mind',   txt: '일본어 한자 10개 암기',      min: 10, xp: 2, hard: false, tags: ['language'] },
  { stat: 'mind',   txt: 'HSK 단어 20개 암기',         min: 15, xp: 3, hard: false, tags: ['language'] },
  { stat: 'mind',   txt: '한국사 기출 5문제',          min: 10, xp: 2, hard: false, tags: ['civil_exam'] },
  { stat: 'mind',   txt: 'NCS 모듈형 1세트 풀기',      min: 20, xp: 4, hard: true,  tags: ['civil_exam', 'career'] },
  { stat: 'mind',   txt: '독후감 5줄 쓰기',            min: 10, xp: 2, hard: false, tags: ['reading'] },
  { stat: 'mind',   txt: '좋은 문장 필사 10분',        min: 10, xp: 2, hard: false, tags: ['reading', 'content'] },
  { stat: 'craft',  txt: '파이썬 문법 1개 정리',       min: 10, xp: 2, hard: false, tags: ['coding'] },
  { stat: 'craft',  txt: '백준 쉬운 문제 1개 풀기',    min: 20, xp: 4, hard: false, tags: ['coding'] },
  { stat: 'craft',  txt: 'CS 용어 5개 암기',           min: 10, xp: 2, hard: false, tags: ['coding', 'cert_tech'] },
  { stat: 'craft',  txt: 'LC 음원 15분 쉐도잉',        min: 15, xp: 3, hard: false, tags: ['language'] },
  { stat: 'craft',  txt: '원격강좌 1강 수강',          min: 25, xp: 4, hard: false, tags: ['university'] },
  { stat: 'craft',  txt: 'K-MOOC 1강 듣기',            min: 20, xp: 3, hard: false, tags: ['university'] },
  { stat: 'craft',  txt: '실기 시연 영상 1개 시청',    min: 15, xp: 2, hard: false, tags: ['cert_tech'] },
  { stat: 'craft',  txt: '디자인 레퍼런스 5개 수집',   min: 10, xp: 2, hard: false, tags: ['design'] },
  { stat: 'craft',  txt: '영상 편집 단축키 5개 익히기', min: 10, xp: 2, hard: false, tags: ['design', 'content'] },
  { stat: 'craft',  txt: '썸네일 1장 만들어보기',      min: 20, xp: 4, hard: false, tags: ['design', 'content'] },
  { stat: 'money',  txt: '경제 뉴스 1개 요약',         min: 10, xp: 2, hard: false, tags: ['finance'] },
  { stat: 'money',  txt: '적금 만기 수령액 계산해보기', min: 5,  xp: 2, hard: false, tags: ['finance'] },
  { stat: 'money',  txt: '금융 용어 3개 정리',         min: 10, xp: 2, hard: false, tags: ['finance'] },
  { stat: 'people', txt: '자소서 한 문단 쓰기',        min: 20, xp: 4, hard: true,  tags: ['career'] },
  { stat: 'people', txt: '직무 인터뷰 영상 1개 시청',  min: 15, xp: 2, hard: false, tags: ['career'] },
  { stat: 'people', txt: '스터디 멤버 1명 모으기',     min: 10, xp: 4, hard: true,  tags: ['career', 'university'] },
  { stat: 'edge',   txt: '창업 아이템 1줄 메모',       min: 5,  xp: 2, hard: false, tags: ['startup'] },
  { stat: 'edge',   txt: '관심 서비스 1개 뜯어보기',   min: 15, xp: 3, hard: false, tags: ['startup', 'design'] },
  { stat: 'edge',   txt: '채용공고 3개 스크랩',        min: 10, xp: 2, hard: false, tags: ['career'] },
  { stat: 'edge',   txt: '쇼츠 아이디어 3개 메모',     min: 5,  xp: 2, hard: false, tags: ['content'] },
  // 보강 16 — 7일 로테이션(quest_history)이 돌 만큼 폭을 확보. money/people/edge 위주.
  { stat: 'body',   txt: '버피 30개',                  min: 8,  xp: 2, hard: false, tags: ['fitness'] },
  { stat: 'body',   txt: '특급전사 기준 1종목 측정',   min: 20, xp: 5, hard: true,  tags: ['fitness'] },
  { stat: 'mind',   txt: '감사한 일 3가지 적기',       min: 5,  xp: 2, hard: false, tags: ['health', 'reading'] },
  { stat: 'mind',   txt: '명상 또는 호흡 정리 5분',    min: 5,  xp: 2, hard: false, tags: ['health'] },
  { stat: 'money',  txt: '내일준비적금 납입액 점검',   min: 5,  xp: 2, hard: false, tags: ['finance'] },
  { stat: 'money',  txt: '전역 후 첫 달 예산 짜보기',  min: 20, xp: 4, hard: true,  tags: ['finance'] },
  { stat: 'money',  txt: 'ETF 1개 구성 종목 살펴보기', min: 10, xp: 2, hard: false, tags: ['finance'] },
  { stat: 'money',  txt: '청년 지원 정책 1개 정리',    min: 10, xp: 3, hard: false, tags: ['finance', 'career'] },
  { stat: 'people', txt: '후임 고민 10분 들어주기',    min: 10, xp: 3, hard: false, tags: [] },
  { stat: 'people', txt: '가족/친구에게 안부 연락',    min: 5,  xp: 2, hard: false, tags: [] },
  { stat: 'people', txt: '오늘 배운 것 1가지 설명해보기', min: 10, xp: 3, hard: false, tags: ['university', 'reading'] },
  { stat: 'people', txt: '관심 직무 현직자 글 1개 읽기', min: 10, xp: 2, hard: false, tags: ['career'] },
  { stat: 'edge',   txt: '평소 안 하던 일 1가지 하기', min: 10, xp: 3, hard: true,  tags: [] },
  { stat: 'edge',   txt: '부대 프로그램/대회 1개 알아보기', min: 10, xp: 3, hard: false, tags: ['career', 'startup'] },
  { stat: 'edge',   txt: '어려운 부탁 하나 해보기',    min: 5,  xp: 4, hard: true,  tags: [] },
  { stat: 'edge',   txt: '내 강점 3가지 적어보기',     min: 10, xp: 2, hard: false, tags: ['career'] },
];

// ── Quest explanations (design revamp v2 Q2) ──────────────────────────
// Plain-language detail for every pool quest, keyed by `txt`. Abbreviations
// are spelled out; `what` answers "이게 뭐예요?", `how` answers "어떻게 해요?".
// Works online too: tonight's quests carry the same txt, so the detail sheet
// looks the copy up here instead of needing a schema change.
export const QUEST_INFO = {
  '팔굽혀펴기 50개': { what: '한 번에 못 채워도 괜찮아요. 나눠서 총 50개를 채우면 돼요.', how: '10개씩 5세트처럼 쪼개서 해보세요. 무릎을 대고 해도 인정이에요.' },
  '플랭크 2분': { what: '팔꿈치로 버티는 코어 운동이에요. 합쳐서 2분이면 돼요.', how: '30초씩 4번도 좋아요. 허리가 처지지 않게만 신경 쓰세요.' },
  '3km 러닝': { what: '체력검정 기록의 기본이 되는 거리예요.', how: '연병장이나 러닝머신 어디든 좋아요. 시간보다 완주가 목표예요.' },
  '책 10페이지 읽기': { what: '장르는 자유예요. 매일 10페이지면 한 달에 책 한 권이에요.', how: '자기 전 침상에서 10분이면 충분해요.' },
  '기출 한 문제 풀기': { what: '준비 중인 시험의 기출문제를 딱 한 문제만 푸는 거예요.', how: '기출 문제집이나 앱에서 한 문제를 풀고 해설까지 읽으면 완료예요.' },
  '오답 노트 30분 정리': { what: '틀린 문제를 모아 왜 틀렸는지 정리하는 공부법이에요.', how: '최근에 틀린 문제 3~5개를 골라 이유를 한 줄씩 적어보세요.' },
  '강의 한 챕터 듣기': { what: '수강 중인 인터넷 강의를 한 챕터 진도 나가는 거예요.', how: '군 e-러닝이나 유튜브 강의도 좋아요. 15분 안팎이면 돼요.' },
  '코드 한 줄 커밋하기': { what: '커밋은 코드 변경사항을 저장소에 기록하는 거예요. 양보다 꾸준함이에요.', how: 'GitHub 저장소에 작은 수정 하나라도 올리면 완료예요.' },
  '이번 달 납입 확인': { what: '장병내일준비적금에 이번 달 돈이 제대로 들어갔는지 확인하는 거예요.', how: '은행 앱에서 입금 내역만 확인하면 끝이에요. 2분이면 돼요.' },
  '지출 내역 5분 점검': { what: '이번 주에 어디에 얼마를 썼는지 돌아보는 거예요.', how: '뱅킹 앱의 이번 주 내역을 훑고, 아까운 지출 하나만 찾아보세요.' },
  '선임/후임에게 안부 묻기': { what: '같이 생활하는 사람에게 먼저 말을 거는 작은 연습이에요.', how: '"요즘 어때요?" 한 마디면 충분해요.' },
  '분대 브리핑 자원하기': { what: '발표 경험을 쌓는 도전 퀘스트예요. 사회에서 큰 자산이 돼요.', how: '다음 점호나 회의에서 전달사항 브리핑을 자원해보세요.' },
  '선임에게 자격증 추천받기': { what: '먼저 준비해 본 사람의 경험을 듣는 게 가장 빠른 길이에요.', how: '자격증을 딴 선임에게 어떤 걸 어떻게 준비했는지 물어보세요.' },
  '새로운 기회 한 개 살펴보기': { what: '기회 탭에서 안 보던 프로그램 하나를 열어보는 거예요.', how: '기회 탭에서 카드 하나를 열고 보상과 단계를 읽어보면 완료예요.' },
  '턱걸이 10개 3세트': { what: '등과 팔을 만드는 대표 운동이에요. 총 30개가 목표예요.', how: '10개가 안 되면 되는 만큼 3세트로 해도 돼요. 보조 밴드도 좋아요.' },
  '취침 전 스트레칭 15분': { what: '뭉친 몸을 풀고 잠의 질을 올리는 회복 루틴이에요.', how: '침상 옆에서 하체·어깨 위주로 천천히 15분 늘려주세요.' },
  '윗몸일으키기 100개': { what: '체력검정 종목이에요. 나눠서 총 100개를 채우면 돼요.', how: '25개씩 4세트를 추천해요. 반동 없이 정확하게가 중요해요.' },
  '인터벌 러닝 20분': { what: '빨리 뛰기와 걷기를 번갈아 하는 훈련이에요. 3km 기록 단축에 가장 효과적이에요.', how: '1분 빠르게 + 1분 천천히를 10번 반복해보세요.' },
  '영단어 30개 암기': { what: '토익이든 회화든, 단어가 모든 영어의 기본이에요.', how: '단어장 앱으로 30개를 외우고 셀프 테스트까지 하면 완료예요.' },
  '일본어 한자 10개 암기': { what: '일본어 학습의 핵심인 한자를 매일 조금씩 쌓는 거예요.', how: '한자 10개를 음·뜻과 함께 외우고 한 번씩 써보세요.' },
  'HSK 단어 20개 암기': { what: 'HSK는 중국어 공인 시험이에요. 급수별 필수 단어를 외우는 거예요.', how: '준비 중인 급수의 단어 20개를 외우면 완료예요.' },
  '한국사 기출 5문제': { what: '한국사능력검정시험 기출문제 5개를 푸는 거예요.', how: '기출 앱에서 5문제를 풀고 해설을 읽어보세요.' },
  'NCS 모듈형 1세트 풀기': { what: 'NCS는 공기업 채용 필기시험이에요. 모듈형은 그중 이론 기반 문제 유형이에요.', how: 'NCS 문제집에서 한 세트(보통 10~20문제)를 풀면 완료예요.' },
  '독후감 5줄 쓰기': { what: '읽은 내용을 내 언어로 정리해야 진짜 내 것이 돼요.', how: '오늘 읽은 부분에서 기억에 남는 것을 5줄로 적어보세요.' },
  '좋은 문장 필사 10분': { what: '필사는 좋은 글을 그대로 따라 쓰는 거예요. 문장력이 늘어요.', how: '책이나 기사에서 마음에 든 문단을 노트에 따라 써보세요.' },
  '파이썬 문법 1개 정리': { what: '파이썬은 입문하기 가장 좋은 프로그래밍 언어예요.', how: '오늘 배운 문법 하나(예: 반복문)를 예제와 함께 노트에 정리해보세요.' },
  '백준 쉬운 문제 1개 풀기': { what: '백준은 무료 코딩 문제 사이트예요. 개발자 취업 준비의 기본기예요.', how: 'acmicpc.net에서 브론즈 등급 문제 하나를 풀면 완료예요.' },
  'CS 용어 5개 암기': { what: 'CS는 컴퓨터과학(Computer Science)이에요. 개발 면접의 단골 주제예요.', how: '예: 프로세스와 스레드의 차이처럼, 용어 5개를 설명할 수 있게 외워보세요.' },
  'LC 음원 15분 쉐도잉': { what: 'LC는 토익 듣기(Listening)예요. 쉐도잉은 들리는 대로 바로 따라 말하는 연습법이에요.', how: '토익 LC 음원을 틀고 15분 동안 한 문장씩 따라 말해보세요.' },
  '원격강좌 1강 수강': { what: '군 복무 중 학점을 딸 수 있는 대학 원격강좌예요.', how: '수강 중인 원격강좌 1개 강의를 듣고 출석 체크까지 하면 완료예요.' },
  'K-MOOC 1강 듣기': { what: 'K-MOOC은 대학 강의를 무료로 듣는 국가 온라인 강좌 서비스예요.', how: 'kmooc.kr에서 관심 강좌 1강을 들으면 완료예요.' },
  '실기 시연 영상 1개 시청': { what: '준비 중인 자격증의 실기 과정을 눈으로 먼저 익히는 거예요.', how: '유튜브에서 실기 시연 영상을 하나 보고 순서를 기억해보세요.' },
  '디자인 레퍼런스 5개 수집': { what: '레퍼런스는 참고할 만한 좋은 디자인 사례예요. 안목이 실력의 절반이에요.', how: '핀터레스트 등에서 마음에 드는 작업물 5개를 저장하고 이유를 생각해보세요.' },
  '영상 편집 단축키 5개 익히기': { what: '편집 속도는 단축키에서 갈려요.', how: '쓰는 편집 앱의 단축키 5개를 외우고 직접 눌러보세요.' },
  '썸네일 1장 만들어보기': { what: '클릭을 부르는 한 장을 만드는 연습이에요.', how: '아무 주제나 정해 미리캔버스 같은 무료 툴로 썸네일을 만들어보세요.' },
  '경제 뉴스 1개 요약': { what: '경제 흐름을 읽는 눈은 매일 한 기사씩 쌓여요.', how: '경제 기사 하나를 읽고 세 줄로 요약해보세요.' },
  '적금 만기 수령액 계산해보기': { what: '장병내일준비적금이 전역할 때 얼마가 되는지 직접 계산해보는 거예요.', how: '월 납입액 × 개월 수에 정부 지원금까지 더해보세요. 은행 앱 계산기도 좋아요.' },
  '금융 용어 3개 정리': { what: '금리, ETF, 분산투자 같은 용어를 하나씩 내 것으로 만드는 거예요.', how: '모르는 금융 용어 3개를 검색해 한 줄씩 정리해보세요.' },
  '자소서 한 문단 쓰기': { what: '자기소개서는 한 번에 못 써요. 한 문단씩 미리 쌓아두는 거예요.', how: '"가장 어려웠던 경험" 같은 단골 질문 하나에 대한 답을 한 문단 써보세요.' },
  '직무 인터뷰 영상 1개 시청': { what: '관심 있는 직업의 현실을 현직자 입으로 들어보는 거예요.', how: '유튜브에서 관심 직무 현직자 인터뷰를 하나 보면 완료예요.' },
  '스터디 멤버 1명 모으기': { what: '같이 공부할 사람이 있으면 끝까지 갈 확률이 몇 배가 돼요.', how: '생활관에서 같은 목표를 가진 한 명에게 같이 하자고 제안해보세요.' },
  '창업 아이템 1줄 메모': { what: '불편함을 발견하는 눈이 창업의 시작이에요.', how: '오늘 느낀 불편함 하나를 "이런 게 있으면 좋겠다" 형식으로 적어보세요.' },
  '관심 서비스 1개 뜯어보기': { what: '잘 만든 앱이 왜 잘 됐는지 분석해보는 거예요.', how: '자주 쓰는 앱 하나를 열어 첫 화면이 왜 이렇게 생겼을지 생각해보세요.' },
  '채용공고 3개 스크랩': { what: '목표 직무가 요구하는 스펙을 미리 파악하는 거예요.', how: '채용 사이트에서 관심 직무 공고 3개를 저장하고 자격요건을 비교해보세요.' },
  '쇼츠 아이디어 3개 메모': { what: '콘텐츠 감각은 아이디어 메모에서 시작돼요.', how: '만들어보고 싶은 짧은 영상 아이디어 3개를 제목처럼 적어보세요.' },
  '버피 30개': { what: '버피는 전신을 쓰는 고강도 운동이에요. 짧고 굵게 끝나요.', how: '10개씩 3세트로 나눠서 해도 돼요.' },
  '특급전사 기준 1종목 측정': { what: '체력검정 특급 기준(예: 푸시업 2분 72개)에 한 종목을 직접 재보는 거예요.', how: '한 종목을 골라 기록을 재고, 특급 기준과 비교해보세요.' },
  '감사한 일 3가지 적기': { what: '잠들기 전 좋은 것을 떠올리는 습관은 멘탈 관리에 검증된 방법이에요.', how: '오늘 있었던 고마운 일 3가지를 짧게 적어보세요.' },
  '명상 또는 호흡 정리 5분': { what: '복잡한 머리를 5분 만에 정리하는 가장 간단한 도구예요.', how: '눈을 감고 4초 들이쉬고 6초 내쉬기를 5분 반복해보세요.' },
  '내일준비적금 납입액 점검': { what: '월 납입액이 내 상황에 맞는지 점검해보는 거예요. 한도까지 채울수록 유리해요.', how: '은행 앱에서 납입액을 확인하고, 올릴 여유가 있는지 따져보세요.' },
  '전역 후 첫 달 예산 짜보기': { what: '전역 직후의 돈 계획을 미리 그려보는 거예요.', how: '집세·식비·교통비 등 첫 달 예상 지출을 항목별로 적어보세요.' },
  'ETF 1개 구성 종목 살펴보기': { what: 'ETF는 여러 주식을 묶어 한 번에 사는 상품이에요. 분산투자의 기본이에요.', how: '아무 ETF나 하나 검색해 어떤 회사들이 들어있는지 확인해보세요.' },
  '청년 지원 정책 1개 정리': { what: '전역 후 쓸 수 있는 청년 정책(주거·취업·자산)을 미리 알아두는 거예요.', how: '"청년 지원 정책"으로 검색해 하나를 골라 조건과 혜택을 정리해보세요.' },
  '후임 고민 10분 들어주기': { what: '들어주는 것만으로 사람을 얻어요. 리더십의 시작이에요.', how: '후임에게 요즘 어떤지 묻고, 조언 없이 10분만 들어보세요.' },
  '가족/친구에게 안부 연락': { what: '바깥의 관계도 복무 중에 가꾸는 자산이에요.', how: '전화나 메시지 한 통이면 돼요.' },
  '오늘 배운 것 1가지 설명해보기': { what: '남에게 설명할 수 있어야 진짜 아는 거예요.', how: '오늘 배운 것 하나를 동기에게 1분 안에 설명해보세요.' },
  '관심 직무 현직자 글 1개 읽기': { what: '현직자의 생생한 글이 진로 고민의 지름길이에요.', how: '브런치나 블로그에서 관심 직무 현직자의 글 하나를 읽어보세요.' },
  '평소 안 하던 일 1가지 하기': { what: '익숙함 밖으로 한 발 나가는 도전 퀘스트예요.', how: '안 가던 길로 걷기, 안 먹던 메뉴 먹기 — 작아도 새로우면 돼요.' },
  '부대 프로그램/대회 1개 알아보기': { what: '부대 안에도 포상휴가로 이어지는 기회가 생각보다 많아요.', how: '행정반 게시판이나 국방일보에서 모집 중인 프로그램을 하나 찾아보세요.' },
  '어려운 부탁 하나 해보기': { what: '거절당할 용기를 기르는 연습이에요. 부탁은 생각보다 잘 통해요.', how: '미루던 부탁 하나를 오늘 직접 말해보세요.' },
  '내 강점 3가지 적어보기': { what: '자소서와 면접의 재료는 평소에 쌓은 자기 이해예요.', how: '남들이 나에게 고맙다고 했던 순간을 떠올리며 강점 3개를 적어보세요.' },
};

// ── Interest taxonomy (온보딩 관심사 12종) ────────────────────────────
// `icon`은 src/icons.jsx의 path key.
export const INTERESTS = [
  { key: 'coding',     ko: '코딩·IT',       icon: 'craft' },
  { key: 'language',   ko: '외국어',        icon: 'graduation' },
  { key: 'fitness',    ko: '운동·체력',     icon: 'body' },
  { key: 'finance',    ko: '재테크·금융',   icon: 'wallet' },
  { key: 'startup',    ko: '창업',          icon: 'zap' },
  { key: 'design',     ko: '디자인·영상',   icon: 'sparkle' },
  { key: 'civil_exam', ko: '공무원·공기업', icon: 'shield' },
  { key: 'university', ko: '대학·학점',     icon: 'book' },
  { key: 'reading',    ko: '독서·글쓰기',   icon: 'moon' },
  { key: 'career',     ko: '취업 준비',     icon: 'briefcase' },
  { key: 'cert_tech',  ko: '기술 자격증',   icon: 'medal' },
  { key: 'content',    ko: '콘텐츠 제작',   icon: 'star' },
];
