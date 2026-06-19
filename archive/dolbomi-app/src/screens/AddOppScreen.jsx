// Add a custom opportunity — base-local contests, unit programs, anything the
// shared catalog doesn't know about. Saved private to the author; from the
// detail screen they can ask an admin to publish it for everyone.
import { useState } from 'react';
import { Icon } from '../icons';
import { Btn, SectionHeader, Card } from '../components/ui';
import { cats, INTERESTS } from '../data';
import { useStore } from '../store';

const STATS = [
  { key: 'body', ko: '전투력' }, { key: 'mind', ko: '정신력' }, { key: 'money', ko: '자산력' },
  { key: 'craft', ko: '숙련도' }, { key: 'people', ko: '지휘력' }, { key: 'edge', ko: '담력' },
];
const REWARD_KINDS = [
  { key: '휴가', ko: '포상휴가' }, { key: 'cert', ko: '자격·수료' }, { key: 'money', ko: '돈·혜택' },
];
const SIZES = [
  { key: 'S', ko: '가볍게 (~5분)' }, { key: 'M', ko: '보통 (~20분)' }, { key: 'L', ko: '제대로 (~45분)' },
];

const inputStyle = {
  width: '100%', boxSizing: 'border-box', padding: '12px 13px', borderRadius: 12, border: 'none',
  background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)', color: 'var(--ink)',
  fontSize: 14, fontFamily: 'inherit', outline: 'none',
};

function Label({ children, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '16px 2px 7px' }}>
      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--sub)' }}>{children}</span>
      {hint && <span style={{ fontSize: 10.5, color: 'var(--faint)' }}>{hint}</span>}
    </div>
  );
}
function Chip({ on, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="tm-tap" style={{ flex: '0 0 auto', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      padding: '9px 13px', borderRadius: 10, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
      background: on ? 'rgba(var(--accent-rgb),.15)' : 'var(--surface)', color: on ? 'var(--accent)' : 'var(--sub)',
      boxShadow: on ? 'inset 0 0 0 1.5px var(--accent)' : 'inset 0 0 0 1px var(--line)' }}>{children}</button>
  );
}

export function AddOppScreen({ onSaved }) {
  const saveUserOpp = useStore((s) => s.saveUserOpp);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState('');
  const [cat, setCat] = useState('대회');
  const [stat, setStat] = useState('edge');
  const [deadline, setDeadline] = useState('');
  const [rewardKind, setRewardKind] = useState('휴가');
  const [rewardFinish, setRewardFinish] = useState('');
  const [what, setWhat] = useState('');
  const [tags, setTags] = useState([]);
  const [steps, setSteps] = useState([{ text: '', size: 'M' }]);

  const setStep = (i, patch) => setSteps((cur) => cur.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const toggleTag = (k) => setTags((cur) => cur.includes(k) ? cur.filter((x) => x !== k) : cur.length >= 3 ? cur : [...cur, k]);

  const validSteps = steps.filter((s) => s.text.trim());
  const ready = title.trim() && deadline && validSteps.length >= 1;

  const save = async () => {
    if (!ready || busy) return;
    setBusy(true);
    const id = await saveUserOpp({
      title: title.trim(), cat, stat, deadline,
      reward: { kind: rewardKind, finish: rewardFinish.trim() || (rewardKind === '휴가' ? '+α일' : '완료'), maxDays: 0 },
      what: what.trim(), sub: '직접 등록 · 부대 로컬',
      tags, steps: validSteps.map((s) => ({ text: s.text.trim(), size: s.size })),
    });
    setBusy(false);
    if (id && onSaved) onSaved(id);
  };

  return (
    <div className="tm-rise">
      <Card pad={14} style={{ marginBottom: 4, display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        {Icon('pin', { size: 17, color: 'var(--accent)', stroke: 2 })}
        <div style={{ fontSize: 12, color: 'var(--sub)', lineHeight: 1.55 }}>
          부대 안의 대회, 우리만 아는 프로그램 — 카탈로그에 없는 기회를 직접 등록하자.
          일단 <b style={{ color: 'var(--ink)' }}>나에게만 보이고</b>, 공유를 신청하면 관리자 확인 후 모두에게 열린다.
        </div>
      </Card>

      <Label>이름</Label>
      <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예) 대대 축구대회 우승" />

      <Label>분류</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {Object.keys(cats).map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>

      <Label hint="완료하면 어떤 능력치가 크는가">키울 능력치</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {STATS.map((s) => <Chip key={s.key} on={stat === s.key} onClick={() => setStat(s.key)}>{s.ko}</Chip>)}
      </div>

      <Label>마감일</Label>
      <input type="date" style={inputStyle} value={deadline} onChange={(e) => setDeadline(e.target.value)} />

      <Label>보상</Label>
      <div style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
        {REWARD_KINDS.map((r) => <Chip key={r.key} on={rewardKind === r.key} onClick={() => setRewardKind(r.key)}>{r.ko}</Chip>)}
      </div>
      <input style={inputStyle} value={rewardFinish} onChange={(e) => setRewardFinish(e.target.value)}
        placeholder={rewardKind === '휴가' ? '예) +2일' : rewardKind === 'money' ? '예) 상금 30만' : '예) 수료증'} />

      <Label hint="선택 · 최대 3개">관심사 태그</Label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {INTERESTS.map((it) => <Chip key={it.key} on={tags.includes(it.key)} onClick={() => toggleTag(it.key)}>{it.ko}</Chip>)}
      </div>

      <Label hint="선택">설명</Label>
      <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} value={what}
        onChange={(e) => setWhat(e.target.value)} placeholder="무엇이고, 왜 해볼 만한가" />

      <SectionHeader style={{ marginTop: 22 }} caption="마감까지 해야 할 일을 작게 쪼개자 · 최대 12개">실행 단계</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {steps.map((s, i) => (
          <Card key={i} pad={11}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="mono" style={{ fontSize: 11, fontWeight: 800, color: 'var(--faint)', width: 18, flexShrink: 0, textAlign: 'center' }}>{i + 1}</span>
              <input style={{ ...inputStyle, padding: '10px 11px' }} value={s.text}
                onChange={(e) => setStep(i, { text: e.target.value })} placeholder="예) 팀원 모으기" />
              {steps.length > 1 && (
                <button onClick={() => setSteps((cur) => cur.filter((_, j) => j !== i))} className="tm-tap" aria-label="단계 삭제"
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                  {Icon('x', { size: 15, color: 'var(--faint)', stroke: 2 })}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, marginLeft: 26 }}>
              {SIZES.map((z) => (
                <button key={z.key} onClick={() => setStep(i, { size: z.key })} className="tm-tap" style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  padding: '5px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 700,
                  background: s.size === z.key ? 'rgba(var(--accent-rgb),.15)' : 'var(--surface2)',
                  color: s.size === z.key ? 'var(--accent)' : 'var(--faint)',
                  boxShadow: s.size === z.key ? 'inset 0 0 0 1px var(--accent)' : 'inset 0 0 0 1px var(--line)' }}>{z.ko}</button>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {steps.length < 12 && (
        <Btn tone="ghost" size="sm" icon="plus" onClick={() => setSteps((cur) => [...cur, { text: '', size: 'M' }])}
          style={{ marginTop: 9 }}>단계 추가</Btn>
      )}

      <div style={{ marginTop: 20 }}>
        <Btn onClick={save} style={{ opacity: ready && !busy ? 1 : 0.4 }}>{busy ? '저장 중…' : '내 레이더에 등록'}</Btn>
      </div>
    </div>
  );
}
