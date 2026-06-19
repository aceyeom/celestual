// skin-terminal.jsx — Skin D: 전술 단말기 / CRT phosphor terminal
const { navIcon: kNav, nav: kNavItems, won: kWon, stats: kStats, soldier: kSoldier, quests: kQuests } = window.DOLBOMI;

const TRM = {
  bg: '#04100a', green: '#3dffa0', dim: 'rgba(61,255,160,0.45)',
  faint: 'rgba(61,255,160,0.22)', amber: '#ffc24d', ink: '#bfffe0',
};
const mono = '"IBM Plex Mono", ui-monospace, monospace';

function bar(cur, tgt, width = 16) {
  const filled = Math.round((cur / 100) * width);
  const tgtPos = Math.round((tgt / 100) * width);
  let out = '';
  for (let i = 0; i < width; i++) {
    if (i < filled) out += '█';
    else if (i === tgtPos) out += '|';
    else out += '░';
  }
  return out;
}

function TrmRow({ children, style = {} }) {
  return <div style={{ fontFamily: mono, fontSize: 12.5, lineHeight: '20px', whiteSpace: 'pre', ...style }}>{children}</div>;
}

function TrmScreen() {
  return (
    <div style={{
      height: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      paddingTop: 50, background: TRM.bg, color: TRM.green,
      textShadow: '0 0 6px rgba(61,255,160,0.45)',
    }}>
      {/* scanlines + vignette */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.18) 0 1px, transparent 1px 3px)', pointerEvents: 'none', zIndex: 3 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.55))', pointerEvents: 'none', zIndex: 3 }} />

      <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', padding: '10px 18px 0' }}>
        {/* boot header */}
        <TrmRow style={{ color: TRM.dim, fontSize: 10.5, letterSpacing: 1 }}>┌─ DOLBOMI//STATUS_TERMINAL ───── v3 ─┐</TrmRow>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '8px 0 2px' }}>
          <TrmRow style={{ fontSize: 13, fontWeight: 600 }}>{kSoldier.rank} {kSoldier.name}</TrmRow>
          <TrmRow style={{ color: TRM.amber, fontSize: 12 }}>[칭호:{kSoldier.title}]</TrmRow>
        </div>
        <TrmRow style={{ color: TRM.dim, fontSize: 11 }}>UNIT::{kSoldier.unit} · 관등성명 확인</TrmRow>

        {/* D-day block */}
        <div style={{ margin: '16px 0', padding: '12px 14px', boxShadow: `inset 0 0 0 1px ${TRM.faint}` }}>
          <TrmRow style={{ color: TRM.dim, fontSize: 11, letterSpacing: 1 }}>{'>'} DISCHARGE_COUNTDOWN</TrmRow>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 4 }}>
            <TrmRow style={{ fontSize: 40, fontWeight: 700, lineHeight: 1, letterSpacing: -1 }}>
              D-{kSoldier.dday}<span style={{ animation: 'trmBlink 1.1s steps(1) infinite' }}>_</span>
            </TrmRow>
            <TrmRow style={{ fontSize: 12, color: TRM.dim }}>[{Math.round(kSoldier.served * 100)}%]</TrmRow>
          </div>
          <TrmRow style={{ fontSize: 12, color: TRM.green, marginTop: 6 }}>{'['}{bar(kSoldier.served * 100, 100, 26)}{']'}</TrmRow>
        </div>

        {/* streak + savings */}
        <TrmRow style={{ fontSize: 12, color: TRM.ink }}>STREAK....: {String(kSoldier.streak).padStart(3)} 일 연속 <span style={{ color: TRM.amber }}>★</span></TrmRow>
        <TrmRow style={{ fontSize: 12, color: TRM.ink, marginTop: 3 }}>적금_예상.: <span style={{ color: TRM.amber }}>{kWon(kSoldier.savingsProjected)}</span> (+{kWon(kSoldier.deltaMonth)})</TrmRow>

        {/* stats */}
        <TrmRow style={{ color: TRM.dim, fontSize: 10.5, margin: '16px 0 8px', letterSpacing: 1 }}>── STAT_RECORD [now|목표] ──────────</TrmRow>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          {kStats.map((s) => {
            const c = s.key === 'edge' ? TRM.amber : TRM.green;
            return (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <TrmRow style={{ fontSize: 12, color: TRM.ink }}>{s.mil}<span style={{ color: TRM.faint, fontSize: 10 }}> {s.en}</span></TrmRow>
                  <TrmRow style={{ fontSize: 11.5, color: c }}>{String(s.cur).padStart(2)}/{s.tgt}</TrmRow>
                </div>
                <TrmRow style={{ fontSize: 12, color: c, letterSpacing: 1 }}>{bar(s.cur, s.tgt, 22)}</TrmRow>
              </div>
            );
          })}
        </div>

        <TrmNav active="home" />
      </div>
      <style>{`@keyframes trmBlink{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>
    </div>
  );
}

function TrmNav({ active }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '10px -18px 0', padding: '12px 20px 26px', boxShadow: `inset 0 1px 0 ${TRM.faint}` }}>
      {kNavItems.map((n) => {
        const on = n.key === active;
        const c = on ? TRM.green : TRM.faint;
        return (
          <div key={n.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            {kNav(n.key, { size: 21, color: c, stroke: on ? 2 : 1.6 })}
            <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: c }}>{n.label}</span>
          </div>
        );
      })}
    </div>
  );
}

window.TrmScreen = TrmScreen;
