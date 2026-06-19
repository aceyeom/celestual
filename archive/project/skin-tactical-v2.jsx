// skin-tactical-v2.jsx — Skin B, refined: one coherent progress language.
// Linear everywhere, neutral stat fill w/ EDGE as the single amber accent,
// aligned columns, no truncation, AI companion one-liner for soul.
const { icon: b2Icon, navIcon: b2Nav, nav: b2NavItems, won: b2Won, stats: b2Stats, soldier: b2Soldier } = window.DOLBOMI;

const B2 = {
  bg: '#0e1013', card: '#15181c', line: 'rgba(255,255,255,0.07)',
  hair: 'rgba(255,255,255,0.065)',
  amber: '#e3a753', olive: '#9bb06a',
  ink: '#f0f2f4', sub: 'rgba(236,240,245,0.5)', faint: 'rgba(236,240,245,0.32)',
  fill: '#c7ced6',
};

function B2Stat({ s, first }) {
  const isEdge = s.key === 'edge';
  const fill = isEdge ? B2.amber : B2.fill;
  const iconC = isEdge ? B2.amber : 'rgba(236,240,245,0.62)';
  return (
    <div style={{ padding: '11px 0', borderTop: first ? 'none' : `1px solid ${B2.hair}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 17, flexShrink: 0 }}>{b2Icon(s.key, { size: 17, color: iconC, stroke: 1.7 })}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: B2.ink, whiteSpace: 'nowrap' }}>{s.mil}</span>
        <span style={{ fontSize: 11.5, color: B2.faint, whiteSpace: 'nowrap' }}>{s.real}</span>
        {isEdge && <span style={{ fontSize: 9.5, fontWeight: 700, color: B2.amber, letterSpacing: 0.5, padding: '1px 6px', borderRadius: 999, boxShadow: `inset 0 0 0 1px ${B2.amber}55`, whiteSpace: 'nowrap' }}>가장 어려운</span>}
        <span style={{ marginLeft: 'auto', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12.5, color: B2.sub, whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span style={{ color: isEdge ? B2.amber : B2.ink, fontWeight: 600 }}>{s.cur}</span>
          <span style={{ color: B2.faint }}> → {s.tgt}</span>
        </span>
      </div>
      <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)', marginTop: 8 }}>
        <div style={{ position: 'absolute', left: `calc(${s.tgt}% - 1px)`, top: -2.5, bottom: -2.5, width: 1.5, background: B2.faint, borderRadius: 1 }} />
        <div style={{ width: `${s.cur}%`, height: '100%', borderRadius: 3, background: fill }} />
      </div>
    </div>
  );
}

function B2Screen() {
  const pctServed = Math.round(b2Soldier.served * 100);
  return (
    <div style={{
      height: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      paddingTop: 52, fontFamily: 'Pretendard, sans-serif', color: B2.ink, background: B2.bg,
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(95% 45% at 50% -8%, rgba(227,167,83,0.07), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 20px 0' }}>

        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(145deg, #22262c, #14171b)', boxShadow: `inset 0 0 0 1px ${B2.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600, fontSize: 13.5, color: B2.amber, flexShrink: 0 }}>{b2Soldier.rankEn}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>{b2Soldier.name}</div>
            <div style={{ fontSize: 12, color: B2.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b2Soldier.rank} · {b2Soldier.unit}</div>
          </div>
          <div style={{ padding: '6px 12px', borderRadius: 999, background: 'rgba(227,167,83,0.1)', boxShadow: 'inset 0 0 0 1px rgba(227,167,83,0.32)', fontSize: 11.5, fontWeight: 600, color: B2.amber, whiteSpace: 'nowrap', flexShrink: 0 }}>칭호 · {b2Soldier.title}</div>
        </div>

        {/* hero — D-day + unified linear service timeline */}
        <div style={{ background: B2.card, borderRadius: 18, padding: 20, boxShadow: `inset 0 0 0 1px ${B2.line}`, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 11.5, color: B2.sub, letterSpacing: 0.5, marginBottom: 5 }}>전역까지</div>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 42, fontWeight: 600, lineHeight: 0.95, letterSpacing: -1.5, whiteSpace: 'nowrap' }}>D-{b2Soldier.dday}</div>
            </div>
            <div style={{ textAlign: 'right', paddingBottom: 3 }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 19, fontWeight: 600, color: B2.amber, lineHeight: 1 }}>{pctServed}%</div>
              <div style={{ fontSize: 10.5, color: B2.faint, marginTop: 3, whiteSpace: 'nowrap' }}>복무 진행</div>
            </div>
          </div>
          {/* timeline */}
          <div style={{ marginTop: 18, position: 'relative', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
            <div style={{ width: `${pctServed}%`, height: '100%', borderRadius: 3, background: `linear-gradient(90deg, rgba(227,167,83,0.55), ${B2.amber})` }} />
            <div style={{ position: 'absolute', left: `calc(${pctServed}% - 5px)`, top: -2, width: 10, height: 10, borderRadius: 999, background: B2.amber, boxShadow: `0 0 0 3px ${B2.bg}, 0 0 10px ${B2.amber}99` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5, color: B2.faint, whiteSpace: 'nowrap' }}>
            <span>입대</span>
            <span style={{ color: B2.olive, fontWeight: 600 }}>오늘 · {b2Soldier.streak}일 연속</span>
            <span>전역</span>
          </div>
        </div>

        {/* savings — same card language */}
        <div style={{ background: B2.card, borderRadius: 18, padding: '15px 20px', boxShadow: `inset 0 0 0 1px ${B2.line}`, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11.5, color: B2.sub, marginBottom: 5 }}>전역일 예상 적금</div>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>{b2Won(b2Soldier.savingsProjected)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 12, color: B2.olive, fontWeight: 600 }}>+{b2Won(b2Soldier.deltaMonth)}</div>
            <div style={{ fontSize: 10.5, color: B2.faint, marginTop: 2 }}>이번 달</div>
          </div>
        </div>

        {/* stats — one aligned module */}
        <div style={{ background: B2.card, borderRadius: 18, padding: '6px 20px 8px', boxShadow: `inset 0 0 0 1px ${B2.line}`, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 6px' }}>
            <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>나의 여섯 가지</span>
            <span style={{ fontSize: 10.5, color: B2.faint, fontFamily: '"IBM Plex Mono", monospace', whiteSpace: 'nowrap' }}>지금 → 전역 목표</span>
          </div>
          {b2Stats.map((s, i) => <B2Stat key={s.key} s={s} first={i === 0} />)}
        </div>

        {/* AI companion one-liner — the soul */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '0 4px', marginBottom: 'auto' }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, background: 'linear-gradient(145deg, #2a2e34, #16191d)', boxShadow: `inset 0 0 0 1px ${B2.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🎖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(236,240,245,0.82)' }}>“3일 연속 <span style={{ color: B2.ink, fontWeight: 600 }}>전투력</span> 채웠다. 입대할 때보다 이미 앞서있어.”</div>
            <div style={{ fontSize: 10.5, color: B2.faint, marginTop: 3 }}>분대장 AI · 오늘 21:04</div>
          </div>
        </div>

        <B2NavBar active="home" />
      </div>
    </div>
  );
}

function B2NavBar({ active }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px -20px 0', padding: '12px 26px 26px', boxShadow: `inset 0 1px 0 ${B2.line}` }}>
      {b2NavItems.map((n) => {
        const on = n.key === active;
        const c = on ? B2.amber : B2.faint;
        return (
          <div key={n.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {b2Nav(n.key, { size: 22, color: c, stroke: on ? 2 : 1.7 })}
            <span style={{ fontSize: 9.5, fontWeight: 500, color: c }}>{n.label}</span>
          </div>
        );
      })}
    </div>
  );
}

window.B2Screen = B2Screen;
