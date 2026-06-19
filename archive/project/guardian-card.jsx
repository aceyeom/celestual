// guardian-card.jsx — the shared "수호신" hero card. The live 3D ram (CreatureHero)
// in its forest grove, with the six stats expressed as the avatar's accumulated XP:
// total XP drives an evolution track shown right on the hero. Used on Home + Profile.
(function () {
const { Icon, ProgressBar } = window.TU;

// evolution bands — total XP (sum of the six stats, 0..600) grows the guardian
const BANDS = [
  { min: 0,   label: '각성기' },
  { min: 150, label: '성장기' },
  { min: 270, label: '성체' },
  { min: 390, label: '정예' },
  { min: 500, label: '수호신' },
];
function evolutionOf(stats) {
  const total = stats.reduce((a, s) => a + s.cur, 0);
  let idx = 0; for (let i = 0; i < BANDS.length; i++) if (total >= BANDS[i].min) idx = i;
  const cur = BANDS[idx], next = BANDS[idx + 1];
  const pct = next ? Math.round((total - cur.min) / (next.min - cur.min) * 100) : 100;
  return { total, stage: idx + 1, label: cur.label, nextLabel: next ? next.label : null, pct, maxed: !next };
}
window.evolutionOf = evolutionOf;

function GuardianHero({ soldier, stats, creaturePath, creatureAnimal = 'ram', milestones, pulseSignal, onPickPath, variant = 'home', onOpenAvatar }) {
  const PATHS = window.CREATURE_PATHS || [];
  const pathInfo = PATHS.find((p) => p.key === creaturePath) || { ko: '수호신', desc: '' };
  const evo = evolutionOf(stats);
  const level = Math.round(stats.reduce((a, s) => a + s.cur, 0) / stats.length);
  const [picking, setPicking] = React.useState(false);
  const tall = variant === 'profile';
  const companion = tall ? (creatureAnimal === 'ram' ? 'fox' : 'ram') : null;

  return (
    <div className="tm-card" style={{ position: 'relative', overflow: 'hidden', height: tall ? 340 : 300, borderRadius: 'var(--r-lg)',
      background: '#10130f', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.07), 0 18px 38px -22px rgba(0,0,0,.7)' }}>
      <div onClick={onOpenAvatar} style={{ position: 'absolute', inset: 0, cursor: onOpenAvatar ? 'pointer' : 'default' }}>
        {window.CreatureHero && (
          <window.CreatureHero path={creaturePath} animal={creatureAnimal} companion={companion} stats={stats} milestones={milestones}
            theme="dark" pulseSignal={pulseSignal} level={level} />
        )}
      </div>

      {/* top: name of guardian + evolution-stage badge + path switch */}
      <div style={{ position: 'absolute', top: 14, left: 16, right: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', zIndex: 3 }}>
        <div style={{ pointerEvents: 'none' }}>
          <div style={{ fontSize: 9.5, letterSpacing: '.18em', color: 'rgba(255,255,255,.45)', fontWeight: 800 }}>나의 수호신</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.02em', color: '#F2F4F6' }}>{pathInfo.ko}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: 'var(--accent)',
              padding: '2px 8px', borderRadius: 999, background: 'rgba(var(--accent-rgb),.16)', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.4)' }}>
              {Icon('sparkle', { size: 11, color: 'var(--accent)', stroke: 2 })}{evo.stage}단계 · {evo.label}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          {onOpenAvatar && (
            <button onClick={onOpenAvatar} className="tm-tap" aria-label="수호신 크게 보기" style={{ border: 'none', cursor: 'pointer', padding: 0,
              width: 30, height: 30, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,.4)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)' }}>
              {Icon('expand', { size: 15, color: '#F2F4F6', stroke: 2 })}
            </button>
          )}
          <button onClick={() => setPicking((v) => !v)} className="tm-tap" style={{ border: 'none', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 999,
            background: 'rgba(0,0,0,.4)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)', color: '#F2F4F6',
            fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
            {Icon('replan', { size: 13, color: '#F2F4F6', stroke: 2 })}길 바꾸기
          </button>
        </div>
      </div>

      {/* path picker popover */}
      {picking && (
        <div style={{ position: 'absolute', top: 50, right: 14, zIndex: 5, width: 200, background: '#1b1f22',
          borderRadius: 'var(--r-md)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1), 0 18px 40px -18px rgba(0,0,0,.7)', padding: 6,
          animation: 'tmPop .22s cubic-bezier(.2,.8,.2,1)' }}>
          {PATHS.map((p) => {
            const on = p.key === creaturePath;
            return (
              <button key={p.key} onClick={() => { onPickPath && onPickPath(p.ko); setPicking(false); }} className="tm-tap"
                style={{ width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 10,
                  background: on ? 'rgba(var(--accent-rgb),.16)' : 'transparent' }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: on ? 'var(--accent)' : 'rgba(255,255,255,.3)', flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: on ? 'var(--accent)' : '#F2F4F6' }}>{p.ko}</span>
                  <span style={{ display: 'block', fontSize: 10.5, color: 'rgba(255,255,255,.4)' }}>{p.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* bottom scrim — variant decides what sits on the evolution rail */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '56px 18px 15px', zIndex: 3, pointerEvents: 'none',
        background: 'linear-gradient(0deg, #10130f 14%, rgba(16,19,15,.78) 52%, rgba(0,0,0,0) 100%)' }}>
        {variant === 'home' ? (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.6)', fontWeight: 700, marginBottom: 2 }}>전역까지</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, color: '#F2F4F6' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.42)' }}>D-</span>
                <span className="num" style={{ fontSize: 40, fontWeight: 800, lineHeight: .85, letterSpacing: '-.04em' }}>{soldier.dday}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--positive)', fontWeight: 700, whiteSpace: 'nowrap' }}>
                {Icon('flame', { size: 13, color: 'var(--positive)', stroke: 2 })}{soldier.streak}일 연속
              </span>
              <div style={{ marginTop: 3 }}><span className="num" style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>{Math.round(soldier.served * 100)}%</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.42)', marginLeft: 4 }}>복무</span></div>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em', color: '#F2F4F6' }}>{soldier.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.62)', marginTop: 2 }}>{soldier.rank} · {soldier.unit} · {soldier.title}</div>
          </div>
        )}

        {/* the evolution rail — total XP across the six stats grows the guardian */}
        <div style={{ pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.62)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {evo.maxed ? '최종 진화 도달' : <>다음 진화 <b style={{ color: '#F2F4F6' }}>{evo.nextLabel}</b>까지</>}
            </span>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>
              {evo.total} <span style={{ color: 'rgba(255,255,255,.42)' }}>XP</span>
            </span>
          </div>
          <ProgressBar pct={evo.pct} height={6} color="var(--accent)" track="rgba(255,255,255,.14)" glow />
        </div>
      </div>
    </div>
  );
}

window.GuardianHero = GuardianHero;
})();
