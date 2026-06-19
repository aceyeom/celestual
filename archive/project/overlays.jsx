// overlays.jsx — CheckIn sheet, QuestComplete moment, Monthly recap card.
(function () {
const { Icon, Card, Btn, Tag, IconChip } = window.TU;
const T = window.DOLBOMI;
const won = T.won;

// ── 60-second check-in (bottom sheet) ──────────────────────────
function CheckInSheet({ onClose, onDone }) {
  const [mood, setMood] = React.useState(null);
  const [energy, setEnergy] = React.useState(null);
  const ready = mood && energy != null;
  return (
    <SheetShell onClose={onClose}>
      <div style={{ textAlign: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em' }}>오늘 하루 어땠어?</div>
        <div style={{ fontSize: 12.5, color: 'var(--sub)', marginTop: 4 }}>두 번만 탭하면 끝 · 오늘 밤 퀘스트가 맞춰져</div>
      </div>
      <div style={{ marginTop: 22, marginBottom: 9, fontSize: 12, fontWeight: 700, color: 'var(--sub)' }}>기분</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        {T.moods.map((m) => {
          const on = mood && mood.key === m.key;
          return (
            <button key={m.key} onClick={() => setMood(m)} className="tm-tap" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '14px 0', borderRadius: 14,
              background: on ? 'rgba(var(--accent-rgb),.15)' : 'var(--surface2)', boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--line)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 24 }}>{m.emoji}</span>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink)' }}>{m.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 20, marginBottom: 9, fontSize: 12, fontWeight: 700, color: 'var(--sub)' }}>에너지</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {T.energy.map((e, i) => {
          const on = energy === i;
          return (
            <button key={e} onClick={() => setEnergy(i)} className="tm-tap" style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '12px 0', borderRadius: 12, fontSize: 12.5, fontWeight: 700,
              background: on ? 'rgba(var(--accent-rgb),.15)' : 'var(--surface2)', boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--line)', color: 'var(--ink)' }}>{e}</button>
          );
        })}
      </div>
      <div style={{ marginTop: 14, minHeight: 18, fontSize: 12, color: 'var(--positive)', textAlign: 'center', fontWeight: 600 }}>
        {energy === 0 ? '에너지 바닥이네. 오늘은 5분짜리 미니 퀘스트만 줄게.' : energy >= 2 ? '컨디션 좋다. 하나 더 밀어붙여보자.' : ' '}
      </div>
      <div style={{ marginTop: 14 }}>
        <Btn onClick={() => ready && onDone(mood)} style={{ opacity: ready ? 1 : 0.4 }}>오늘 밤의 3 받기</Btn>
      </div>
    </SheetShell>
  );
}

