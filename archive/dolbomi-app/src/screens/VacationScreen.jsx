import { Icon } from '../icons';
import { Card, ProgressBar } from '../components/ui';
import { STATUS } from '../icons';
import { useStore } from '../store';

export function VacationScreen({ onOpenOpp }) {
  const catalog = useStore((s) => s.catalog);
  const vacation = useStore((s) => s.vacation);
  const vacOpps = catalog.filter((o) => o.reward.kind === '휴가');
  const started = vacOpps.filter((o) => o.started);
  const future = vacOpps.filter((o) => !o.started);

  const recommended = [...started].sort((a, b) => {
    const sa = a.status === 'on' ? 0 : a.status === 'tight' ? 1 : 2;
    const sb = b.status === 'on' ? 0 : b.status === 'tight' ? 1 : 2;
    return sa - sb || a.dday - b.dday;
  })[0];
  const inProgress = started.filter((o) => o.id !== (recommended && recommended.id));

  const maxAdd = started.reduce((a, o) => a + (o.reward.maxDays || 0), 0);
  const secured = vacation.secured;

  return (
    <div className="tm-rise">
      <Card pad={20} style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 15 }}>
          {Icon('palm', { size: 17, color: 'var(--accent)', stroke: 2 })}
          <span style={{ fontSize: 13, fontWeight: 800 }}>포상휴가</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11.5, color: 'var(--sub)', fontWeight: 600, marginBottom: 3 }}>지금 확보</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
              <span className="num" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em' }}>{secured}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--faint)' }}>일</span>
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--line)' }} />
          <div style={{ flex: 1.3 }}>
            <div style={{ fontSize: 11.5, color: 'var(--accent)', fontWeight: 700, marginBottom: 3 }}>진행 중인 도전을 다 해내면</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, color: 'var(--accent)' }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>최대</span>
              <span className="num" style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em' }}>+{maxAdd}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>일</span>
            </div>
          </div>
        </div>
      </Card>

      {recommended && (
        <VSection label="추천" sub="지금 가장 가까운 휴가" accent>
          <RecHero o={recommended} onOpenOpp={onOpenOpp} />
        </VSection>
      )}

      {inProgress.length > 0 && (
        <VSection label="진행 중" sub={`${inProgress.length}개`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {inProgress.map((o) => <LadderRow key={o.id} o={o} onOpenOpp={onOpenOpp} />)}
          </div>
        </VSection>
      )}

      {future.length > 0 && (
        <VSection label="더 노려볼 수 있는 것" sub="아직 시작 전">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {future.map((o) => <LadderRow key={o.id} o={o} onOpenOpp={onOpenOpp} muted />)}
          </div>
        </VSection>
      )}

      <div style={{ display: 'flex', gap: 9, padding: '6px 4px 0' }}>
        {Icon('info', { size: 15, color: 'var(--faint)' })}
        <p style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--faint)', textWrap: 'pretty' }}>
          자기개발 포상휴가는 <span style={{ color: 'var(--sub)', fontWeight: 600 }}>부대 내규(지휘관 재량)</span>예요. 보통 2~5일로 부대마다 달라요.
        </p>
      </div>
    </div>
  );
}

function VSection({ label, sub, accent, children }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 11px' }}>
        <span style={{ width: 4, height: 14, borderRadius: 2, background: accent ? 'var(--accent)' : 'var(--faint)', flexShrink: 0 }} />
        <span style={{ fontSize: 13.5, fontWeight: 800, color: accent ? 'var(--accent)' : 'var(--ink)' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 'auto' }}>{sub}</span>
      </div>
      {children}
    </section>
  );
}

function RecHero({ o, onOpenOpp }) {
  const st = STATUS[o.status];
  return (
    <Card glow pad={17} onClick={() => onOpenOpp(o)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, marginBottom: 13 }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(var(--accent-rgb),.13)', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.28)' }}>
          {Icon('palm', { size: 22, color: 'var(--accent)', stroke: 2 })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.sub}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-.02em' }}>{o.reward.finish}</span>
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: o.dday <= 14 ? 'var(--accent)' : 'var(--faint)' }}>D-{o.dday}</span>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.5, marginBottom: 13, textWrap: 'pretty' }}>{o.why}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 13 }}>
        <div style={{ flex: 1 }}><ProgressBar pct={o.fill} height={7} color={st.c} marker={o.expectedPct} glow /></div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: st.c, flexShrink: 0 }}>
          <span style={{ width: 7, height: 7, borderRadius: 999, background: st.c }} />{o.fill}%
        </span>
      </div>
      <div className="tm-tap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '11px', borderRadius: 'var(--r-md)',
        background: 'var(--accent)', color: 'var(--on-accent)', fontSize: 13.5, fontWeight: 700 }}>
        이어서 하기 {Icon('arrowR', { size: 16, color: 'var(--on-accent)', stroke: 2.2 })}
      </div>
    </Card>
  );
}

function LadderRow({ o, onOpenOpp, muted }) {
  const st = STATUS[o.status];
  return (
    <Card onClick={() => onOpenOpp(o)} pad={14} style={{ opacity: muted ? 0.82 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: muted ? 0 : 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface2)', boxShadow: `inset 0 0 0 1px ${muted ? 'var(--line)' : st.c + '66'}` }}>
          {Icon('palm', { size: 17, color: muted ? 'var(--faint)' : st.c, stroke: 2 })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.title}</div>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>{muted ? '시작 전 · ' : ''}{o.reward.note}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: muted ? 'var(--sub)' : 'var(--accent)' }}>{o.reward.finish}</span>
          {Icon('chevR', { size: 16, color: 'var(--faint)' })}
        </div>
      </div>
      {!muted && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ flex: 1 }}><ProgressBar pct={o.fill} height={6} color={st.c} marker={o.expectedPct} /></div>
          <span className="num" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--sub)', flexShrink: 0 }}>{o.fill}%</span>
        </div>
      )}
    </Card>
  );
}
