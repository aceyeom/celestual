// 퀘스트 탭 — the daily action surface (design revamp v2 Q1–Q4).
//   1) check-in (it generates tonight's list, so it gates the list)
//   2) 오늘 밤의 퀘스트 — big illustrated cards · hold to complete · tap for
//      the plain-language detail sheet (un-complete lives there too)
//   3) 이어서 하기 — horizontal resume cards for every started track
//   4) 오늘의 기록 — what already landed today
import { useMemo, useState, useRef, useEffect } from 'react';
import { Icon, STAT_C } from '../icons';
import { Card, SectionHeader, Donut } from '../components/ui';
import { STAT_ART, SPOT, Art } from '../assets/manifest';
import { seoulToday, questInfoOf, rawQuestPool, INTERESTS } from '../data';
import { useStore } from '../store';

const HOLD_MS = 650;

export function QuestScreen({ soldier, stats, quests, mood, onToggleQuest, onOpenCheckin, onOpenPlan, onGoRadar }) {
  const catalog = useStore((s) => s.catalog);
  const activity = useStore((s) => s.activity) || [];
  const online = useStore((s) => s.online);
  const [detail, setDetail] = useState(null); // quest in the bottom sheet

  const checkedIn = online ? soldier.lastCheckinDate === seoulToday() : !!mood;
  const done = quests.filter((q) => q.done).length;

  const tracks = useMemo(() =>
    (catalog || [])
      .filter((o) => o.started && !o.locked && o.fill < 100)
      .sort((a, b) => a.dday - b.dday),
  [catalog]);

  const todayLog = activity.filter((a) => a.day === '오늘' && a.type === 'quest').slice(0, 5);

  return (
    <div className="tm-rise">
      {checkedIn ? (
        <Card onClick={onOpenCheckin} pad={13} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          {mood ? <span style={{ fontSize: 21 }}>{mood.emoji}</span> : <Art src={SPOT.check} size={26} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>오늘 체크인 완료{mood ? ` · ${mood.label}` : ''}</div>
            <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 1 }}>컨디션이 바뀌었다면 눌러서 다시 받을 수 있어요</div>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--positive)', fontWeight: 700, flexShrink: 0 }}>
            {Icon('flame', { size: 13, color: 'var(--positive)', stroke: 2 })}{soldier.streak}일
          </span>
        </Card>
      ) : (
        <Card onClick={onOpenCheckin} glow pad={16} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 13 }}>
          <Art src={SPOT.moon} size={44} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>오늘의 체크인</div>
            <div style={{ fontSize: 11.5, color: 'var(--sub)', marginTop: 2 }}>컨디션에 맞춰 오늘 밤의 퀘스트를 받아요</div>
          </div>
          {Icon('chevR', { size: 18, color: 'var(--accent)' })}
        </Card>
      )}

      <SectionHeader right={checkedIn ? `${done} / ${quests.length} 완료` : '체크인 후 공개'}>오늘 밤의 퀘스트</SectionHeader>
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, filter: checkedIn ? 'none' : 'blur(5px)', pointerEvents: checkedIn ? 'auto' : 'none' }}>
          {quests.map((q, i) => (
            <QuestCard key={q.id} q={q} stats={stats} soldier={soldier} index={i}
              onComplete={() => !q.done && onToggleQuest(q.id)} onOpen={() => setDetail(q)} />
          ))}
          {quests.length === 0 && (
            <Card pad={22} style={{ textAlign: 'center' }}>
              <Art src={SPOT.moon} size={44} style={{ margin: '0 auto 8px', display: 'block' }} />
              <div style={{ color: 'var(--sub)', fontSize: 12.5 }}>체크인하면 오늘의 퀘스트가 도착해요</div>
            </Card>
          )}
        </div>
        {!checkedIn && quests.length > 0 && (
          <button onClick={onOpenCheckin} className="tm-tap" style={{ position: 'absolute', inset: 0, border: 'none', cursor: 'pointer',
            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, color: 'var(--ink)',
              padding: '10px 16px', borderRadius: 999, background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--line), var(--shadow)' }}>
              {Icon('moon', { size: 15, color: 'var(--accent)', stroke: 2 })}체크인하고 퀘스트 받기
            </span>
          </button>
        )}
      </div>

      <SectionHeader right={tracks.length ? `${tracks.length}개 진행 중` : null}>이어서 하기</SectionHeader>
      {tracks.length > 0 ? (
        <div style={{ display: 'flex', gap: 11, overflowX: 'auto', margin: '0 -20px 24px', padding: '2px 20px 6px' }}>
          {tracks.map((o) => <ResumeCard key={o.id} o={o} onOpen={() => onOpenPlan(o)} />)}
        </div>
      ) : (
        <Card onClick={onGoRadar} pad={15} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <Art src={SPOT.target} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>아직 진행 중인 도전이 없어요</div>
            <div style={{ fontSize: 11, color: 'var(--sub)', marginTop: 1 }}>기회 탭에서 자격증·대회·적금을 시작해보세요</div>
          </div>
          {Icon('chevR', { size: 16, color: 'var(--faint)' })}
        </Card>
      )}

      {todayLog.length > 0 && (
        <>
          <SectionHeader right={`+${todayLog.reduce((n, a) => n + (a.xp || 0), 0)} XP`}>오늘의 기록</SectionHeader>
          <Card pad="6px 15px">
            {todayLog.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderTop: i ? '1px solid var(--hair)' : 'none' }}>
                {Icon('check', { size: 14, color: STAT_C[a.stat] || 'var(--positive)', stroke: 2.4 })}
                <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.text}</span>
                <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--gold)', flexShrink: 0 }}>+{a.xp}</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {detail && (
        <QuestSheet q={detail} stats={stats} soldier={soldier}
          onToggle={() => { onToggleQuest(detail.id); setDetail(null); }}
          onClose={() => setDetail(null)} />
      )}
    </div>
  );
}

