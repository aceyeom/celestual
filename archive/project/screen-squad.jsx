// screen-squad.jsx — 분대 (Squad) + 익명 고충 벽 (Anonymous Wall).
(function () {
const { Ic, Card, SectionTitle, Pill } = window.TU;
const T = window.DOLBOMI;

function SquadScreen() {
  const [tab, setTab] = React.useState('squad');
  return (
    <div className="tm-rise">
      {/* segmented sub-tabs */}
      <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--card)', boxShadow: 'inset 0 0 0 1px var(--line)', borderRadius: 13, marginBottom: 18 }}>
        {[['squad', '분대'], ['wall', '익명 고충 벽']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className="tm-tap" style={{
            flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
            padding: '9px 0', borderRadius: 10, color: tab === k ? '#181206' : 'var(--sub)',
            background: tab === k ? 'var(--accent)' : 'transparent',
          }}>{label}</button>
        ))}
      </div>
      {tab === 'squad' ? <Squad /> : <Wall />}
    </div>
  );
}

function Squad() {
  const sq = T.squad;
  const ch = sq.challenge;
  return (
    <div>
      {/* banner */}
      <Card glow pad={20} style={{ marginBottom: 18, textAlign: 'center' }}>
        <div style={{ fontSize: 30, marginBottom: 6 }}>🔥</div>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3 }}>{sq.name}</div>
        <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 4 }}>벌칙 없음 · 같이 가는 사람만</div>
      </Card>

      {/* shared challenge */}
      <SectionTitle right={ch.reward}>{ch.title}</SectionTitle>
      <Card pad={18} style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{ch.goal}</span>
          <span style={{ fontFamily: '"IBM Plex Mono",monospace', fontSize: 14, fontWeight: 600 }}><span style={{ color: 'var(--accent)' }}>{ch.cur}</span><span style={{ color: 'var(--faint)' }}> / {ch.of}</span></span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,.07)' }}>
          <div style={{ width: `${(ch.cur / ch.of) * 100}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, rgba(var(--accent-rgb),.5), var(--accent))' }} />
        </div>
      </Card>

      {/* members */}
      <SectionTitle right="오늘 진행">분대원 {sq.members.length}명</SectionTitle>
      <Card pad="4px 16px 6px">
        {sq.members.map((m, i) => (
          <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--hair)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: m.me ? '#181206' : 'var(--ink)', background: m.me ? 'var(--accent)' : 'var(--card2)', boxShadow: m.me ? 'none' : 'inset 0 0 0 1px var(--line)' }}>{m.init}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}{m.me && <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}> · 나</span>}</div>
              <div style={{ fontSize: 11, color: 'var(--faint)' }}>오늘 {m.done}/{m.of} 완료</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: m.of }).map((_, j) => (
                <span key={j} style={{ width: 7, height: 7, borderRadius: 999, background: j < m.done ? 'var(--olive)' : 'rgba(255,255,255,.1)' }} />
              ))}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Wall() {
  const [posts, setPosts] = React.useState(T.wall);
  const salute = (id) => setPosts((ps) => ps.map((p) => p.id === id ? { ...p, saluted: !p.saluted, salutes: p.salutes + (p.saluted ? -1 : 1) } : p));
  return (
    <div>
      <Card pad={15} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18 }}>🫡</span>
        <div style={{ fontSize: 12, color: 'var(--sub)', lineHeight: 1.45 }}>이름도, 부대도 없어. 한 줄 털어놓고 <span style={{ color: 'var(--olive)', fontWeight: 600 }}>🫡 한 번</span>으로 응원만.</div>
      </Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {posts.map((p) => (
          <Card key={p.id} pad={16}>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'rgba(236,240,245,.9)', marginBottom: 12 }}>{p.text}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--faint)' }}>익명 · {p.ago}</span>
              <button onClick={() => salute(p.id)} className="tm-tap" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', cursor: 'pointer',
                background: p.saluted ? 'rgba(155,176,106,.16)' : 'var(--card2)',
                boxShadow: p.saluted ? 'inset 0 0 0 1px rgba(155,176,106,.4)' : 'inset 0 0 0 1px var(--line)',
                color: p.saluted ? 'var(--olive)' : 'var(--sub)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                padding: '6px 12px', borderRadius: 999,
              }}>🫡 {p.salutes}</button>
            </div>
          </Card>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: 18 }}>
        <Pill tone="neutral" style={{ padding: '8px 16px', fontSize: 12.5 }}>＋ 익명으로 한 줄 남기기</Pill>
      </div>
    </div>
  );
}

window.SquadScreen = SquadScreen;
})();
