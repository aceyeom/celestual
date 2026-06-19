// screen-radar.jsx — Opportunity Radar (the feed). Each card previews the live bar.
(function () {
const { Icon, Card, Tag, ProgressBar, IconChip, STATUS } = window.TU;
const T = window.DOLBOMI;

function RadarScreen({ onOpenOpp }) {
  const [filter, setFilter] = React.useState('전체');
  const cats = ['전체', '대회', '자격증', '어학', '금융', '체력'];
  const list = filter === '전체' ? T.catalog : T.catalog.filter((o) => o.cat === filter);
  const urgent = T.catalog.filter((o) => o.dday <= 14).length;

  return (
    <div className="tm-rise">
      {/* summary strip */}
      <Card pad={15} style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 13 }}>
        <IconChip name="target" tone="accent" size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>너에게 맞는 기회 {T.catalog.length}개</div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)', marginTop: 2 }}>
            육군 · 상병 프로필 기준 · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{urgent}개 마감 임박</span>
          </div>
        </div>
      </Card>

      {/* category filter */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', margin: '0 -20px 16px', padding: '0 20px 2px' }}>
        {cats.map((c) => {
          const on = filter === c;
          return (
            <button key={c} onClick={() => setFilter(c)} className="tm-tap" style={{ flexShrink: 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
              background: on ? 'var(--accent)' : 'var(--surface)', color: on ? 'var(--on-accent)' : 'var(--sub)',
              boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line)' }}>{c}</button>
          );
        })}
      </div>

      {/* feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {list.map((o) => <OppCard key={o.id} o={o} onClick={() => onOpenOpp(o)} />)}
      </div>
    </div>
  );
}

function OppCard({ o, onClick }) {
  const cc = (T.cats[o.cat] || { c: 'var(--accent)' }).c;
  const st = STATUS[o.status];
  const next = o.milestones.flatMap((m) => m.subquests).find((s) => !s.done);
  const urgent = o.dday <= 14;
  const rIcon = o.reward.kind === '휴가' ? 'palm' : o.reward.kind === 'money' ? 'wallet' : o.reward.kind === 'cert' ? 'medal' : 'trophy';
  return (
    <Card onClick={onClick} pad={0} style={{ overflow: 'hidden' }}>
      {/* photo banner */}
      <div style={{ position: 'relative', height: 128, background: `linear-gradient(120deg, ${cc}30, var(--surface2))` }}>
        <img src={o.img} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,9,11,.22) 0%, rgba(8,9,11,0) 34%, rgba(8,9,11,.52) 66%, rgba(8,9,11,.88) 100%)' }} />
        {/* top row */}
        <div style={{ position: 'absolute', top: 11, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 800, color: '#fff',
            padding: '4px 9px', borderRadius: 999, background: 'rgba(10,11,13,.46)', boxShadow: `inset 0 0 0 1px ${cc}` }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: cc }} />{o.cat}
          </span>
          {o.hot && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: '#fff', padding: '4px 8px', borderRadius: 999, background: 'rgba(var(--accent-rgb),.92)' }}>{Icon('flame', { size: 11, color: '#fff', stroke: 2.4 })}주목</span>}
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, color: '#fff',
            padding: '4px 9px', borderRadius: 999, background: urgent ? 'rgba(var(--accent-rgb),.94)' : 'rgba(10,11,13,.52)' }}>D-{o.dday}</span>
        </div>
        {/* bottom: title + reward */}
        <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12 }}>
          <div style={{ fontSize: 17.5, fontWeight: 800, letterSpacing: '-.02em', color: '#fff', textShadow: '0 1px 14px rgba(0,0,0,.55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 800, color: '#fff', padding: '3px 9px', borderRadius: 999, background: 'rgba(var(--accent-rgb),.94)' }}>
              {Icon(rIcon, { size: 12.5, color: '#fff', stroke: 2.2 })}{o.reward.finish}
            </span>
            <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,.72)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{o.sub}</span>
          </div>
        </div>
      </div>
      {/* body: progress + next step */}
      <div style={{ padding: '13px 15px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: st.c, flexShrink: 0, boxShadow: `0 0 7px ${st.c}` }} />
          <div style={{ flex: 1 }}><ProgressBar pct={o.fill} height={7} color={st.c} marker={o.expectedPct} /></div>
          <span className="num" style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--sub)', flexShrink: 0 }}>{o.fill}%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 11 }}>
          <span style={{ fontSize: 11.5, color: 'var(--faint)', flexShrink: 0 }}>다음</span>
          <span style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{next ? next.text : '완료됨 🎉'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 11.5, color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>경로 {Icon('chevR', { size: 13, color: 'var(--accent)' })}</span>
        </div>
      </div>
    </Card>
  );
}

window.RadarScreen = RadarScreen;
})();
