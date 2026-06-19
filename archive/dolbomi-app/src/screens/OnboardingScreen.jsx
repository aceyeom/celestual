// Onboarding — 4 steps, one decision each (design revamp v2 S7):
//   1) 기본 (이름·군별·복무 기간)  2) 수호신 (illustrated choice)
//   3) 전역 목표  4) 관심사 → 끝, 바로 첫 체크인으로.
// 계급·병과·부대는 기본값으로 시작하고 설정/프로필에서 채울 수 있어요 —
// 첫 1분의 결정은 셋이면 충분하다.
import { useMemo, useState } from 'react';
import { Icon } from '../icons';
import { Btn } from '../components/ui';
import { RANKS, BRANCH_INFO, BRANCHES, INTERESTS, GOAL_TEMPLATES } from '../data';
import { CREATURE_PATHS } from '../components/creature/CreatureHero';
import { GUARDIAN_ART } from '../assets/manifest';

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 12, border: 'none',
  background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)', color: 'var(--ink)',
  fontSize: 14.5, fontFamily: 'inherit', outline: 'none',
};

function Label({ children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 8px' }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--sub)', letterSpacing: '.02em' }}>{children}</span>
      {hint && <span style={{ fontSize: 10.5, color: 'var(--faint)' }}>{hint}</span>}
    </div>
  );
}

const GUARDIAN_LINE = {
  haechi: '정의의 수호수 · 흔들리지 않는 균형과 꾸준함',
  dragon: '동방의 수호룡 · 높이 비상하는 도전과 기개',
};

const addMonths = (iso, n) => {
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '';
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};

const STEPS = ['기본', '수호신', '목표', '관심사'];