// ── quest completion (cinematic, clean: ray burst + sheen medallion + xp count-up) ─
function QuestComplete({ quest, guardianName, onClose }) {
  React.useEffect(() => { const t = setTimeout(onClose, 1500); return () => clearTimeout(t); }, []);
  const stat = T.stats.find((s) => s.key === quest.stat);
  const c = window.TU.STAT_C[quest.stat];
  const rays = React.useMemo(() => Array.from({ length: 14 }, (_, i) => i), []);
  const sparks = React.useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    a: Math.round(Math.random() * 360), d: 70 + Math.round(Math.random() * 74), s: 0.5 + Math.random() * 0.7, dl: Math.random() * 0.18,
  })), []);
  const [xp, setXp] = React.useState(0);
  React.useEffect(() => {
    let r; const start = performance.now(), dur = 520;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 2);
      setXp(Math.round(e * quest.xp));
      if (t < 1) r = requestAnimationFrame(tick);
    };
    r = requestAnimationFrame(tick); return () => cancelAnimationFrame(r);
  }, []);
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 90,
      background: `radial-gradient(120% 80% at 50% 42%, ${c}26 0%, rgba(6,8,11,.78) 46%, rgba(6,8,11,.9) 100%)`, backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'tmFade .24s both' }}>
      <style>{`
        @keyframes qcRay{0%{transform:rotate(var(--a)) translateY(-6px) scaleY(.3);opacity:0}20%{opacity:.95}100%{transform:rotate(var(--a)) translateY(-82px) scaleY(1);opacity:0}}
        @keyframes qcSpark{0%{transform:rotate(var(--a)) translateY(-8px) scale(.2);opacity:0}24%{opacity:1}100%{transform:rotate(var(--a)) translateY(calc(-1*var(--d))) scale(1);opacity:0}}
        @keyframes qcPop{0%{transform:scale(.4);opacity:0}55%{transform:scale(1.14)}100%{transform:scale(1);opacity:1}}
        @keyframes qcRing{0%{transform:scale(.55);opacity:0}25%{opacity:.65}100%{transform:scale(1.95);opacity:0}}
        @keyframes qcSheen{0%{left:-65%}100%{left:150%}}
        .qc-ray{position:absolute;left:0;top:0;width:3px;height:40px;margin:-20px 0 0 -1.5px;border-radius:3px;transform-origin:50% 50%;animation:qcRay 1s cubic-bezier(.16,.8,.3,1) forwards}
        .qc-spark{position:absolute;left:0;top:0;width:9px;height:9px;margin:-4.5px 0 0 -4.5px;border-radius:999px;transform-origin:50% 50%;animation:qcSpark 1.2s cubic-bezier(.12,.7,.25,1) forwards}
      `}</style>

      {/* burst */}
      <div style={{ position: 'absolute', left: '50%', top: 'calc(42% - 0px)', width: 0, height: 0, pointerEvents: 'none' }}>
        {rays.map((i) => (
          <span key={'r' + i} className="qc-ray" style={{ '--a': `${(360 / rays.length) * i}deg`,
            background: `linear-gradient(to top, ${c}00, ${c})`, animationDelay: `${(i % 3) * 0.04}s` }} />
        ))}
        {sparks.map((s, i) => (
          <span key={'s' + i} className="qc-spark" style={{ '--a': `${s.a}deg`, '--d': `${s.d}px`,
            background: c, boxShadow: `0 0 8px ${c}`, transform: `scale(${s.s})`, animationDelay: `${s.dl}s` }} />
        ))}
      </div>

      {/* medallion */}
      <div style={{ position: 'relative', width: 116, height: 116, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
        <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: 999, border: `2px solid ${c}`, animation: 'qcRing 1.3s .05s ease-out forwards' }} />
        <div style={{ position: 'absolute', width: 100, height: 100, borderRadius: 999, border: `2px solid ${c}`, animation: 'qcRing 1.3s .32s ease-out forwards' }} />
        <div style={{ position: 'relative', overflow: 'hidden', width: 92, height: 92, borderRadius: 999,
          background: `radial-gradient(circle at 38% 32%, ${c}26, var(--surface) 72%)`,
          boxShadow: `inset 0 0 0 2px ${c}, 0 0 44px ${c}55, 0 10px 30px -8px ${c}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'qcPop .55s cubic-bezier(.2,1.1,.3,1) both' }}>
          {Icon(quest.stat, { size: 40, color: c, stroke: 2 })}
          <span style={{ position: 'absolute', top: '-40%', left: '-65%', width: '46%', height: '180%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent)', transform: 'skewX(-18deg)', animation: 'qcSheen 1.05s .4s ease-out both' }} />
        </div>
      </div>

      <div className="tm-rise" style={{ textAlign: 'center', maxWidth: 290 }}>
        <div style={{ fontSize: 11.5, color: c, letterSpacing: '.18em', fontWeight: 800 }}>QUEST COMPLETE</div>
        <div style={{ fontSize: 26, fontWeight: 800, margin: '7px 0 2px', letterSpacing: '-.02em', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 8 }}>
          <span style={{ color: 'var(--ink)' }}>{guardianName || stat.mil}</span>
          <span className="mono" style={{ color: c }}>+{xp} XP</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: c, marginTop: 4,
          padding: '3px 11px', borderRadius: 999, background: `${c}1f`, boxShadow: `inset 0 0 0 1px ${c}55` }}>
          {Icon(quest.stat, { size: 13, color: c, stroke: 2 })}{stat.mil} 경험치 성장</div>
        <p style={{ fontSize: 13.5, color: 'rgba(242,244,246,.74)', lineHeight: 1.55, marginTop: 8, textWrap: 'pretty' }}>“{quest.hard ? '그게 바로 담력이다. 오늘 한 칸 앞섰어.' : '한 칸 더. 전역 목표가 가까워졌다.'}”</p>
      </div>
    </div>
  );
}

// ── Monthly recap (결산) ───────────────────────────────────────
function Wrapped() {
  const w = T.wrapped;
  const items = [
    { icon: 'check', big: w.quests + '개', label: '완료한 퀘스트' },
    { icon: 'body', big: '+' + w.topStat.gain, label: w.topStat.mil + ' 상승' },
    { icon: 'wallet', big: '+' + won(w.savings), label: '적금 증가' },
    { icon: 'palm', big: '+3일', label: '휴가 사다리' },
  ];
  return (
    <div className="tm-rise">
      <Card glow pad={22} style={{ background: 'linear-gradient(165deg, rgba(var(--accent-rgb),.14), var(--surface) 60%)' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <Tag tone="accent" icon="receipt">MONTHLY RECAP</Tag>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 12, letterSpacing: '-.02em' }}>{w.month}의 너</div>
          <div style={{ fontSize: 13, color: 'var(--sub)', marginTop: 4 }}>{w.line}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
          {items.map((it) => (
            <div key={it.label} style={{ background: 'rgba(0,0,0,.22)', borderRadius: 14, padding: 15, textAlign: 'center', boxShadow: 'inset 0 0 0 1px var(--hair)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 7 }}>{Icon(it.icon, { size: 18, color: 'var(--accent)', stroke: 2 })}</div>
              <div className="num" style={{ fontSize: 19, fontWeight: 800, color: 'var(--accent)' }}>{it.big}</div>
              <div style={{ fontSize: 10.5, color: 'var(--sub)', marginTop: 3 }}>{it.label}</div>
            </div>
          ))}
        </div>

        {/* per-stat XP gained this month */}
        {w.gains && (
          <div style={{ marginTop: 16, padding: '15px 16px', background: 'rgba(0,0,0,.2)', borderRadius: 14, boxShadow: 'inset 0 0 0 1px var(--hair)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sub)', marginBottom: 11 }}>이번 달 능력치 성장</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[...w.gains].sort((a, b) => b.val - a.val).map((g) => {
                const stat = T.stats.find((s) => s.key === g.key) || {};
                const c = window.TU.STAT_C[g.key] || 'var(--accent)';
                const max = Math.max(...w.gains.map((x) => x.val));
                return (
                  <div key={g.key} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    {Icon(g.key, { size: 13, color: c, stroke: 2 })}
                    <span style={{ fontSize: 11.5, fontWeight: 600, width: 42, flexShrink: 0 }}>{stat.mil}</span>
                    <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'rgba(255,255,255,.08)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(g.val / max * 100)}%`, height: '100%', borderRadius: 4, background: c }} />
                    </div>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: c, width: 26, textAlign: 'right', flexShrink: 0 }}>+{g.val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ textAlign: 'center', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--hair)' }}>
          <div style={{ fontSize: 11, color: 'var(--sub)' }}>새 칭호</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 6 }}>
            {Icon('trophy', { size: 18, color: 'var(--accent)', stroke: 2 })}
            <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)' }}>{w.newTitle}</span>
          </div>
        </div>
      </Card>
      <div style={{ marginTop: 14 }}><Btn icon="share">카톡에 공유</Btn></div>
    </div>
  );
}

function SheetShell({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(6,8,11,.6)', backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'tmFade .2s both' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg)', boxShadow: '0 -1px 0 var(--line), 0 -20px 60px rgba(0,0,0,.5)',
        borderRadius: '26px 26px 0 0', padding: '14px 22px 38px', animation: 'tmSheet .32s cubic-bezier(.2,.8,.2,1) both' }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--line)', margin: '0 auto 18px' }} />
        {children}
      </div>
    </div>
  );
}

window.CheckInSheet = CheckInSheet;
window.QuestComplete = QuestComplete;
window.Wrapped = Wrapped;
})();
