// screen-benefits.jsx — Benefits Hub (혜택). Self-filter client-side, store nothing.
// Grouped into clean, labeled categories so the types of benefit read at a glance.
(function () {
const { Icon, Card, Tag, IconChip } = window.TU;
const T = window.DOLBOMI;

// category grouping (the data has no group field — map it here)
const GROUPS = [
  { key: '금융',        label: '금융',          icon: 'wallet',     tone: 'positive', tint: 'var(--positive)', rgb: 'var(--positive-rgb)', desc: '정부가 원금을 얹어주는 것들' },
  { key: '자격증·어학', label: '자격증 · 어학', icon: 'craft',      tone: 'accent',   tint: 'var(--accent)',   rgb: 'var(--accent-rgb)',   desc: '무료로 응시하고 응시료를 환급받는 것들' },
  { key: '교육·학점',   label: '교육 · 학점',   icon: 'graduation', tone: 'mind',     tint: '#9B8CF5',         rgb: '155,140,245',         desc: '시간만 내면 학점·수료증이 되는 것들' },
  { key: '전역 준비',   label: '전역 준비',     icon: 'briefcase',  tone: 'neutral',  tint: 'var(--sub)',      rgb: '255,255,255',         desc: '전역 직후로 이어지는 것들' },
];
const GROUP_OF = { b1: '금융', b7: '금융', b3: '자격증·어학', b6: '자격증·어학', b2: '자격증·어학', b4: '교육·학점', b5: '교육·학점', b8: '전역 준비' };
// passive (just arrives) vs active (you go claim it)
const PASSIVE = { b1: true, b7: true };

function BenefitsScreen({ onMakeQuest }) {
  const [branch, setBranch] = React.useState('육군');
  const grouped = GROUPS.map((g) => ({ ...g, items: T.benefits.filter((b) => GROUP_OF[b.id] === g.key) })).filter((g) => g.items.length);

  return (
    <div className="tm-rise">
      {/* privacy promise */}
      <Card pad={14} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 11 }}>
        <IconChip name="shield" tone="positive" size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>군인이라서 그냥 받는 것들</div>
          <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2, lineHeight: 1.4 }}>소득·카드·가족 정보 <span style={{ color: 'var(--positive)', fontWeight: 700 }}>저장 안 함</span> · 자격은 기기 안에서만 판단</div>
        </div>
      </Card>

      {/* self-filter — 군별 */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 22 }}>
        {T.benefitFilters.군별.map((b) => {
          const on = branch === b;
          return <button key={b} onClick={() => setBranch(b)} className="tm-tap" style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            padding: '8px 0', borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: on ? 'var(--accent)' : 'var(--surface)',
            color: on ? 'var(--on-accent)' : 'var(--sub)', boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line)' }}>{b}</button>;
        })}
      </div>

      {/* category sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {grouped.map((g) => (
          <section key={g.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 2px 11px' }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `rgba(${g.rgb},.12)`, boxShadow: `inset 0 0 0 1px rgba(${g.rgb},.24)` }}>
                {Icon(g.icon, { size: 15, color: g.tint, stroke: 2 })}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-.01em' }}>{g.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 1 }}>{g.desc}</div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>{g.items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {g.items.map((b) => <BenefitCard key={b.id} b={b} group={g} onMakeQuest={onMakeQuest} />)}
            </div>
          </section>
        ))}
      </div>

      <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--faint)', marginTop: 22, lineHeight: 1.5 }}>
        혜택·자격 기준은 부대·시기별로 다를 수 있어 · 출처는 각 혜택의 안내를 확인
      </div>
    </div>
  );
}

function BenefitCard({ b, group, onMakeQuest }) {
  const passive = PASSIVE[b.id];
  return (
    <Card pad={0} glow={b.headline} style={{ overflow: 'hidden',
      background: b.headline ? `linear-gradient(135deg, rgba(${group.rgb},.10), var(--surface) 64%)` : 'var(--surface)' }}>
      <div style={{ display: 'flex', gap: 12, padding: '14px 15px 12px' }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `rgba(${group.rgb},.13)`, boxShadow: `inset 0 0 0 1px rgba(${group.rgb},.26)` }}>
          {Icon(b.icon, { size: 22, color: group.tint, stroke: 1.9 })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.25 }}>{b.title}</span>
            {b.headline && <Tag tone="accent" icon="star" style={{ flexShrink: 0 }}>대표</Tag>}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.45, fontWeight: 500, textWrap: 'pretty' }}>{b.value}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderTop: '1px solid var(--hair)', fontSize: 11, color: 'var(--faint)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: passive ? 'var(--positive)' : 'var(--sub)' }}>
          {Icon(passive ? 'check' : 'arrowUR', { size: 12, color: passive ? 'var(--positive)' : 'var(--sub)', stroke: 2 })}
          {passive ? '자동 적용' : '신청 필요'}
        </span>
        <span style={{ width: 1, height: 10, background: 'var(--line)' }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          {Icon('pin', { size: 12, color: 'var(--faint)' })}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.where}</span>
        </span>
        {b.oppId && (
          <button onClick={() => onMakeQuest(b.oppId)} className="tm-tap" style={{ marginLeft: 'auto', flexShrink: 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 999,
            background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 700, boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.26)' }}>
            {Icon('plus', { size: 13, color: 'var(--accent)', stroke: 2.4 })}퀘스트
          </button>
        )}
      </div>
    </Card>
  );
}

window.BenefitsScreen = BenefitsScreen;
})();
