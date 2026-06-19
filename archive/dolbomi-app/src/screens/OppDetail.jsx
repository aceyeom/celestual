import { useState } from 'react';
import { Icon } from '../icons';
import { Card, Tag, Btn, SectionHeader, IconChip } from '../components/ui';
import { cats } from '../data';
import { useStore } from '../store';
import { OppProgressBar } from './OppPlan';

const HEADER = {
  startup:    { type: 'pattern', pat: 'banner' },
  defai:      { type: 'pattern', pat: 'banner' },
  jeokgeum:   { type: 'pattern', pat: 'grid' },
  cheongnyeon:{ type: 'pattern', pat: 'grid' },
  swai:       { type: 'pattern', pat: 'circuit' },
  toeic:      { type: 'mark', mark: 'TOEIC' },
  jeongcheo:  { type: 'photo' },
  hanguksa:   { type: 'photo' },
  cheryeok:   { type: 'photo' },
  naeil:      { type: 'photo' },
};

function patternCss(pat, c) {
  if (pat === 'grid') return {
    backgroundImage: `linear-gradient(${c}22 1px, transparent 1px), linear-gradient(90deg, ${c}22 1px, transparent 1px)`,
    backgroundSize: '26px 26px', backgroundPosition: 'center',
  };
  if (pat === 'banner') return {
    backgroundImage: `repeating-linear-gradient(125deg, ${c}1f 0 14px, transparent 14px 40px)`,
  };
  if (pat === 'circuit') return {
    backgroundImage: `radial-gradient(${c}3a 1.6px, transparent 1.8px), radial-gradient(${c}1f 1.2px, transparent 1.4px)`,
    backgroundSize: '30px 30px, 30px 30px', backgroundPosition: '0 0, 15px 15px',
  };
  return { backgroundImage: `radial-gradient(${c}26 1.5px, transparent 1.6px)`, backgroundSize: '20px 20px' };
}

function OppHeader({ o }) {
  const cfg = HEADER[o.id] || { type: 'photo' };
  const cat = cats[o.cat] || { c: 'var(--accent)', icon: 'flag' };
  const cc = cat.c;
  return (
    <div style={{ position: 'relative', height: 152, borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: 14,
      background: '#0c0e11', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
      {cfg.type === 'photo' && (
        <>
          <img src={o.img} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              filter: 'grayscale(1) contrast(.92) brightness(.62)' }} />
          <div style={{ position: 'absolute', inset: 0, background: `${cc}26`, mixBlendMode: 'color' }} />
        </>
      )}
      {cfg.type === 'pattern' && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 80% at 50% 0%, ${cc}1c, transparent 70%)` }} />
          <div style={{ position: 'absolute', inset: 0, ...patternCss(cfg.pat, cc) }} />
          <div style={{ position: 'absolute', top: -22, right: -12, opacity: 0.1 }}>{Icon(cat.icon, { size: 130, color: cc, stroke: 1 })}</div>
        </>
      )}
      {cfg.type === 'mark' && (
        <>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(120% 90% at 50% 30%, ${cc}1f, transparent 72%)` }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: '-.03em', color: 'rgba(255,255,255,.13)' }}>{cfg.mark}</span>
          </div>
        </>
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(8,9,11,.30) 0%, rgba(8,9,11,0) 32%, rgba(8,9,11,.20) 64%, rgba(8,9,11,.55) 100%)' }} />
      <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, color: '#fff', padding: '4px 10px', borderRadius: 999,
          background: 'rgba(14,16,19,.5)', backdropFilter: 'blur(8px)', boxShadow: `inset 0 0 0 1px ${cc}99` }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: cc }} />{o.cat}
        </span>
        {o.hot && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#fff', padding: '4px 9px', borderRadius: 999,
          background: 'rgba(var(--accent-rgb),.9)', backdropFilter: 'blur(8px)' }}>{Icon('flame', { size: 11, color: '#fff', stroke: 2.4 })}주목</span>}
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 12.5, fontWeight: 800, color: '#fff', padding: '4px 10px', borderRadius: 999,
          background: o.dday <= 14 ? 'rgba(var(--accent-rgb),.92)' : 'rgba(14,16,19,.5)', backdropFilter: 'blur(8px)' }}>D-{o.dday}</span>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '13px 16px 14px',
        background: 'rgba(10,11,13,.46)', backdropFilter: 'blur(14px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' }}>
        <h2 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.03em', color: '#F4F6F8', lineHeight: 1.15 }}>{o.title}</h2>
        <div style={{ fontSize: 12, color: 'rgba(244,246,248,.7)', marginTop: 3 }}>{o.sub}</div>
      </div>
    </div>
  );
}

