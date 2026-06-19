import { useMemo, useState } from 'react';
import { Icon } from '../icons';
import { Card, ProgressBar } from '../components/ui';
import { cats, radarCats } from '../data';
import { CAT_ART, SPOT, Art } from '../assets/manifest';
import { useStore } from '../store';
import { VacationScreen } from './VacationScreen';
import { BenefitsScreen } from './BenefitsScreen';

// 기회 tab = three jobs in one place: explore real programs (탐색), track the
// army's reward currency (휴가), and claim what you're owed (혜택). The latter
// two are browse-content, so they live as segments instead of nav tabs.
const SEGMENTS = [
  { key: 'explore', ko: '탐색', icon: 'target' },
  { key: 'vacation', ko: '휴가', icon: 'palm' },
  { key: 'benefits', ko: '혜택', icon: 'shieldGift' },
];

export function RadarScreen({ onOpenOpp, onAddOpp, onMakeQuest, soldier }) {
  const [seg, setSeg] = useState('explore');

  return (
    <div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 16 }}>
        {SEGMENTS.map((s) => {
          const on = seg === s.key;
          return (
            <button key={s.key} onClick={() => setSeg(s.key)} className="tm-tap" style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '10px 0', borderRadius: 12,
              fontSize: 13, fontWeight: 700, background: on ? 'var(--accent)' : 'var(--surface)',
              color: on ? 'var(--on-accent)' : 'var(--sub)', boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line)' }}>
              {Icon(s.icon, { size: 15, color: on ? 'var(--on-accent)' : 'var(--sub)', stroke: 2 })}{s.ko}
            </button>
          );
        })}
      </div>
      <div key={seg} className="tm-rise">
        {seg === 'explore' && <ExploreList onOpenOpp={onOpenOpp} onAddOpp={onAddOpp} soldier={soldier} />}
        {seg === 'vacation' && <VacationScreen onOpenOpp={onOpenOpp} />}
        {seg === 'benefits' && <BenefitsScreen onMakeQuest={onMakeQuest} soldier={soldier} />}
      </div>
    </div>
  );
}

function ExploreList({ onOpenOpp, onAddOpp, soldier }) {
  const catalog = useStore((s) => s.catalog);
  const storeSoldier = useStore((s) => s.soldier);
  const me = soldier || storeSoldier;
  const [filter, setFilter] = useState('전체');
  const catList = radarCats;
  const interests = useMemo(() => me?.interests || [], [me]);

  // 맞춤 우선: interest-matching first, then by closest (unlocked) deadline —
  // user-created entries always pinned on top so they're easy to find again
  const list = useMemo(() => {
    const matches = (o) => (o.tags || []).some((t) => interests.includes(t));
    return catalog
      .filter((o) => filter === '전체' || o.cat === filter)
      .map((o) => ({ o, m: matches(o) }))
      .sort((a, b) =>
        (b.o.mine === true) - (a.o.mine === true)
        || b.m - a.m
        || (a.o.locked === true) - (b.o.locked === true)
        || a.o.dday - b.o.dday);
  }, [catalog, filter, interests]);

  const urgent = catalog.filter((o) => !o.locked && o.dday <= 14).length;
  const matched = catalog.filter((o) => (o.tags || []).some((t) => interests.includes(t))).length;

  return (
    <div>
      <Card pad={15} style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 13 }}>
        <Art src={SPOT.target} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>맞춤 기회 {matched ? `${matched}개` : `${catalog.length}개`}</div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)', marginTop: 2 }}>
            마감 임박 <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{urgent}개</span>
          </div>
        </div>
        <button onClick={onAddOpp} className="tm-tap" aria-label="기회 직접 추가" style={{ border: 'none', cursor: 'pointer', flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 13px', borderRadius: 999,
          background: 'rgba(var(--accent-rgb),.13)', color: 'var(--accent)', fontSize: 12, fontWeight: 800, fontFamily: 'inherit',
          boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.3)' }}>
          {Icon('plus', { size: 14, color: 'var(--accent)', stroke: 2.4 })}직접 추가
        </button>
      </Card>

      <div style={{ display: 'flex', gap: 7, overflowX: 'auto', margin: '0 -20px 16px', padding: '0 20px 2px' }}>
        {catList.map((c) => {
          const on = filter === c;
          return (
            <button key={c} onClick={() => setFilter(c)} className="tm-tap" style={{ flexShrink: 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
              background: on ? 'var(--accent)' : 'var(--surface)', color: on ? 'var(--on-accent)' : 'var(--sub)',
              boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line)' }}>{c}</button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {list.map(({ o, m }) => <OppCard key={o.id} o={o} matched={m} onClick={() => onOpenOpp(o)} />)}
      </div>
    </div>
  );
}

// one illustration, one chip, one reward line (design revamp v2 S4) —
// everything else lives in the detail sheet
function OppCard({ o, matched, onClick }) {
  const cc = (cats[o.cat] || { c: 'var(--accent)' }).c;
  const urgent = !o.locked && o.dday <= 14;
  // single chip, by priority: 해금 → 마감 임박 → 내 등록 → 맞춤
  const chip = o.locked ? { txt: `D-${o.unlockDday} 해금`, c: 'var(--faint)', icon: 'shield' }
    : urgent ? { txt: `D-${o.dday}`, c: 'var(--accent)', icon: 'flame' }
    : o.mine ? { txt: '내 등록', c: 'var(--sub)', icon: 'pin' }
    : matched ? { txt: '맞춤', c: 'var(--positive)', icon: 'heart' }
    : null;
  return (
    <Card onClick={onClick} pad={14} style={{ opacity: o.locked ? 0.66 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${cc}14`, boxShadow: `inset 0 0 0 1px ${cc}2e` }}>
          <Art src={o.locked ? SPOT.locked : (CAT_ART[o.cat] || SPOT.target)} size={38} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{o.title}</span>
            {chip && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, color: chip.c, flexShrink: 0,
                padding: '2px 8px', borderRadius: 999, background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
                {Icon(chip.icon, { size: 10.5, color: chip.c, stroke: 2.2 })}{chip.txt}
              </span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>{o.reward.finish}</span> · {o.sub}
          </div>
          {o.started && o.fill > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <div style={{ flex: 1 }}><ProgressBar pct={o.fill} height={5} color="var(--accent)" /></div>
              <span className="num" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--sub)', flexShrink: 0 }}>{o.fill}%</span>
            </div>
          )}
        </div>
        {Icon('chevR', { size: 16, color: 'var(--faint)' })}
      </div>
    </Card>
  );
}
