// skill-detail.jsx — tap a stat → see that skill's quests (done + remaining),
// pulled live from the opportunity catalog. Shared by Home + Profile stat lists.
(function () {
const { useState } = React;
const { Icon, Tag, StatBar } = window.TU;

const SIZE_MIN = { S: '5분', M: '20분', L: '45분' };

// gather every sub-quest tagged to this stat, across the whole catalog
function questsForStat(statKey) {
  const T = window.DOLBOMI;
  const rows = [];
  (T.catalog || []).forEach((o) => o.milestones.forEach((m) => m.subquests.forEach((s) => {
    if (s.stat === statKey) rows.push({ ...s, opp: o.title, oppId: o.id, cat: o.cat });
  })));
  // tonight's small quests too
  (T.tonight || []).forEach((q) => { if (q.stat === statKey) rows.push({ id: q.id, text: q.txt, size: 'S', xp: q.xp, done: q.done, stat: statKey, opp: '오늘 밤의 3' }); });
  return rows;
}

function SkillDetail({ statKey, onOpenOpp }) {
  const T = window.DOLBOMI;
  const c = window.TU.STAT_C[statKey] || 'var(--accent)';
  const stat = T.stats.find((s) => s.key === statKey) || {};
  const rows = questsForStat(statKey);
  const done = rows.filter((r) => r.done);
  const remain = rows.filter((r) => !r.done);
  const [showDone, setShowDone] = useState(false);
  const remainShown = remain.slice(0, 5);

  return (
    <div style={{ padding: '4px 2px 12px', animation: 'tmFade .22s both' }}>
      {/* summary strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
        padding: '9px 11px', borderRadius: 12, background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--positive)' }}>
          {Icon('check', { size: 13, color: 'var(--positive)', stroke: 2.4 })}완료 {done.length}
        </span>
        <span style={{ width: 1, height: 11, background: 'var(--line)' }} />
        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sub)' }}>남음 {remain.length}</span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--faint)' }}>
          <span style={{ color: c, fontWeight: 800 }}>{stat.cur}</span> / {stat.tgt} XP
        </span>
      </div>

      {/* remaining — the actionable list */}
      {remain.length > 0 ? (
        <>
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.06em', color: 'var(--faint)', margin: '0 2px 7px' }}>다음 할 일</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {remainShown.map((r) => (
              <div key={r.id} onClick={() => r.oppId && onOpenOpp && onOpenOpp(r.oppId)} className={r.oppId ? 'tm-tap' : ''}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 11,
                  background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--line)', cursor: r.oppId ? 'pointer' : 'default' }}>
                <span style={{ width: 7, height: 7, borderRadius: 999, background: c, flexShrink: 0, boxShadow: `0 0 7px ${c}66` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.text}</div>
                  <div style={{ fontSize: 10, color: 'var(--faint)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.opp} · {SIZE_MIN[r.size] || ''}</div>
                </div>
                <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: c, flexShrink: 0 }}>+{r.xp}</span>
                {r.oppId && Icon('chevR', { size: 14, color: 'var(--faint)' })}
              </div>
            ))}
          </div>
          {remain.length > remainShown.length && (
            <div style={{ fontSize: 11, color: 'var(--faint)', textAlign: 'center', marginTop: 8 }}>+{remain.length - remainShown.length}개 더</div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px', borderRadius: 11,
          background: 'rgba(var(--positive-rgb),.08)', boxShadow: 'inset 0 0 0 1px rgba(var(--positive-rgb),.22)' }}>
          {Icon('badgeCheck', { size: 16, color: 'var(--positive)', stroke: 2 })}
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--positive)' }}>이 능력치 퀘스트를 다 깼어</span>
        </div>
      )}

      {/* completed — collapsed by default */}
      {done.length > 0 && (
        <div style={{ marginTop: 11 }}>
          <button onClick={() => setShowDone((v) => !v)} className="tm-tap" style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 2px', background: 'transparent', color: 'var(--faint)', fontSize: 11.5, fontWeight: 700 }}>
            <span style={{ transform: showDone ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'flex' }}>{Icon('chevD', { size: 14, color: 'var(--faint)' })}</span>
            완료한 {done.length}개 보기
          </button>
          {showDone && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {done.map((r) => (
                <span key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--sub)',
                  padding: '4px 9px', borderRadius: 999, background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--hair)', textDecoration: 'line-through', textDecorationColor: 'var(--faint)' }}>
                  {Icon('check', { size: 11, color: 'var(--positive)', stroke: 2.6 })}{r.text}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// expandable stat row: full StatBar + chevron, opens SkillDetail in place
function StatRow({ s, mode = 'mono', divided = true, onOpenOpp }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: divided ? '1px solid var(--hair)' : 'none' }}>
      <button onClick={() => setOpen((v) => !v)} className="tm-tap" style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
        background: 'transparent', display: 'flex', alignItems: 'center', gap: 6, padding: 0, textAlign: 'left' }}>
        <div style={{ flex: 1, minWidth: 0 }}><StatBar s={s} mode={mode} /></div>
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .22s', display: 'flex', flexShrink: 0 }}>
          {Icon('chevD', { size: 16, color: open ? 'var(--accent)' : 'var(--faint)' })}
        </span>
      </button>
      {open && <SkillDetail statKey={s.key} onOpenOpp={onOpenOpp} />}
    </div>
  );
}

window.SkillDetail = SkillDetail;
window.StatRow = StatRow;
})();
