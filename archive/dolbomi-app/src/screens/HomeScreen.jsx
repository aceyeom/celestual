// 홈 — the guardian stage (design revamp v2 S1).
// One glance, one action: the guardian fills the screen, a short line spoken
// BY the guardian (반말 — it's your companion), one status card that deep-links
// into the daily loop. Identity lives on 프로필; the roadmap in 프로필/수호신.
import { Icon } from '../icons';
import { Card } from '../components/ui';
import { Art, SPOT } from '../assets/manifest';
import { GuardianHero } from '../components/creature/GuardianCard';
import { seoulToday } from '../data';
import { useStore } from '../store';

// the guardian's line — derived from real data, never hardcoded fluff
function guardianLine(soldier, quests, stats, catalog, checkedIn) {
  if (!checkedIn) return '오늘 어땠는지 알려줘. 밤의 퀘스트를 준비할게.';
  const doneCount = quests.filter((q) => q.done).length;
  if (quests.length > 0 && doneCount >= quests.length) return '오늘 전부 해냈어. 내가 조금 더 자랐다.';
  const near = (catalog || [])
    .filter((o) => o.started && !o.locked && o.fill < 100)
    .sort((a, b) => a.dday - b.dday)[0];
  if (doneCount > 0) return `오늘 ${doneCount}개째. ${near ? `${near.title}도 D-${near.dday}야.` : '좋은 페이스야.'}`;
  if (soldier.streak >= 3) return `${soldier.streak}일째 이어지고 있어. 오늘도 하나만 하자.`;
  return near ? `${near.title}까지 D-${near.dday}. 오늘 한 걸음 가자.` : '작은 것 하나면 충분해. 시작하자.';
}

export function HomeScreen({ soldier, stats, quests, mood, showAi, creaturePath, creatureAnimal, pulseSignal, milestones, onPickPath, onOpenAvatar, onGoQuests, catalog }) {
  const online = useStore((s) => s.online);
  const done = quests.filter((q) => q.done).length;
  const checkedIn = online ? soldier.lastCheckinDate === seoulToday() : !!mood;
  const allDone = checkedIn && quests.length > 0 && done >= quests.length;

  return (
    <div className="tm-rise">
      <div style={{ marginBottom: 14 }}>
        <GuardianHero soldier={soldier} stats={stats} creaturePath={creaturePath} creatureAnimal={creatureAnimal}
          milestones={milestones} pulseSignal={pulseSignal} onPickPath={onPickPath} variant="home" onOpenAvatar={onOpenAvatar} />
      </div>

      {/* the guardian speaks — one line, real data */}
      {showAi && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0 6px', marginBottom: 14 }}>
          <Art src={SPOT.sparkles} size={22} style={{ marginTop: 1 }} />
          <p style={{ flex: 1, fontSize: 13.5, lineHeight: 1.55, color: 'var(--sub)', textWrap: 'pretty' }}>
            “{guardianLine(soldier, quests, stats, catalog, checkedIn)}”
          </p>
        </div>
      )}

      {/* one action — today's loop */}
      <Card onClick={onGoQuests} glow={!checkedIn} pad={15} style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
        <Art src={allDone ? SPOT.party : SPOT.moon} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {checkedIn ? `오늘 퀘스트 ${done} / ${quests.length}` : '오늘의 체크인'}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {checkedIn ? (allDone ? '오늘 밤 전부 완료했어요' : '이어서 해볼까요') : '컨디션에 맞는 퀘스트를 받아요'}
          </div>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--positive)', fontWeight: 700, flexShrink: 0 }}>
          {Icon('flame', { size: 13, color: 'var(--positive)', stroke: 2 })}{soldier.streak}일
        </span>
        {Icon('chevR', { size: 18, color: 'var(--faint)' })}
      </Card>
    </div>
  );
}
