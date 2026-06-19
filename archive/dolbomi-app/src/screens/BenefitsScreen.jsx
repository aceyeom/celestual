import { useState } from 'react';
import { Icon } from '../icons';
import { Card, Tag, IconChip } from '../components/ui';
import { benefitFilters } from '../data';
import { useStore } from '../store';

const GROUPS = [
  { key: '금융',        label: '금융',          icon: 'wallet',     tint: 'var(--positive)', rgb: 'var(--positive-rgb)', desc: '정부가 원금을 얹어줘요' },
  { key: '자격증·어학', label: '자격증 · 어학', icon: 'craft',      tint: 'var(--accent)',   rgb: 'var(--accent-rgb)',   desc: '응시료를 지원받을 수 있어요' },
  { key: '교육·학점',   label: '교육 · 학점',   icon: 'graduation', tint: '#9B8CF5',         rgb: '155,140,245',         desc: '시간만 내면 학점·수료증이 돼요' },
  { key: '군별 전용',   label: '군별 전용',     icon: 'shield',     tint: 'var(--accent)',   rgb: 'var(--accent-rgb)',   desc: '내 군에서만 받을 수 있어요' },
  { key: '전역 준비',   label: '전역 준비',     icon: 'briefcase',  tint: 'var(--sub)',      rgb: '255,255,255',         desc: '전역 직후로 이어져요' },
];
const GROUP_OF = {
  b1: '금융', b7: '금융', b3: '자격증·어학', b6: '자격증·어학', b2: '자격증·어학',
  b4: '교육·학점', b5: '교육·학점', b8: '군별 전용', b9: '군별 전용', b10: '군별 전용', b11: '전역 준비',
};
const PASSIVE = { b1: true, b7: true };
// A benefit shows for the selected branch when it is universal (전군) or tagged
// to that branch (LOGIC-GAPS F6 — the filter used to be a no-op).
const matchesBranch = (b, branch) => (b.branches || ['전군']).some((x) => x === '전군' || x === branch);

export function BenefitsScreen({ onMakeQuest, soldier }) {
  const benefits = useStore((s) => s.benefits);
  const storeSoldier = useStore((s) => s.soldier);
  const [branch, setBranch] = useState((soldier || storeSoldier)?.branch || '전군');
  const grouped = GROUPS
    .map((g) => ({ ...g, items: benefits.filter((b) => GROUP_OF[b.id] === g.key && matchesBranch(b, branch)) }))
    .filter((g) => g.items.length);

  return (
    <div className="tm-rise">
      <Card pad={14} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 11 }}>
        <IconChip name="shield" tone="positive" size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>군인이라서 받을 수 있는 것들</div>
          <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 2, lineHeight: 1.4 }}>개인 정보는 <span style={{ color: 'var(--positive)', fontWeight: 700 }}>저장하지 않아요</span></div>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 7, marginBottom: 22 }}>
        {benefitFilters.군별.map((b) => {
          const on = branch === b;
          return <button key={b} onClick={() => setBranch(b)} className="tm-tap" style={{ flex: 1, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            padding: '8px 0', borderRadius: 10, fontSize: 12.5, fontWeight: 700, background: on ? 'var(--accent)' : 'var(--surface)',
            color: on ? 'var(--on-accent)' : 'var(--sub)', boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--line)' }}>{b}</button>;
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {grouped.map((g) => (
          <section key={g.key}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 2px 11px' }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `rgba(${g.rgb},.12)`, boxShadow: `inset 0 0 0 1px rgba(${g.rgb},.24)` }}>
                {Icon(g.icon, { size: 15, color: g.tint, stroke: 2 })}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '-.01em' }}>{g.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 1 }}>{g.desc}</div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', flexShrink: 0 }}>{g.items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {g.items.map((b) => <BenefitCard key={b.id} b={b} group={g} onMakeQuest={onMakeQuest} />)}
            </div>
          </section>
        ))}
      </div>

      <div style={{ textAlign: 'center', fontSize: 10.5, color: 'var(--faint)', marginTop: 22, lineHeight: 1.5 }}>
        혜택과 자격 기준은 부대·시기에 따라 다를 수 있어요
      </div>
    </div>
  );
}

function BenefitCard({ b, group, onMakeQuest }) {
  const passive = PASSIVE[b.id];
  return (
    <Card pad={0} glow={b.headline} style={{ overflow: 'hidden',
      background: b.headline ? `linear-gradient(135deg, rgba(${group.rgb},.10), var(--surface) 64%)` : 'var(--surface)' }}>
      <div style={{ display: 'flex', gap: 12, padding: '14px 15px 12px' }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `rgba(${group.rgb},.13)`, boxShadow: `inset 0 0 0 1px rgba(${group.rgb},.26)` }}>
          {Icon(b.icon, { size: 22, color: group.tint, stroke: 1.9 })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 14.5, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.25 }}>{b.title}</span>
            {b.headline && <Tag tone="accent" icon="star" style={{ flexShrink: 0 }}>대표</Tag>}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.45, fontWeight: 500, textWrap: 'pretty' }}>{b.value}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderTop: '1px solid var(--hair)', fontSize: 11, color: 'var(--faint)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600, color: passive ? 'var(--positive)' : 'var(--sub)' }}>
          {Icon(passive ? 'check' : 'arrowUR', { size: 12, color: passive ? 'var(--positive)' : 'var(--sub)', stroke: 2 })}
          {passive ? '자동 적용' : '신청 필요'}
        </span>
        <span style={{ width: 1, height: 10, background: 'var(--line)' }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
          {Icon('pin', { size: 12, color: 'var(--faint)' })}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.where}</span>
        </span>
        {b.oppId && (
          <button onClick={() => onMakeQuest(b.oppId)} className="tm-tap" style={{ marginLeft: 'auto', flexShrink: 0, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 999,
            background: 'rgba(var(--accent-rgb),.12)', color: 'var(--accent)', fontSize: 11.5, fontWeight: 700, boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.26)' }}>
            {Icon('target', { size: 13, color: 'var(--accent)', stroke: 2.2 })}경로 보기
          </button>
        )}
      </div>
    </Card>
  );
}
