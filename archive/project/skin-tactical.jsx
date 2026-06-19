// skin-tactical.jsx — Skin B: refined tactical dark (premium, matte, restrained)
const { icon: tIcon, navIcon: tNav, nav: tNavItems, won: tWon, stats: tStats, soldier: tSoldier } = window.DOLBOMI;

const TAC = {
  bg: '#0e1013', card: '#16191d', line: 'rgba(255,255,255,0.07)',
  amber: '#e0a44f', olive: '#9bb06a', ink: '#eef0f2',
  sub: 'rgba(235,240,245,0.52)', faint: 'rgba(235,240,245,0.3)',
};
const tColor = (k) => (k === 'edge' ? '#e0a44f' : k === 'money' ? '#9bb06a' : '#cfd4da');

function TacRing({ pct, size = 64 }) {
  const r = (size - 8) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TAC.amber} strokeWidth="4" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} />
    </svg>
  );
}

function TacStat({ s }) {
  const c = tColor(s.key);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: c, opacity: 0.9, width: 18 }}>{tIcon(s.key, { size: 17, color: c, stroke: 1.7 })}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: TAC.ink, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.mil}</span>
          <span style={{ fontSize: 11, color: TAC.faint, whiteSpace: 'nowrap', flexShrink: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.real}</span>
          <span style={{ marginLeft: 'auto', fontFamily: '"IBM Plex Mono", monospace', fontSize: 12.5, color: TAC.sub, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span style={{ color: c, fontWeight: 600 }}>{s.cur}</span> · {s.tgt}
          </span>
        </div>
        <div style={{ position: 'relative', height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
          <div style={{ position: 'absolute', left: `calc(${s.tgt}% - 1px)`, top: -2, bottom: -2, width: 1.5, background: TAC.faint }} />
          <div style={{ width: `${s.cur}%`, height: '100%', borderRadius: 3, background: c }} />
        </div>
      </div>
    </div>
  );
}

function TacScreen() {
  return (
    <div style={{
      height: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      paddingTop: 54, fontFamily: 'Pretendard, sans-serif', color: TAC.ink, background: TAC.bg,
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(90% 50% at 50% -5%, rgba(224,164,79,0.08), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '12px 20px 0' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(145deg, #20242a, #15181c)', boxShadow: `inset 0 0 0 1px ${TAC.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600, fontSize: 14, color: TAC.amber }}>{tSoldier.rankEn}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>{tSoldier.name}</div>
            <div style={{ fontSize: 12, color: TAC.sub }}>{tSoldier.rank} · {tSoldier.unit}</div>
          </div>
          <div style={{ padding: '5px 11px', borderRadius: 999, background: 'rgba(224,164,79,0.12)', boxShadow: 'inset 0 0 0 1px rgba(224,164,79,0.3)', fontSize: 11.5, fontWeight: 600, color: TAC.amber, whiteSpace: 'nowrap', flexShrink: 0 }}>칭호 · {tSoldier.title}</div>
        </div>

        {/* D-day hero with ring */}
        <div style={{ background: TAC.card, borderRadius: 18, padding: 20, boxShadow: `inset 0 0 0 1px ${TAC.line}`, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11.5, color: TAC.sub, letterSpacing: 0.5, marginBottom: 4 }}>전역까지</div>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 40, fontWeight: 600, lineHeight: 1, letterSpacing: -1 }}>D-{tSoldier.dday}</div>
            <div style={{ fontSize: 11.5, color: TAC.sub, marginTop: 8 }}>오늘도 멈추지 않았다 · <span style={{ color: TAC.olive }}>{tSoldier.streak}일 연속</span></div>
          </div>
          <div style={{ position: 'relative', width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TacRing pct={tSoldier.served} />
            <div style={{ position: 'absolute', fontFamily: '"IBM Plex Mono", monospace', fontSize: 14, fontWeight: 600, color: TAC.amber }}>{Math.round(tSoldier.served * 100)}%</div>
          </div>
        </div>

        {/* savings */}
        <div style={{ background: TAC.card, borderRadius: 18, padding: '16px 20px', boxShadow: `inset 0 0 0 1px ${TAC.line}`, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11.5, color: TAC.sub, marginBottom: 5 }}>전역일 예상 적금</div>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 23, fontWeight: 600, letterSpacing: -0.5 }}>{tWon(tSoldier.savingsProjected)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: TAC.olive, fontWeight: 600 }}>+{tWon(tSoldier.deltaMonth)}</div>
            <div style={{ fontSize: 10.5, color: TAC.faint }}>이번 달</div>
          </div>
        </div>

        {/* stats */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>나의 여섯 가지</span>
          <span style={{ fontSize: 11, color: TAC.faint, whiteSpace: 'nowrap' }}>지금 · 전역 목표</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {tStats.map((s) => <TacStat key={s.key} s={s} />)}
        </div>

        <TacNav active="home" />
      </div>
    </div>
  );
}

function TacNav({ active }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px -20px 0', padding: '12px 26px 26px', boxShadow: `inset 0 1px 0 ${TAC.line}` }}>
      {tNavItems.map((n) => {
        const on = n.key === active;
        const c = on ? TAC.amber : TAC.faint;
        return (
          <div key={n.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            {tNav(n.key, { size: 22, color: c, stroke: on ? 2 : 1.7 })}
            <span style={{ fontSize: 9.5, fontWeight: 500, color: c }}>{n.label}</span>
          </div>
        );
      })}
    </div>
  );
}

window.TacScreen = TacScreen;
