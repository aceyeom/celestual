// skin-neon.jsx — Skin A: 상태창 / Solo-Leveling neon HUD
const { icon, navIcon, nav, won, stats, soldier, quests } = window.DOLBOMI;

const NEON = {
  cyan: '#39e6ff', violet: '#9b7bff', magenta: '#ff5cab',
  ink: '#dfeefc', dim: 'rgba(180,210,235,0.55)',
};
const statColor = (k) => (k === 'edge' ? NEON.magenta : k === 'money' ? '#7fffd0' : NEON.cyan);

function NeonPanel({ children, style = {}, accent = NEON.cyan, pad = 14 }) {
  return (
    <div style={{
      position: 'relative', padding: pad,
      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
      background: 'linear-gradient(150deg, rgba(30,52,82,0.55), rgba(12,20,36,0.6))',
      boxShadow: `inset 0 0 0 1px ${accent}40, inset 0 0 22px ${accent}14`,
      ...style,
    }}>{children}</div>
  );
}

function NeonStat({ s }) {
  const c = statColor(s.key);
  const curPct = (s.cur / 100) * 100, tgtPct = (s.tgt / 100) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: c, filter: `drop-shadow(0 0 4px ${c}90)` }}>{icon(s.key, { size: 15, color: c, stroke: 2 })}</span>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: NEON.ink, letterSpacing: 0.2, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.mil}</span>
        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10.5, fontWeight: 600, color: NEON.dim, letterSpacing: 1.5, whiteSpace: 'nowrap', flexShrink: 0 }}>{s.en}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 13.5, color: c, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {s.cur}<span style={{ color: NEON.dim, fontWeight: 500 }}> / {s.tgt}</span>
        </span>
      </div>
      <div style={{ position: 'relative', height: 9, background: 'rgba(120,160,200,0.12)', clipPath: 'polygon(0 0,100% 0,100% 100%,4px 100%,0 calc(100% - 4px))' }}>
        {/* segment ticks */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 11px, rgba(5,8,14,0.85) 11px 13px)', zIndex: 3, pointerEvents: 'none' }} />
        {/* ghost target */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${tgtPct}%`, background: `${c}1f`, zIndex: 1 }} />
        <div style={{ position: 'absolute', left: `calc(${tgtPct}% - 1px)`, top: -2, bottom: -2, width: 2, background: `${c}aa`, zIndex: 4 }} />
        {/* fill */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${curPct}%`, background: `linear-gradient(90deg, ${c}66, ${c})`, boxShadow: `0 0 10px ${c}cc`, zIndex: 2 }} />
      </div>
    </div>
  );
}

