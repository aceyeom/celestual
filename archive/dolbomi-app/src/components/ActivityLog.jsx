import React from 'react';
import { Icon, STAT_C } from '../icons';
import { Card, Tag } from './ui';
import { wrapped } from '../data';
import { useStore } from '../store';

const won = (n) => n >= 10000 ? `${(n / 10000).toFixed(n % 10000 ? 1 : 0)}만원` : `${n.toLocaleString()}원`;

const KIND = {
  quest:     { icon: (s) => s, color: (s) => STAT_C[s] || 'var(--accent)', ring: true },
  checkin:   { icon: () => 'moon',      color: () => 'var(--positive)' },
  money:     { icon: () => 'wallet',   color: () => 'var(--positive)' },
  title:     { icon: () => 'trophy',   color: () => 'var(--accent)' },
  milestone: { icon: () => 'flag',     color: () => 'var(--accent)' },
  cert:      { icon: () => 'badgeCheck',color: () => 'var(--positive)' },
};

function LogEntry({ e, first, last }) {
  const k = KIND[e.type] || KIND.quest;
  const c = k.color(e.stat);
  const ic = k.icon(e.stat);
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ width: 2, height: 8, background: first ? 'transparent' : 'var(--hair)' }} />
        <div style={{ width: 30, height: 30, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          background: `${typeof c === 'string' && c.startsWith('var') ? 'var(--surface2)' : c + '1c'}`,
          boxShadow: `inset 0 0 0 1.5px ${c}` }}>
          {Icon(ic, { size: 15, color: c, stroke: 2 })}
        </div>
        <div style={{ width: 2, flex: 1, minHeight: 8, background: last ? 'transparent' : 'var(--hair)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '5px 0 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, flex: 1, minWidth: 0, textWrap: 'pretty' }}>{e.text}</span>
          {e.xp > 0 && <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: c, flexShrink: 0 }}>+{e.xp}</span>}
          {e.amount && <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--positive)', flexShrink: 0 }}>+{won(e.amount)}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
          <span style={{ fontSize: 10.5, color: 'var(--faint)' }}>{e.day} · {e.time}</span>
          {e.streak && <Tag tone="positive" icon="flame" style={{ fontSize: 9, padding: '0 6px' }}>{e.streak}일</Tag>}
          {e.type === 'title' && <Tag tone="accent" style={{ fontSize: 9, padding: '0 6px' }}>칭호</Tag>}
          {e.type === 'cert' && <Tag tone="positive" style={{ fontSize: 9, padding: '0 6px' }}>자격</Tag>}
        </div>
      </div>
    </div>
  );
}

function ActivityLog({ onOpenRecap }) {
  const activity = useStore((s) => s.activity);
  const [expanded, setExpanded] = React.useState(false);
  const all = activity || [];
  const shown = expanded ? all : all.slice(0, 5);
  const w = wrapped;
  const maxWeek = Math.max(...(w.weekly || [1]));
  const questCount = all.filter((e) => e.type === 'quest').length; // derived, not hardcoded (J2)

  return (
    <div>
      <Card glow pad={0} onClick={onOpenRecap} style={{ overflow: 'hidden', marginBottom: 14,
        background: 'linear-gradient(150deg, rgba(var(--accent-rgb),.12), var(--surface) 62%)' }}>
        <div style={{ padding: '15px 16px 13px', display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(var(--accent-rgb),.16)', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.34)' }}>
            {Icon('trophy', { size: 19, color: 'var(--accent)', stroke: 2 })}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>{w.month} 월간 결산</div>
            <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 1 }}>{w.line}</div>
          </div>
          {Icon('chevR', { size: 18, color: 'var(--faint)' })}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 16px 14px', height: 56 }}>
          {w.weekly.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{ width: '100%', height: Math.round(34 * v / maxWeek) + 4, borderRadius: 5, background: i === w.weekly.length - 1 ? 'var(--accent)' : 'rgba(var(--accent-rgb),.3)' }} />
              <span style={{ fontSize: 9, color: 'var(--faint)' }}>{i + 1}주</span>
            </div>
          ))}
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--hair)', margin: '4px 4px 16px' }} />
          <div style={{ flexShrink: 0, textAlign: 'right', alignSelf: 'center' }}>
            <div className="num" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{questCount}</div>
            <div style={{ fontSize: 9.5, color: 'var(--faint)', marginTop: 2 }}>완료 퀘스트</div>
          </div>
        </div>
      </Card>
      <Card pad="14px 16px 4px">
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          {Icon('flag', { size: 14, color: 'var(--faint)' })}
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--sub)' }}>최근 활동</span>
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--faint)' }}>{all.length}건</span>
        </div>
        {shown.map((e, i) => <LogEntry key={i} e={e} first={i === 0} last={i === shown.length - 1} />)}
        {all.length > 5 && (
          <button onClick={() => setExpanded((v) => !v)} className="tm-tap" style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px 0 13px', background: 'transparent',
            color: 'var(--accent)', fontSize: 12.5, fontWeight: 700, borderTop: '1px solid var(--hair)', marginTop: 2 }}>
            {expanded ? '접기' : `이전 활동 ${all.length - 5}건 더 보기`}
            <span style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .2s', display: 'flex' }}>{Icon('chevD', { size: 14, color: 'var(--accent)' })}</span>
          </button>
        )}
      </Card>
    </div>
  );
}

export { ActivityLog };
