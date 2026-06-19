// screen-home.jsx — Home / HUD. Check-in, Tonight's 3, D-day, 적금, The Gap, one-line.
(function () {
const { Icon, Card, Tag, ProgressBar, StatBar, SectionHeader, IconChip } = window.TU;
const T = window.DOLBOMI;

function HomeScreen({ soldier, stats, quests, onToggleQuest, onOpenCheckin, mood, statMode, showAi, creaturePath, creatureAnimal, theme, pulseSignal, milestones, onPickPath, onOpenOpp, onOpenAvatar }) {
  const done = quests.filter((q) => q.done).length;

  return (
    <div className="tm-rise">
      {/* identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 13, flexShrink: 0, background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="mono">
          <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--accent)' }}>{soldier.rankEn}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: '-.02em' }}>{soldier.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{soldier.rank} · {soldier.unit}</div>
        </div>
        <Tag tone="accent" icon="trophy">{soldier.title}</Tag>
      </div>

      {/* GUARDIAN HERO — live 3D ram in its grove; the six stats' total XP drives evolution */}
      <div style={{ marginBottom: 16 }}>
        <window.GuardianHero soldier={soldier} stats={stats} creaturePath={creaturePath} creatureAnimal={creatureAnimal}
          milestones={milestones} pulseSignal={pulseSignal} onPickPath={onPickPath} variant="home" onOpenAvatar={onOpenAvatar} />
      </div>

      {/* check-in */}
      <Card onClick={onOpenCheckin} glow={!mood} pad={15} style={{ marginBottom: 18, display: 'flex', alignItems: 'center', gap: 13 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'var(--surface2)', boxShadow: 'inset 0 0 0 1px var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {mood ? <span style={{ fontSize: 22 }}>{mood.emoji}</span> : Icon('moon', { size: 20, color: 'var(--accent)', stroke: 1.9 })}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{mood ? `오늘 기분: ${mood.label}` : '60초 체크인'}</div>
          <div style={{ fontSize: 11.5, color: 'var(--sub)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mood ? '오늘 밤 퀘스트가 기분에 맞춰졌어' : '오늘 하루 어땠어? 두 번 탭이면 끝'}</div>
        </div>
        {Icon('chevR', { size: 18, color: 'var(--faint)' })}
      </Card>

      {/* Tonight's 3 */}
      <SectionHeader right={`${done} / ${quests.length} 완료`}>오늘 밤의 3</SectionHeader>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 22 }}>
        {quests.map((q) => <QuestRow key={q.id} q={q} onToggle={() => onToggleQuest(q.id)} />)}
      </div>

      {/* The six — the avatar's experience tracks */}
      <SectionHeader right="수호신 성장" caption="탭하면 그 능력치의 완료·남은 퀘스트가 펼쳐져">능력치 · 경험치</SectionHeader>
      <Card pad="4px 18px 8px" style={{ marginBottom: showAi ? 16 : 4 }}>
        {stats.map((s, i) => (
          <window.StatRow key={s.key} s={s} mode={statMode} divided={i !== 0} onOpenOpp={onOpenOpp} />
        ))}
      </Card>

      {/* the one line */}
      {showAi && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '0 4px 6px' }}>
          <IconChip name="sparkle" tone="accent" size={26} r={8} stroke={1.7} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(242,244,246,.85)', textWrap: 'pretty' }}>
              “{soldier.streak >= 3 ? '3일 연속' : '오늘도'} <span style={{ color: 'var(--ink)', fontWeight: 700 }}>숙련도</span> 채웠다. 정보처리 필기까지 D-12, 페이스 좋아.”
            </p>
            <div style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 3 }}>오늘의 한 줄 · 21:04</div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestRow({ q, onToggle }) {
  const c = window.TU.STAT_C[q.stat];
  const stat = T.stats.find((s) => s.key === q.stat);
  return (
    <Card onClick={onToggle} pad={14} style={{ display: 'flex', alignItems: 'center', gap: 13, opacity: q.done ? 0.62 : 1,
      boxShadow: q.hard && !q.done ? 'inset 0 0 0 1px rgba(var(--accent-rgb),.35)' : 'inset 0 0 0 1px var(--line)' }}>
      <div style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: q.done ? 'var(--accent)' : 'transparent', boxShadow: q.done ? 'none' : `inset 0 0 0 2px ${q.hard ? 'var(--accent)' : 'var(--faint)'}` }}>
        {q.done && Icon('check', { size: 15, color: 'var(--on-accent)', stroke: 2.6 })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, textDecoration: q.done ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.txt}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
          <span style={{ fontSize: 11, color: c, fontWeight: 600 }}>{stat.mil}</span>
          <span style={{ fontSize: 11, color: 'var(--faint)' }}>· {q.min}분</span>
          {q.hard && <Tag tone="accent" style={{ fontSize: 9.5, padding: '0 6px' }}>담력</Tag>}
        </div>
      </div>
      <span className="mono" style={{ fontSize: 13, fontWeight: 700, color: q.done ? 'var(--faint)' : c, flexShrink: 0 }}>+{q.xp}</span>
    </Card>
  );
}

window.HomeScreen = HomeScreen;
})();