function NeonScreen() {
  return (
    <div style={{
      height: '100%', boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
      paddingTop: 54, fontFamily: 'Pretendard, sans-serif', color: NEON.ink,
      background: 'radial-gradient(120% 80% at 80% -10%, rgba(50,90,150,0.4), transparent 60%), radial-gradient(100% 60% at -10% 30%, rgba(120,90,220,0.22), transparent 55%), #05070d',
    }}>
      {/* scanlines + grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)', pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(120,180,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(120,180,255,0.05) 1px, transparent 1px)', backgroundSize: '34px 34px', pointerEvents: 'none', zIndex: 0, maskImage: 'radial-gradient(circle at 50% 0%, #000, transparent 75%)' }} />

      <div style={{ position: 'relative', zIndex: 2, height: '100%', display: 'flex', flexDirection: 'column', padding: '8px 16px 0' }}>
        {/* system tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: 6, background: NEON.cyan, boxShadow: `0 0 8px ${NEON.cyan}` }} />
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, letterSpacing: 2.5, color: NEON.dim, fontWeight: 600, whiteSpace: 'nowrap' }}>SYSTEM · 상태창</span>
          <span style={{ marginLeft: 'auto', color: NEON.dim }}>{icon('craft', { size: 17, color: NEON.dim, stroke: 1.6 })}</span>
        </div>

        {/* header: rank hex + name + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ position: 'relative', width: 46, height: 52, flexShrink: 0 }}>
            <div style={{ position: 'absolute', inset: 0, clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)', background: `linear-gradient(160deg, ${NEON.cyan}, ${NEON.violet})`, boxShadow: `0 0 16px ${NEON.cyan}77` }} />
            <div style={{ position: 'absolute', inset: 2, clipPath: 'polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)', background: '#070b14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, color: NEON.cyan }}>{soldier.rank[0]}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.2 }}>{soldier.name} <span style={{ fontSize: 12, fontWeight: 600, color: NEON.dim }}>{soldier.rank}</span></div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '2px 9px', clipPath: 'polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)', background: `${NEON.violet}22`, boxShadow: `inset 0 0 0 1px ${NEON.violet}66` }}>
              <span style={{ color: NEON.violet }}>{icon('edge', { size: 12, color: NEON.violet, stroke: 2 })}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#cdbcff', letterSpacing: 0.5 }}>칭호 · {soldier.title}</span>
            </div>
          </div>
        </div>

        {/* D-day hero */}
        <NeonPanel pad={16} style={{ marginBottom: 11 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, letterSpacing: 2.5, color: NEON.dim, fontWeight: 600 }}>전역까지 · DISCHARGE</div>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 44, fontWeight: 800, lineHeight: 1, color: '#fff', textShadow: `0 0 18px ${NEON.cyan}aa`, marginTop: 2 }}>
                D<span style={{ color: NEON.cyan }}>-</span>{soldier.dday}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, fontWeight: 700, color: NEON.cyan }}>{Math.round(soldier.served * 100)}%</div>
              <div style={{ fontSize: 9.5, color: NEON.dim, letterSpacing: 1 }}>COMPLETE</div>
            </div>
          </div>
          <div style={{ marginTop: 12, height: 4, background: 'rgba(120,160,200,0.14)' }}>
            <div style={{ width: `${soldier.served * 100}%`, height: '100%', background: `linear-gradient(90deg, ${NEON.violet}, ${NEON.cyan})`, boxShadow: `0 0 10px ${NEON.cyan}` }} />
          </div>
        </NeonPanel>

        {/* streak + savings */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 13 }}>
          <NeonPanel accent={NEON.magenta} pad={11} style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: NEON.dim, fontWeight: 600 }}>연속 출석</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 3 }}>
              <span style={{ color: NEON.magenta }}>{icon('edge', { size: 16, color: NEON.magenta, stroke: 2 })}</span>
              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{soldier.streak}</span>
              <span style={{ fontSize: 12, color: NEON.dim }}>일</span>
            </div>
          </NeonPanel>
          <NeonPanel accent="#7fffd0" pad={11} style={{ flex: 1.5 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: NEON.dim, fontWeight: 600 }}>전역일 예상 적금</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 22, fontWeight: 700, color: '#7fffd0', lineHeight: 1, marginTop: 5, textShadow: '0 0 12px rgba(127,255,208,0.5)' }}>{won(soldier.savingsProjected)}</div>
          </NeonPanel>
        </div>

        {/* stats — The Gap */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: NEON.ink, letterSpacing: 1, whiteSpace: 'nowrap', flexShrink: 0 }}>전투 기록</span>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 10, color: NEON.dim, letterSpacing: 1, whiteSpace: 'nowrap', flexShrink: 0 }}>NOW → 전역 ME</span>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${NEON.cyan}44, transparent)` }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, flex: 1 }}>
          {stats.map((s) => <NeonStat key={s.key} s={s} />)}
        </div>

        {/* nav */}
        <NeonNav active="home" />
      </div>
    </div>
  );
}

function NeonNav({ active }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px -16px 0', padding: '10px 22px 26px', background: 'linear-gradient(0deg, rgba(8,12,22,0.95), transparent)', boxShadow: `inset 0 1px 0 ${NEON.cyan}22` }}>
      {nav.map((n) => {
        const on = n.key === active;
        const c = on ? NEON.cyan : NEON.dim;
        return (
          <div key={n.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <span style={{ filter: on ? `drop-shadow(0 0 6px ${NEON.cyan})` : 'none' }}>{navIcon(n.key, { size: 22, color: c, stroke: on ? 2 : 1.7 })}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: c, letterSpacing: 0.5 }}>{n.label}</span>
          </div>
        );
      })}
    </div>
  );
}

window.NeonScreen = NeonScreen;