// the single context chip — why this quest is YOURS (one max, real data only)
function chipFor(q, stats, soldier) {
  if (q.hard) return { txt: '도전 퀘스트', c: 'var(--accent)' };
  const pool = rawQuestPool.find((p) => p.txt === q.txt);
  const match = pool && (pool.tags || []).find((t) => (soldier.interests || []).includes(t));
  if (match) {
    const it = INTERESTS.find((i) => i.key === match);
    if (it) return { txt: `관심사 · ${it.ko}`, c: 'var(--positive)' };
  }
  const gap = [...stats].sort((a, b) => (b.tgt - b.cur) - (a.tgt - a.cur))[0];
  if (gap && gap.key === q.stat && gap.tgt > gap.cur) return { txt: `${gap.mil} 목표 보완`, c: STAT_C[q.stat] };
  if (q.min <= 5) return { txt: '5분이면 끝', c: 'var(--sub)' };
  return null;
}

// big illustrated quest card — hold to complete, tap for the detail sheet
function QuestCard({ q, stats, soldier, index, onComplete, onOpen }) {
  const c = STAT_C[q.stat];
  const stat = stats.find((s) => s.key === q.stat);
  const chip = !q.done && chipFor(q, stats, soldier);
  const [holding, setHolding] = useState(false);
  const timer = useRef(null);
  const fired = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  const down = () => {
    if (q.done) return; // done cards: tap opens the sheet (undo lives there)
    fired.current = false;
    setHolding(true);
    timer.current = setTimeout(() => { fired.current = true; setHolding(false); onComplete(); }, HOLD_MS);
  };
  const up = (open) => {
    clearTimeout(timer.current);
    setHolding(false);
    if (!fired.current && open) onOpen();
  };

  return (
    <div
      onPointerDown={down}
      onPointerUp={() => up(true)}
      onPointerLeave={() => up(false)}
      onPointerCancel={() => up(false)}
      className="tm-tap"
      style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)', cursor: 'pointer',
        background: 'var(--surface)', animation: `tmDeal .45s ${index * 0.07}s cubic-bezier(.2,.8,.2,1) both`,
        boxShadow: q.done ? 'inset 0 0 0 1px var(--line)' : `inset 0 0 0 1px var(--line), 0 1px 0 var(--inset), var(--shadow)`,
        opacity: q.done ? 0.6 : 1, padding: '16px 16px', display: 'flex', alignItems: 'center', gap: 14,
        userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'pan-y' }}>
      {/* hold-to-complete fill sweep */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg, rgba(var(--positive-rgb),.18), rgba(var(--positive-rgb),.28))`,
        transformOrigin: 'left', transform: holding ? 'scaleX(1)' : 'scaleX(0)',
        transition: holding ? `transform ${HOLD_MS}ms linear` : 'transform .18s ease', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', width: 54, height: 54, borderRadius: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${c}14`, boxShadow: `inset 0 0 0 1px ${c}2e` }}>
        <Art src={STAT_ART[q.stat]} size={38} />
        {q.done && (
          <span style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'rgba(var(--positive-rgb),.82)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {Icon('check', { size: 26, color: '#fff', stroke: 2.8 })}
          </span>
        )}
      </div>
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 800, letterSpacing: '-.015em', lineHeight: 1.3,
          textDecoration: q.done ? 'line-through' : 'none' }}>{q.txt}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, color: 'var(--sub)', fontWeight: 600 }}>{stat?.mil} · {q.min}분</span>
          {chip && (
            <span style={{ fontSize: 10.5, fontWeight: 700, color: chip.c, padding: '2px 8px', borderRadius: 999,
              background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>{chip.txt}</span>
          )}
        </div>
      </div>
      <span className="mono" style={{ position: 'relative', fontSize: 13.5, fontWeight: 800, color: q.done ? 'var(--faint)' : 'var(--gold)', flexShrink: 0 }}>+{q.xp}</span>
    </div>
  );
}