export function OnboardingScreen({ soldier, onComplete }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState(soldier?.name && soldier.name !== '병사' ? soldier.name : '');
  const [branch, setBranch] = useState(soldier?.branch || '육군');
  const [enlist, setEnlist] = useState(soldier?.enlistDate || '');
  const [discharge, setDischarge] = useState(soldier?.dischargeDate || '');
  const [dischargeTouched, setDischargeTouched] = useState(!!soldier?.dischargeDate);
  const [path, setPath] = useState(soldier?.path === 'dragon' ? 'dragon' : 'haechi');
  const [goal, setGoal] = useState(soldier?.goal || null);
  const [interests, setInterests] = useState(soldier?.interests || []);

  const info = BRANCH_INFO[branch] || BRANCH_INFO['육군'];

  const setEnlistAuto = (v) => {
    setEnlist(v);
    if (!dischargeTouched && v) setDischarge(addMonths(v, info.serviceMonths));
  };
  const pickBranch = (b) => {
    setBranch(b);
    if (!dischargeTouched && enlist) setDischarge(addMonths(enlist, (BRANCH_INFO[b] || info).serviceMonths));
  };
  const toggleInterest = (key) => {
    setInterests((cur) => cur.includes(key) ? cur.filter((k) => k !== key) : cur.length >= 5 ? cur : [...cur, key]);
  };

  const dday = useMemo(() => {
    if (!discharge) return null;
    const n = Math.round((new Date(discharge + 'T00:00:00') - new Date(new Date().toDateString())) / 86400000);
    return Number.isNaN(n) ? null : n;
  }, [discharge]);

  const valid = [
    name.trim().length > 0 && enlist && discharge && discharge > enlist,
    path === 'haechi' || path === 'dragon',
    !!goal,
    interests.length >= 1,
  ][step];

  const next = async () => {
    if (!valid || busy) return;
    if (step < STEPS.length - 1) { setStep(step + 1); return; }
    setBusy(true);
    // 계급·병과·부대 are deferred to 설정 — sensible defaults unblock the start
    const rank = soldier?.rank || '이병';
    const rankEn = (RANKS.find((r) => r.ko === rank) || {}).en || 'PVT';
    const tpl = GOAL_TEMPLATES.find((g) => g.key === goal);
    await onComplete({
      name: name.trim(), branch, rank, rankEn,
      mos: soldier?.mos || '', unit: soldier?.unit || '미지정',
      enlistDate: enlist, dischargeDate: discharge, interests, path,
      goal, targets: tpl ? tpl.targets : undefined,
    });
    setBusy(false);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* header: back + progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 20px 6px' }}>
        <button onClick={() => step > 0 && setStep(step - 1)} className="tm-tap" aria-label="이전"
          style={{ width: 36, height: 36, borderRadius: 999, border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', visibility: step > 0 ? 'visible' : 'hidden',
            background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
          {Icon('back', { size: 18, color: 'var(--ink)' })}
        </button>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 7 }}>
          {STEPS.map((s, i) => (
            <span key={s} style={{ width: i === step ? 22 : 7, height: 7, borderRadius: 999, transition: 'all .3s cubic-bezier(.2,.8,.2,1)',
              background: i <= step ? 'var(--accent)' : 'var(--line)' }} />
          ))}
        </div>
        <div style={{ width: 36, flexShrink: 0 }} />
      </div>

      <div key={step} className="tm-rise" style={{ flex: 1, overflowY: 'auto', padding: '14px 24px 24px' }}>
        {step === 0 && (
          <>
            <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.25 }}>반가워요</h1>
            <p style={{ fontSize: 13, color: 'var(--sub)', margin: '7px 0 24px', lineHeight: 1.5 }}>1분이면 끝나요.</p>
            <Label>이름</Label>
            <input style={{ ...inputStyle, marginBottom: 20 }} value={name} onChange={(e) => setName(e.target.value)} placeholder="김도현" autoFocus />
            <Label>군별</Label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 20 }}>
              {BRANCHES.map((b) => {
                const on = branch === b;
                return (
                  <button key={b} type="button" onClick={() => pickBranch(b)} className="tm-tap" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    padding: '13px 14px', borderRadius: 13, textAlign: 'left',
                    background: on ? 'rgba(var(--accent-rgb),.13)' : 'var(--surface)',
                    boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--line)' }}>
                    <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: on ? 'var(--accent)' : 'var(--ink)' }}>{b}</span>
                    <span style={{ display: 'block', fontSize: 10.5, color: 'var(--faint)', marginTop: 2 }}>복무 {BRANCH_INFO[b].serviceMonths}개월</span>
                  </button>
                );
              })}
            </div>
            <Label>입대일</Label>
            <input type="date" style={{ ...inputStyle, marginBottom: 20 }} value={enlist} onChange={(e) => setEnlistAuto(e.target.value)} />
            <Label hint={`${branch} 기준 자동 계산`}>전역 예정일</Label>
            <input type="date" style={inputStyle} value={discharge}
              onChange={(e) => { setDischarge(e.target.value); setDischargeTouched(true); }} />
            {dday != null && discharge > enlist && (
              <div style={{ marginTop: 16, padding: '13px 16px', borderRadius: 14, background: 'rgba(var(--accent-rgb),.1)',
                boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.26)', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="num" style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', letterSpacing: '-.03em' }}>D-{Math.max(0, dday)}</span>
                <span style={{ fontSize: 12, color: 'var(--sub)' }}>이 시간을 성장으로 바꿔요.</span>
              </div>
            )}
            {enlist && discharge && discharge <= enlist && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--danger, #e05252)' }}>전역일은 입대일보다 뒤여야 해요.</div>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.25 }}>함께할 수호신을 골라주세요</h1>
            <p style={{ fontSize: 13, color: 'var(--sub)', margin: '7px 0 22px', lineHeight: 1.5 }}>
              전역까지 함께해요. 성장할수록 몸이 황금으로 물들어요.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              {CREATURE_PATHS.map((p) => {
                const on = path === p.key;
                return (
                  <button key={p.key} type="button" onClick={() => setPath(p.key)} className="tm-tap" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 16, padding: '16px 16px', borderRadius: 18, textAlign: 'left',
                    background: on ? 'rgba(var(--accent-rgb),.1)' : 'var(--surface)',
                    boxShadow: on ? 'inset 0 0 0 2px var(--accent), var(--shadow)' : 'inset 0 0 0 1px var(--line), var(--shadow)' }}>
                    <img src={GUARDIAN_ART[p.key]} alt={p.ko} draggable={false}
                      style={{ width: 104, height: 104, objectFit: 'contain', flexShrink: 0, userSelect: 'none',
                        transform: on ? 'scale(1.04)' : 'none', transition: 'transform .25s cubic-bezier(.2,.8,.2,1)' }} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                        <span style={{ fontSize: 19, fontWeight: 800, color: on ? 'var(--accent)' : 'var(--ink)' }}>{p.ko}</span>
                        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: 'var(--faint)' }}>{p.en}</span>
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--sub)', marginTop: 5, lineHeight: 1.45 }}>{GUARDIAN_LINE[p.key]}</span>
                      {on && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 10.5, fontWeight: 800, color: 'var(--accent)' }}>
                        {Icon('check', { size: 12, color: 'var(--accent)', stroke: 2.6 })}나의 수호신
                      </span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: 'var(--faint)', margin: '14px 2px 0', lineHeight: 1.5 }}>
              남은 하나는 성체 단계에 동료로 찾아와요.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.25 }}>전역하는 날, 어떤 모습이고 싶나요?</h1>
            <p style={{ fontSize: 13, color: 'var(--sub)', margin: '7px 0 24px', lineHeight: 1.5 }}>
              여섯 능력치의 목표가 정해져요. 나중에 언제든 바꿀 수 있어요.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {GOAL_TEMPLATES.map((g) => {
                const on = goal === g.key;
                return (
                  <button key={g.key} type="button" onClick={() => setGoal(g.key)} className="tm-tap" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 12, padding: '15px 14px', borderRadius: 15, textAlign: 'left',
                    background: on ? 'rgba(var(--accent-rgb),.13)' : 'var(--surface)',
                    boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--line)' }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: on ? 'rgba(var(--accent-rgb),.16)' : 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
                      {Icon(g.icon, { size: 19, color: on ? 'var(--accent)' : 'var(--faint)', stroke: 1.9 })}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14.5, fontWeight: 800, color: on ? 'var(--accent)' : 'var(--ink)' }}>{g.ko}</span>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--sub)', marginTop: 3, lineHeight: 1.4 }}>{g.desc}</span>
                    </span>
                    {on && Icon('check', { size: 17, color: 'var(--accent)', stroke: 2.4 })}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.25 }}>무엇을 키우고 싶나요?</h1>
            <p style={{ fontSize: 13, color: 'var(--sub)', margin: '7px 0 24px', lineHeight: 1.5 }}>
              고른 관심사에 맞춰 퀘스트와 기회가 추천돼요. 1~5개.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
              {INTERESTS.map((it) => {
                const on = interests.includes(it.key);
                return (
                  <button key={it.key} type="button" onClick={() => toggleInterest(it.key)} className="tm-tap" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 9, padding: '13px 13px', borderRadius: 13, textAlign: 'left',
                    background: on ? 'rgba(var(--accent-rgb),.13)' : 'var(--surface)',
                    boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--line)' }}>
                    {Icon(it.icon, { size: 16, color: on ? 'var(--accent)' : 'var(--faint)', stroke: 1.9 })}
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: on ? 'var(--accent)' : 'var(--ink)' }}>{it.ko}</span>
                    {on && <span style={{ marginLeft: 'auto' }}>{Icon('check', { size: 14, color: 'var(--accent)', stroke: 2.6 })}</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--faint)', textAlign: 'center' }}>{interests.length} / 5 선택</div>
          </>
        )}
      </div>

      <div style={{ padding: '12px 24px 30px', background: 'linear-gradient(0deg, var(--bg) 70%, transparent)' }}>
        <Btn onClick={next} style={{ opacity: valid && !busy ? 1 : 0.4 }}>
          {busy ? '잠시만요…' : step === STEPS.length - 1 ? '시작하기' : '다음'}
        </Btn>
      </div>
    </div>
  );
}
