// skin-fintech.jsx — Skin C: light modern fintech (Toss-like, friendly)
const { icon: fIcon, navIcon: fNav, nav: fNavItems, won: fWon, stats: fStats, soldier: fSoldier, quests: fQuests } = window.DOLBOMI;

const FIN = {
  bg: '#eef1f5', card: '#ffffff', ink: '#191f28', sub: '#8b95a1',
  blue: '#3182f6', mint: '#00c4a3', soft: '#f2f4f6',
};
const fColor = (k) => (k === 'edge' ? '#f56fa1' : k === 'money' ? FIN.mint : k === 'body' ? '#ff8a3d' : k === 'mind' ? '#7c6cf6' : k === 'craft' ? FIN.blue : '#16b3c8');

function FinStat({ s }) {
  const c = fColor(s.key);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 11, background: c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{fIcon(s.key, { size: 18, color: c, stroke: 2 })}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: FIN.ink, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.mil}</span>
          <span style={{ fontSize: 11.5, color: FIN.sub, marginLeft: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.real}</span>
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: c, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.cur}<span style={{ color: FIN.sub, fontWeight: 500, fontSize: 11 }}> / {s.tgt}</span></span>
        </div>
        <div style={{ position: 'relative', height: 7, borderRadius: 4, background: FIN.soft }}>
          <div style={{ position: 'absolute', left: `calc(${s.tgt}% - 4px)`, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, borderRadius: 8, background: '#fff', boxShadow: `0 0 0 2px ${c}55` }} />
          <div style={{ width: `${s.cur}%`, height: '100%', borderRadius: 4, background: c }} />
        </div>
      </div>
    </div>
  );
}

function FinScreen() {
  return (
    <div style={{
      height: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      paddingTop: 50, fontFamily: 'Pretendard, sans-serif', color: FIN.ink, background: FIN.bg,
    }}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '10px 18px 0', overflow: 'hidden' }}>
        {/* header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: `linear-gradient(145deg, ${FIN.blue}, #6aa6ff)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>{fSoldier.name[0]}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{fSoldier.name}<span style={{ color: FIN.sub, fontWeight: 500 }}>님, 안녕하세요</span></div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3, padding: '2px 8px', borderRadius: 999, background: '#fff', fontSize: 11, fontWeight: 600, color: FIN.blue, whiteSpace: 'nowrap' }}>👑 칭호 · {fSoldier.title}</div>
          </div>
          <div style={{ width: 36, height: 36, borderRadius: 999, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: FIN.sub }}>{fIcon('craft', { size: 19, color: FIN.sub, stroke: 1.8 })}</div>
        </div>

        {/* hero savings card */}
        <div style={{ background: FIN.card, borderRadius: 20, padding: 20, boxShadow: '0 6px 20px rgba(20,40,80,0.06)', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: FIN.sub, fontWeight: 500, whiteSpace: 'nowrap' }}>전역일 예상 적금</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: FIN.blue, background: FIN.blue + '14', padding: '3px 9px', borderRadius: 999 }}>전역까지 D-{fSoldier.dday}</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 }}>{fWon(fSoldier.savingsProjected)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: FIN.mint }}>▲ {fWon(fSoldier.deltaMonth)}</span>
            <span style={{ fontSize: 12, color: FIN.sub }}>이번 달 · 정부 매칭 포함</span>
          </div>
          <div style={{ marginTop: 14, height: 6, borderRadius: 4, background: FIN.soft, overflow: 'hidden' }}>
            <div style={{ width: `${fSoldier.served * 100}%`, height: '100%', borderRadius: 4, background: `linear-gradient(90deg, ${FIN.blue}, ${FIN.mint})` }} />
          </div>
        </div>

        {/* streak chip row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, background: FIN.card, borderRadius: 16, padding: '12px 14px', boxShadow: '0 4px 14px rgba(20,40,80,0.05)', display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <div><div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{fSoldier.streak}일</div><div style={{ fontSize: 11, color: FIN.sub, whiteSpace: 'nowrap' }}>연속 출석</div></div>
          </div>
          <div style={{ flex: 1, background: FIN.card, borderRadius: 16, padding: '12px 14px', boxShadow: '0 4px 14px rgba(20,40,80,0.05)', display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 20 }}>🎖️</span>
            <div><div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{Math.round(fSoldier.served * 100)}%</div><div style={{ fontSize: 11, color: FIN.sub, whiteSpace: 'nowrap' }}>복무 진행</div></div>
          </div>
        </div>

        {/* stats card */}
        <div style={{ background: FIN.card, borderRadius: 20, padding: 18, boxShadow: '0 6px 20px rgba(20,40,80,0.06)', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 14.5, fontWeight: 700, whiteSpace: 'nowrap' }}>나의 여섯 가지</span>
            <span style={{ fontSize: 11.5, color: FIN.sub, whiteSpace: 'nowrap' }}>지금 → 전역 목표</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fStats.map((s) => <FinStat key={s.key} s={s} />)}
          </div>
        </div>

        <FinNav active="home" />
      </div>
    </div>
  );
}

function FinNav({ active }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px -18px 0', padding: '10px 24px 26px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)', boxShadow: '0 -1px 0 rgba(0,0,0,0.05)' }}>
      {fNavItems.map((n) => {
        const on = n.key === active;
        const c = on ? FIN.blue : FIN.sub;
        return (
          <div key={n.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {fNav(n.key, { size: 22, color: c, stroke: on ? 2.2 : 1.8 })}
            <span style={{ fontSize: 9.5, fontWeight: on ? 700 : 500, color: c }}>{n.label}</span>
          </div>
        );
      })}
    </div>
  );
}

window.FinScreen = FinScreen;
