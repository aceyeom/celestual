// opp-plan.jsx — the full structured plan screen (pushed as its own tab) + the
// shared detailed progress bar and sub-quest rows. Milestone state is lifted into
// app-shell and passed in, so the detail screen and this plan stay in sync.
(function () {
const { Icon, Card, Tag, Btn, SectionHeader, ProgressBar, STATUS } = window.TU;
const T = window.DOLBOMI;
const SIZE_MIN = { S: '5분', M: '20분', L: '45분' };

// derive fill / pacing / status from a working milestone array
function derive(o, ms, replanned) {
  const all = ms.flatMap((m) => m.subquests);
  const totXp = all.reduce((a, s) => a + s.xp, 0) || 1;
  const fill = Math.round(all.filter((s) => s.done).reduce((a, s) => a + s.xp, 0) / totXp * 100);
  const expected = replanned ? Math.min(fill, o.expectedPct) : o.expectedPct;
  const behind = expected - fill;
  const status = replanned ? 'on' : (behind <= 4 ? 'on' : behind <= 16 ? 'tight' : 'risk');
  let acc = 0; const pips = ms.map((m) => {
    acc += m.subquests.reduce((a, s) => a + s.xp, 0);
    return { at: Math.round(acc / totXp * 100), done: m.subquests.every((s) => s.done) };
  }).slice(0, -1);
  return { fill, expected, behind, status, st: STATUS[status], pips, totXp };
}

// ── the detailed progress bar (centerpiece, shared by detail + plan) ──
function OppProgressBar({ o, ms, compact }) {
  const [replanned, setReplanned] = React.useState(false);
  const d = derive(o, ms, replanned);
  return (
    <Card glow pad={18} style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: d.st.c, boxShadow: `0 0 9px ${d.st.c}` }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: d.st.c }}>{d.st.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span className="num" style={{ fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{d.fill}</span>
          <span style={{ fontSize: 13, color: 'var(--faint)', fontWeight: 700 }}>%</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}><ProgressBar pct={d.fill} height={10} color={d.st.c} glow marker={d.expected} pips={d.pips} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, padding: '4px 9px', borderRadius: 999,
          background: 'rgba(var(--accent-rgb),.12)', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.3)' }}>
          {Icon(o.reward.kind === '휴가' ? 'palm' : o.reward.kind === 'money' ? 'wallet' : o.reward.kind === 'cert' ? 'medal' : 'trophy', { size: 14, color: 'var(--accent)', stroke: 2 })}
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--accent)', whiteSpace: 'nowrap' }}>{o.reward.finish}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, fontSize: 11.5 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--sub)' }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: d.st.c }} /> 현재 {d.fill}%
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--sub)' }}>
          <span style={{ width: 2, height: 10, background: 'var(--ink)', borderRadius: 2 }} /> 예정 {d.expected}%
        </span>
        <span style={{ marginLeft: 'auto', color: d.behind > 4 ? d.st.c : 'var(--positive)', fontWeight: 600 }}>
          {d.behind > 4 ? `예정보다 ${d.behind}% 뒤` : '페이스 ✓'}
        </span>
      </div>
      {d.status !== 'on' && !replanned && (
        <button onClick={() => setReplanned(true)} className="tm-tap" style={{ marginTop: 14, width: '100%', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 'var(--r-md)',
          background: `rgba(${d.st.rgb},.12)`, color: d.st.c, fontFamily: 'inherit', fontSize: 13, fontWeight: 700, boxShadow: `inset 0 0 0 1px rgba(${d.st.rgb},.3)` }}>
          {Icon('replan', { size: 16, color: d.st.c, stroke: 2 })} 마감까지 다시 짜기 (AI 재계획)
        </button>
      )}
      {replanned && (
        <div style={{ marginTop: 14, padding: '11px 13px', borderRadius: 'var(--r-md)', background: 'rgba(var(--positive-rgb),.1)', boxShadow: 'inset 0 0 0 1px rgba(var(--positive-rgb),.28)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 700, color: 'var(--positive)' }}>
            {Icon('sparkle', { size: 15, color: 'var(--positive)', stroke: 2 })} 경로를 다시 짰어
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)', marginTop: 4, lineHeight: 1.45 }}>남은 {o.dday}일에 맞춰 더 작은 단계로 재배치. 오늘 밤부터 따라오면 마감 가능.</div>
        </div>
      )}
    </Card>
  );
}