function Accordion({ icon, title, right, defaultOpen = false, tint = 'var(--faint)', children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card pad={0} style={{ marginBottom: 14, overflow: 'hidden' }}>
      <button onClick={() => setOpen((v) => !v)} className="tm-tap" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: 10, padding: '14px 15px', textAlign: 'left' }}>
        {icon && Icon(icon, { size: 17, color: tint, stroke: 2 })}
        <span style={{ fontSize: 13.5, fontWeight: 800, flex: 1, minWidth: 0 }}>{title}</span>
        {right && <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>{right}</span>}
        <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .22s', display: 'flex' }}>{Icon('chevD', { size: 16, color: 'var(--faint)' })}</span>
      </button>
      {open && <div style={{ padding: '0 15px 14px', animation: 'tmFade .2s both' }}>{children}</div>}
    </Card>
  );
}

function InfoRow({ k, v, vColor = 'var(--ink)', icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderTop: '1px solid var(--hair)' }}>
      <span style={{ fontSize: 12, color: 'var(--faint)', fontWeight: 600, width: 52, flexShrink: 0, paddingTop: 1 }}>{k}</span>
      <span style={{ flex: 1, fontSize: 12.5, color: vColor, fontWeight: 600, lineHeight: 1.45, textWrap: 'pretty', display: 'flex', alignItems: 'center', gap: 5 }}>
        {icon && Icon(icon, { size: 13, color: vColor, stroke: 2 })}{v}
      </span>
    </div>
  );
}

// owner controls for a user-created opportunity: share with everyone
// (admin reviews it) or delete it
function MineActions({ o, onDeleted }) {
  const online = useStore((s) => s.online);
  const submitUserOpp = useStore((s) => s.submitUserOpp);
  const deleteUserOpp = useStore((s) => s.deleteUserOpp);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const submitted = o.shareStatus === 'submitted';

  return (
    <Card pad={15} style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Tag tone="accent" icon="pin">내가 등록한 기회</Tag>
        {submitted && <Tag tone="positive">공유 심사 중</Tag>}
      </div>
      <div style={{ display: 'flex', gap: 9 }}>
        {online && !submitted && (
          <Btn tone="soft" size="sm" icon="share" onClick={async () => {
            if (busy) return; setBusy(true); await submitUserOpp(o); setBusy(false);
          }}>{busy ? '잠시만…' : '모두와 공유 신청'}</Btn>
        )}
        <Btn tone="ghost" size="sm" icon="x" onClick={async () => {
          if (!confirmDel) { setConfirmDel(true); return; }
          await deleteUserOpp(o); if (onDeleted) onDeleted();
        }} style={confirmDel ? { color: 'var(--danger, #e05252)' } : {}}>
          {confirmDel ? '정말 삭제할까?' : '삭제'}
        </Btn>
      </div>
      {online && !submitted && (
        <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 10, lineHeight: 1.5 }}>
          공유를 신청하면 관리자 확인 후 모든 장병의 레이더에 올라간다.
        </div>
      )}
    </Card>
  );
}

