import React from 'react';
import { Icon } from '../../icons';
import { ProgressBar } from '../ui';
import { STAT_C } from '../../icons';
import { CreatureHero, CREATURE_PATHS } from './CreatureHero';
import { evolutionOf, COMPANION_STAGE, BANDS } from './GuardianCard';

function AvatarViewer({ stats, creaturePath, creatureAnimal = 'ram', onSwapPath, milestones, theme, soldier, onClose }) {
  const evo = evolutionOf(stats);
  const level = Math.round(stats.reduce((a, s) => a + s.cur, 0) / stats.length);
  const pathInfo = CREATURE_PATHS.find((p) => p.key === creaturePath) || { ko: '수호신' };
  const companionUnlocked = evo.stage >= COMPANION_STAGE;
  const companion = companionUnlocked ? (creatureAnimal === 'ram' ? 'fox' : 'ram') : null;
  // the single progression signal: how far the marble has turned to gold
  const goldPct = Math.round(Math.min(100, (stats.reduce((a, s) => a + s.cur, 0) / 600) * 100));

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 95, background: '#0a0c0a', overflow: 'hidden', animation: 'tmFade .25s both' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <CreatureHero path={creaturePath} animal={creatureAnimal} companion={companion} stats={stats} milestones={milestones} theme={theme} level={level} interactive onCompanionTap={onSwapPath} />
      </div>

      {/* top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 16px 28px', zIndex: 4, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(8,9,8,.7), transparent)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <button onClick={onClose} className="tm-tap" style={{ pointerEvents: 'auto', width: 38, height: 38, borderRadius: 999, flexShrink: 0, border: 'none', cursor: 'pointer', padding: 0,
          background: 'rgba(14,16,15,.55)', backdropFilter: 'blur(10px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.16)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Icon('x', { size: 19, color: '#F2F4F6', stroke: 2 })}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9.5, letterSpacing: '.18em', color: 'rgba(255,255,255,.5)', fontWeight: 800 }}>나의 수호신</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-.02em', color: '#F2F4F6' }}>{pathInfo.ko}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, fontWeight: 800, color: 'var(--accent)',
              padding: '2px 8px', borderRadius: 999, background: 'rgba(var(--accent-rgb),.16)', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.4)' }}>
              {Icon('sparkle', { size: 11, color: 'var(--accent)', stroke: 2 })}{evo.stage}단계 · {evo.label}
            </span>
          </div>
        </div>
      </div>

      {/* drag hint */}
      <div style={{ position: 'absolute', top: 92, left: 0, right: 0, textAlign: 'center', zIndex: 3, pointerEvents: 'none',
        animation: 'avHint 3.4s .8s ease-out forwards' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,.78)',
          padding: '7px 13px', borderRadius: 999, background: 'rgba(14,16,15,.5)', backdropFilter: 'blur(8px)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.12)' }}>
          {Icon('replan', { size: 13, color: 'rgba(255,255,255,.78)', stroke: 2 })}
          {companionUnlocked ? ' 드래그로 회전 · 뒷수호신을 터치해 교대' : ` 드래그로 회전 · 동료 수호신은 성체(${BANDS[COMPANION_STAGE - 1].min} XP)에 해금`}
        </span>
      </div>
      <style>{`@keyframes avHint{0%,55%{opacity:1}100%{opacity:0}}`}</style>

      {/* bottom frosted panel */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 4, padding: '16px 18px 22px',
        background: 'rgba(10,12,10,.62)', backdropFilter: 'blur(18px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1)', borderRadius: '22px 22px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(255,255,255,.72)' }}>
            {evo.maxed ? '최종 진화 도달' : <>다음 진화 <b style={{ color: '#F2F4F6' }}>{evo.nextLabel}</b>까지</>}
          </span>
          <span className="mono" style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--accent)' }}>
            {evo.total} <span style={{ color: 'rgba(255,255,255,.45)' }}>XP</span>
          </span>
        </div>
        <ProgressBar pct={evo.pct} height={7} color="var(--accent)" track="rgba(255,255,255,.14)" glow />

        <div style={{ marginTop: 12, padding: '9px 11px', borderRadius: 12, background: 'rgba(0,0,0,.26)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {Icon('medal', { size: 13, color: '#c99a2e', stroke: 2 })}
            <span style={{ fontSize: 11, fontWeight: 700, color: '#F2F4F6' }}>황금화 · 발끝부터 머리까지</span>
            <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: '#c99a2e' }}>{goldPct}%</span>
          </div>
          <div style={{ position: 'relative', height: 4, borderRadius: 4, marginTop: 6, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${goldPct}%`, background: 'linear-gradient(90deg,#a76b1d,#c99a2e)', borderRadius: 4 }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 16px', marginTop: 16 }}>
          {stats.map((s) => {
            const c = STAT_C[s.key] || 'var(--accent)';
            return (
              <div key={s.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  {Icon(s.key, { size: 14, color: c, stroke: 2 })}
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#F2F4F6' }}>{s.mil}</span>
                  <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'rgba(255,255,255,.5)' }}>
                    <span style={{ color: c, fontWeight: 700 }}>{s.cur}</span>/{s.tgt}
                  </span>
                </div>
                <div style={{ position: 'relative', height: 5, borderRadius: 5, background: 'rgba(255,255,255,.1)', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${s.tgt}%`, background: 'rgba(255,255,255,.12)' }} />
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${s.cur}%`, background: c, borderRadius: 5 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { AvatarViewer };