// ── single sub-quest row (two-tier completion for services) ──
function SubQuest({ s, onToggle }) {
  const c = window.TU.STAT_C[s.stat];
  const stat = T.stats.find((x) => x.key === s.stat);
  return (
    <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--hair)' }}>
      <button onClick={() => onToggle(false)} className="tm-tap" style={{ marginTop: 1, width: 24, height: 24, borderRadius: 999, flexShrink: 0, border: 'none', cursor: 'pointer', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: s.done ? (s.verified ? 'var(--positive)' : 'var(--accent)') : 'transparent',
        boxShadow: s.done ? 'none' : 'inset 0 0 0 2px var(--faint)' }}>
        {s.done && Icon(s.verified ? 'badgeCheck' : 'check', { size: 14, color: 'var(--on-accent)', stroke: 2.6 })}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, color: s.done ? 'var(--faint)' : 'var(--ink)', textDecoration: s.done ? 'line-through' : 'none', textWrap: 'pretty' }}>{s.text}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--sub)', padding: '1px 6px', borderRadius: 5, background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>{s.size} · {SIZE_MIN[s.size]}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: c, fontWeight: 600 }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: c }} /> {stat.mil}
          </span>
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: s.done ? 'var(--faint)' : c }}>+{s.xp}</span>
          {s.verified && <Tag tone="positive" icon="badgeCheck">인증됨</Tag>}
        </div>
        {s.service && !s.done && (
          <div style={{ marginTop: 9, padding: 10, borderRadius: 10, background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--sub)', marginBottom: 8 }}>
              {Icon('link', { size: 13, color: 'var(--sub)' })}
              <span style={{ fontWeight: 600 }}>{s.service.name}</span>
              {s.service.gov && <Tag tone="positive" style={{ fontSize: 9.5, padding: '1px 6px' }}>정부지원</Tag>}
              {!s.service.gov && <span style={{ color: 'var(--faint)' }}>· 제휴 링크</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => onToggle(false)} className="tm-tap" style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '8px', borderRadius: 9,
                background: 'transparent', boxShadow: 'inset 0 0 0 1px var(--line)', color: 'var(--ink)', fontSize: 12, fontWeight: 700 }}>완료 (정직 탭)</button>
              <button onClick={() => onToggle(true)} className="tm-tap" style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '8px', borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: 'rgba(var(--positive-rgb),.14)', boxShadow: 'inset 0 0 0 1px rgba(var(--positive-rgb),.3)', color: 'var(--positive)', fontSize: 12, fontWeight: 700 }}>
                {Icon('badgeCheck', { size: 14, color: 'var(--positive)', stroke: 2 })} 인증 +보너스</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── the full plan screen (pushed tab) ──
function OppPlan({ o, ms, onToggle, onAddTonight }) {
  const cat = T.cats[o.cat] || { c: 'var(--accent)', icon: 'flag' };
  const [open, setOpen] = React.useState(() => {
    const firstUndone = ms.find((m) => m.subquests.some((s) => !s.done));
    return firstUndone ? firstUndone.id : ms[0].id;
  });

  return (
    <div className="tm-rise">
      {/* identity strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${cat.c}1f`, boxShadow: `inset 0 0 0 1px ${cat.c}55` }}>
          {Icon(cat.icon, { size: 19, color: cat.c, stroke: 2 })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.title}</div>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>{o.cat} · 마감 D-{o.dday}</div>
        </div>
      </div>

      <OppProgressBar o={o} ms={ms} />

      <SectionHeader caption="AI가 짠 마감까지의 경로 · 단계를 탭하면 펼쳐져">퀘스트 경로</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
        {ms.map((m, mi) => {
          const dn = m.subquests.filter((s) => s.done).length;
          const isOpen = open === m.id;
          const complete = dn === m.subquests.length;
          return (
            <Card key={m.id} pad={0}>
              <button onClick={() => setOpen(isOpen ? null : m.id)} className="tm-tap" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 15px', fontFamily: 'inherit', textAlign: 'left' }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: complete ? 'var(--accent)' : 'var(--surface2)', boxShadow: complete ? 'none' : 'inset 0 0 0 1px var(--line)' }}>
                  {complete ? Icon('check', { size: 16, color: 'var(--on-accent)', stroke: 2.6 }) : <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: 'var(--sub)' }}>{mi + 1}</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>{m.date} · {dn}/{m.subquests.length}</div>
                </div>
                <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>{Icon('chevD', { size: 16, color: 'var(--faint)' })}</span>
              </button>
              {isOpen && (
                <div style={{ padding: '0 15px 8px', display: 'flex', flexDirection: 'column' }}>
                  {m.subquests.map((s) => <SubQuest key={s.id} s={s} onToggle={(v) => onToggle(m.id, s.id, v)} />)}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Btn icon="plus" onClick={onAddTonight}>오늘 밤의 3에 추가</Btn>
      <div style={{ height: 10 }} />
      <Btn tone="ghost" icon="share" onClick={() => {}}>친구에게 같이 하자고 보내기</Btn>
    </div>
  );
}

window.OppPlan = OppPlan;
window.OppProgressBar = OppProgressBar;
window.OppSubQuest = SubQuest;
})();