export function OppDetail({ o, ms, onOpenPlan, onAddTonight, onDeleted }) {
  const done = ms.reduce((n, m) => n + m.subquests.filter((s) => s.done).length, 0);
  const total = ms.reduce((n, m) => n + m.subquests.length, 0);
  const nextM = ms.find((m) => m.subquests.some((s) => !s.done));

  return (
    <div className="tm-rise">
      <OppHeader o={o} />
      <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--sub)', marginBottom: 16, textWrap: 'pretty' }}>{o.what}</p>

      <OppProgressBar o={o} ms={ms} />

      <div style={{ display: 'flex', gap: 10, padding: '2px 4px 16px' }}>
        {Icon('zap', { size: 16, color: 'var(--accent)', stroke: 2 })}
        <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--ink)', fontWeight: 600, textWrap: 'pretty' }}>{o.why}</p>
      </div>

      <Card pad={15} style={{ marginBottom: 14, display: 'flex', gap: 12 }}>
        <IconChip name={o.reward.kind === '휴가' ? 'palm' : o.reward.kind === 'money' ? 'wallet' : 'medal'} tone="accent" size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: 'var(--faint)', fontWeight: 700, letterSpacing: '.04em', marginBottom: 3 }}>보상</div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: 'var(--ink)' }}>{o.reward.label}</div>
          {o.reward.note && <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
            {Icon('info', { size: 12, color: 'var(--faint)' })} {o.reward.note}</div>}
        </div>
      </Card>

      <Accordion icon="badgeCheck" title="신청 정보" right={o.cost === '무료' || o.cost.includes('무료') ? '무료' : null} tint="var(--accent)" defaultOpen={true}>
        <InfoRow k="자격" v={o.eligibility} />
        <InfoRow k="비용" v={o.cost} icon={o.cost.includes('무료') ? 'check' : 'coins'} vColor={o.cost.includes('무료') ? 'var(--positive)' : 'var(--ink)'} />
        <InfoRow k="신청처" v={o.applyWhere} icon="pin" />
        <InfoRow k="출처" v={`${o.source} · ${o.verified} 확인`} vColor="var(--sub)" />
      </Accordion>

      <SectionHeader right={`${done}/${total} 완료`} caption="AI가 짠 마감까지의 경로">퀘스트 경로</SectionHeader>
      <Card pad={0} style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '6px 15px' }}>
          {ms.map((m, mi) => {
            const dn = m.subquests.filter((s) => s.done).length;
            const complete = dn === m.subquests.length;
            const isNext = nextM && m.id === nextM.id;
            const last = mi === ms.length - 1;
            return (
              <div key={m.id} style={{ display: 'flex', gap: 12, paddingTop: mi === 0 ? 10 : 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: complete ? 'var(--accent)' : (isNext ? 'rgba(var(--accent-rgb),.15)' : 'var(--surface2)'),
                    boxShadow: complete ? 'none' : `inset 0 0 0 ${isNext ? 1.5 : 1}px ${isNext ? 'var(--accent)' : 'var(--line)'}` }}>
                    {complete ? Icon('check', { size: 13, color: 'var(--on-accent)', stroke: 2.6 }) : <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: isNext ? 'var(--accent)' : 'var(--faint)' }}>{mi + 1}</span>}
                  </div>
                  {!last && <div style={{ width: 2, flex: 1, minHeight: 16, background: 'var(--hair)', margin: '3px 0' }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingBottom: last ? 12 : 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: complete ? 'var(--sub)' : 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.title}</span>
                    {isNext && <Tag tone="accent" style={{ fontSize: 9, padding: '0 6px', flexShrink: 0 }}>다음</Tag>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 1 }}>{m.date} · {dn}/{m.subquests.length} 완료</div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onOpenPlan} className="tm-tap" style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '13px', borderTop: '1px solid var(--hair)',
          background: 'rgba(var(--accent-rgb),.1)', color: 'var(--accent)', fontSize: 13.5, fontWeight: 700 }}>
          {Icon('target', { size: 16, color: 'var(--accent)', stroke: 2 })} 전체 계획 열고 퀘스트 하기
          {Icon('chevR', { size: 15, color: 'var(--accent)' })}
        </button>
      </Card>

      <Btn tone="ghost" icon="plus" onClick={onAddTonight}>오늘 밤의 3에 추가</Btn>

      {o.mine && <MineActions o={o} onDeleted={onDeleted} />}
    </div>
  );
}