// detail bottom sheet — what it is, how to do it, why it was picked (Q2)
function QuestSheet({ q, stats, soldier, onToggle, onClose }) {
  const c = STAT_C[q.stat];
  const stat = stats.find((s) => s.key === q.stat);
  const info = questInfoOf(q.txt);
  const chip = chipFor(q, stats, soldier);
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 80, background: 'rgba(6,8,11,.55)', backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', animation: 'tmFade .2s both' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg)', boxShadow: '0 -1px 0 var(--line), 0 -20px 60px rgba(0,0,0,.4)',
        borderRadius: '26px 26px 0 0', padding: '14px 22px 34px', maxHeight: '82%', overflowY: 'auto', animation: 'tmSheet .32s cubic-bezier(.2,.8,.2,1) both' }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--line)', margin: '0 auto 18px' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: 17, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `${c}14`, boxShadow: `inset 0 0 0 1px ${c}2e` }}>
            <Art src={STAT_ART[q.stat]} size={40} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.3 }}>{q.txt}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ fontSize: 11.5, color: c, fontWeight: 700 }}>{stat?.mil}</span>
              <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>약 {q.min}분</span>
              <span className="mono" style={{ fontSize: 11.5, fontWeight: 800, color: 'var(--gold)' }}>+{q.xp} XP</span>
            </div>
          </div>
        </div>

        {chip && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--accent)',
            padding: '4px 11px', borderRadius: 999, background: 'rgba(var(--accent-rgb),.1)', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.24)', marginBottom: 12 }}>
            {Icon('sparkle', { size: 12, color: 'var(--accent)', stroke: 2 })}{chip.txt}으로 골랐어요
          </div>
        )}

        {info ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
            <div style={{ padding: '13px 15px', borderRadius: 14, background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--faint)', letterSpacing: '.06em', marginBottom: 4 }}>무엇인가요</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink)' }}>{info.what}</p>
            </div>
            <div style={{ padding: '13px 15px', borderRadius: 14, background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--line)' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--faint)', letterSpacing: '.06em', marginBottom: 4 }}>이렇게 해보세요</div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ink)' }}>{info.how}</p>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--sub)', marginBottom: 18 }}>완료하면 {stat?.mil} 경험치가 올라요.</p>
        )}

        <button onClick={onToggle} className="tm-tap" style={{ width: '100%', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontWeight: 700, fontSize: 14.5, padding: '14px 18px', borderRadius: 'var(--r-md)',
          background: q.done ? 'var(--surface2)' : 'var(--accent)', color: q.done ? 'var(--danger)' : 'var(--on-accent)',
          boxShadow: q.done ? 'inset 0 0 0 1px var(--line)' : '0 8px 22px -10px rgba(var(--accent-rgb),.8)' }}>
          {q.done ? `완료 취소 · +${q.xp} XP 회수돼요` : '완료했어요'}
        </button>
        {!q.done && <div style={{ fontSize: 10.5, color: 'var(--faint)', textAlign: 'center', marginTop: 8 }}>카드를 길게 눌러도 완료돼요</div>}
      </div>
    </div>
  );
}

// horizontal resume card — progress ring + exactly one next step (Q4)
function ResumeCard({ o, onOpen }) {
  const next = o.milestones.flatMap((m) => m.subquests).find((s) => !s.done);
  return (
    <Card onClick={onOpen} pad={14} style={{ width: 210, flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
        <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
          <Donut pct={o.fill / 100} size={40} color="var(--accent)" track="var(--track)" w={3.6} />
          <span className="num" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 800, color: 'var(--ink)' }}>{o.fill}%</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.title}</div>
          <span className="mono" style={{ fontSize: 10.5, fontWeight: 700, color: o.dday <= 14 ? 'var(--accent)' : 'var(--faint)' }}>D-{o.dday}</span>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        다음 · {next ? next.text : '마무리만 남았어요'}
      </div>
    </Card>
  );
}
