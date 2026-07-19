// screens.jsx — CELESTUAL's nine screens (docs/ULTIMATE-PRODUCT-FRAMEWORK.md
// Part 4, built to the letter; visual rules in docs/DESIGN.md).
//
// Every screen: deep navy field, generous emptiness, one warm star, exactly one
// primary action. Serif italic carries feeling; small sans carries mechanics;
// mono carries metadata. The backgrounds (the still night field) are owned by
// App so they never remount between screens — these shells only lay out the
// foreground.
//
// All user-facing copy comes through useI18n().t(); all color comes through C
// (the single theme). Nothing here defines its own hex or hard-codes strings.
import * as React from 'react'
import { normHandle } from '../api/celestual.js'
import { daysLeft, nearLapse } from '../api/pings.js'
import {
  startVerification, pollVerification, igDeepLink, igWebLink, igUsername,
  dmCode, savePending, loadPending, clearPending, genProof,
} from '../api/igverify.js'
import { useI18n } from '../i18n/index.js'
import { renderSkyCard } from '../card.js'
import {
  Brandmark, StarMark, SchoolMark, Kicker, Rule, StateDot, Sonar, GlassPanel,
  PrimaryButton, GhostButton, OutlineButton, Field, HandleChip, HandleSearchField,
  BackBtn, Icon, rgba, RADIUS, SPACE, makeShadow, useDialog, CommunityGalaxyCanvas,
} from './ui.jsx'
import { CATEGORY_TINTS } from '../theme.js'
import { communityOpen, MATCH_FLOOR, LAUNCH_AT, nextRevealAt, bySlug } from '../communities.js'
import { DEMO_PUBLIC } from '../demoData.js'
import { placedReachable, placedWaiting } from '../growth.js'
import { sendEduCode, verifyEduCode, eduVerifyEnabled, localEmailCheck } from '../api/eduverify.js'

// Shared centered column: at least one dynamic-viewport tall, capped to an
// intimate measure on wide monitors. --nav-pad (set by App) reserves the foot
// of the hub screens for the dock, so no action ever sits under it.
export function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'max(40px, env(safe-area-inset-top)) clamp(20px, 5vw, 40px) calc(max(28px, env(safe-area-inset-bottom)) + var(--nav-pad, 0px))',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

// A quiet hint line under a field.
function Hint({ C, icon, color, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, color: C.muted, fontSize: 12, lineHeight: 1.55, padding: '0 2px' }}>
      {icon && <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name={icon} size={13} color={color || C.muted} /></span>}
      <span>{children}</span>
    </div>
  )
}

// Smoothly reveals/hides children by animating grid-rows 0fr→1fr.
function Collapse({ open, children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        opacity: open ? 1 : 0,
        transition: 'grid-template-rows .42s cubic-bezier(.2,.7,.2,1), opacity .36s ease',
      }}
    >
      <div style={{ overflow: 'hidden', minHeight: 0 }}>{children}</div>
    </div>
  )
}

function FieldLabel({ C, children, optional }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
      <Kicker C={C} style={{ fontSize: 11, letterSpacing: '1.5px' }}>{children}</Kicker>
      {optional && (
        <span style={{ fontSize: 10.5, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(C.star, 0.92), background: rgba(C.star, 0.1), border: `1px solid ${rgba(C.star, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 8px', textTransform: 'uppercase' }}>{optional}</span>
      )}
    </div>
  )
}

// The sandbox badge — the demo says what it is, everywhere it matters.
export function SandboxChip({ C }) {
  const { t } = useI18n()
  return (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '1.5px', textTransform: 'uppercase', color: rgba(C.star, 0.92), background: rgba(C.star, 0.08), border: `1px solid ${rgba(C.star, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 9px' }}>
      {t('demo.badge')}
    </span>
  )
}

// ── the category + intent row (categorize them, then say why — §4.5) ──────────
// You first say who they are to you (crush / ex / friend / complicated); the
// "why them" lines that follow are drawn from that category, so they fit the
// real relationship instead of one flat list. Both are optional and never
// free-text; the chosen line travels with the ping, read only at a mutual
// reveal. Ids are namespaced by category, and each line's display text lives in
// i18n/strings.js under `intent.<id>`.
export const CATEGORIES = [
  { id: 'crush', intents: ['crushHi', 'crushThink', 'crushCute', 'crushSee'] },
  { id: 'ex', intents: ['exMiss', 'exAgain', 'exUnsaid', 'exUs'] },
  { id: 'friend', intents: ['friendTalk', 'friendAround', 'friendLeft', 'friendFix'] },
  { id: 'complicated', intents: ['compRight', 'compMind', 'compAir', 'compWhat'] },
]
export const INTENTS = CATEGORIES.flatMap((c) => c.intents)
// the category an intent id belongs to (so a saved ping can re-open its group).
export const categoryOf = (id) => (CATEGORIES.find((c) => c.intents.includes(id)) || {}).id || ''
// the line every intent id renders as (first person; same under "they"/"you").
export const intentLine = (t, id) => (id && INTENTS.includes(id) ? t(`intent.${id}`) : '')

// The "who are they to you" words — set like a line of handwriting, not a row
// of system chips: lowercase serif words, each one carrying its category's own
// light when chosen (the word itself warms and a hairline of that light rests
// under it). The option row is where the color code is learned — the same tint
// that person's star will burn with in your community's sky.
function CategoryWord({ C, on, tint, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
        padding: '5px 2px 10px', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
        fontSize: 19, lineHeight: 1, letterSpacing: '.2px',
        color: on ? tint : rgba(C.cream, 0.6),
        textShadow: on ? `0 0 18px ${rgba(tint, 0.55)}` : 'none',
        transition: 'color .22s, text-shadow .22s',
      }}
    >
      {children}
      <span
        aria-hidden
        style={{
          position: 'absolute', left: 1, right: 1, bottom: 3, height: 1.5, borderRadius: 2,
          background: on ? `linear-gradient(90deg, transparent, ${tint}, transparent)` : 'transparent',
          boxShadow: on ? `0 0 12px ${rgba(tint, 0.7)}` : 'none',
          transition: 'background .22s, box-shadow .22s',
        }}
      />
    </button>
  )
}

// One "why them" line — a spoken phrase in a soft-cornered tag, lit by the
// PARENT category's tint when chosen, so a crush's reasons glow rose, an ex's
// ember, a friend's ice-blue: one light per route, learned once, kept.
function IntentLineChip({ C, on, tint, onClick, children }) {
  const accent = tint || C.star
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        padding: '9px 14px', borderRadius: RADIUS.inner, cursor: 'pointer', textAlign: 'left',
        background: on ? rgba(accent, 0.13) : 'transparent',
        border: `1px solid ${on ? rgba(accent, 0.6) : C.line}`,
        color: on ? C.cream : rgba(C.cream, 0.62),
        boxShadow: on ? `0 0 18px ${rgba(accent, 0.16)}` : 'none',
        fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.3,
        transition: 'all .2s',
      }}
    >
      {children}
    </button>
  )
}

export function IntentPicker({ C, category, onCategory, value, onChange }) {
  const { t } = useI18n()
  const cat = CATEGORIES.find((c) => c.id === category)
  const tint = cat ? CATEGORY_TINTS[cat.id] : C.star
  // Skipping is a real, visible act — not a pill that says "optional". One tap
  // folds the whole question away; a quiet line holds its place, undoable.
  const [skipped, setSkipped] = React.useState(false)
  const skip = () => {
    onCategory('')
    onChange('')
    setSkipped(true)
  }
  if (skipped) {
    return (
      <div className="fade" style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', padding: '2px 2px' }}>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 14.5, color: rgba(C.muted, 0.95) }}>
          {t('category.skipped')}
        </span>
        <GhostButton C={C} onClick={() => setSkipped(false)} style={{ padding: 0, fontSize: 12.5, color: rgba(C.star, 0.85) }}>
          {t('category.unskip')}
        </GhostButton>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* who are they to you? — with the way out in plain sight */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '0 2px' }}>
          <Kicker C={C} style={{ fontSize: 11, letterSpacing: '1.5px' }}>{t('category.label')}</Kicker>
          <GhostButton C={C} onClick={skip} style={{ padding: 0, fontSize: 12.5, color: rgba(C.muted, 0.95) }}>
            {t('category.skip')}
          </GhostButton>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '2px 22px', padding: '0 2px' }}>
          {CATEGORIES.map((c) => (
            <CategoryWord key={c.id} C={C} on={category === c.id} tint={CATEGORY_TINTS[c.id]} onClick={() => onCategory(category === c.id ? '' : c.id)}>
              {t(`category.${c.id}`)}
            </CategoryWord>
          ))}
        </div>
      </div>

      {/* why them? — the lines shift with the category above, and wear its light */}
      <Collapse open={!!cat}>
        <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 2 }}>
          <FieldLabel C={C}>{t('intent.label')}</FieldLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {(cat?.intents || []).map((id) => (
              <IntentLineChip key={id} C={C} tint={tint} on={value === id} onClick={() => onChange(value === id ? '' : id)}>
                {t(`intent.${id}`)}
              </IntentLineChip>
            ))}
          </div>
          <Hint C={C} icon="lock">{t('intent.note')}</Hint>
        </div>
      </Collapse>
    </div>
  )
}

// The slot pips — one small star per slot: a held slot burns amber, an open
// one waits as a faint outline star. The product's own ritual marks (✦ ✧),
// never indicator dots. `cap` is whatever the caller is holding it to (two,
// free; ten, sandbox-subscribed) — this component never assumes a number.
// `subscribed` adds a small, subtle mono note alongside (sandbox only).
export function SlotPips({ C, standing, cap, compact, subscribed }) {
  const { t } = useI18n()
  const free = Math.max(0, cap - standing)
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7 }}>
      {Array.from({ length: cap }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            fontSize: 12, lineHeight: 1,
            color: i < standing ? C.star : rgba(C.cream, 0.3),
            textShadow: i < standing ? `0 0 9px ${rgba(C.star, 0.65)}` : 'none',
          }}
        >
          {i < standing ? '✦' : '✧'}
        </span>
      ))}
      {!compact && (
        <span style={{ marginLeft: 4, fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.3px', color: C.muted }}>
          {standing > 0 ? t('slots.holding', { n: standing, cap }) : t('slots.free', { n: free, cap })}
        </span>
      )}
      {subscribed && (
        <span style={{ marginLeft: compact ? 2 : 6, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.4px', color: rgba(C.star, 0.75) }}>
          {t('paywall.subscribedNote')}
        </span>
      )}
    </div>
  )
}

// The one quiet promise under the headline, typed as TWO deliberate lines with
// a held breath between them — spoken, not printed. Both line-boxes exist at
// full height from the first frame, so the second line arriving never shifts
// the hero above it by a pixel. Re-types on a long loop; collapses to a static
// two-line stack under reduced motion.
function HeroSequence({ C }) {
  const { t } = useI18n()
  const l1 = t('landing.hero1')
  const l2 = t('landing.hero2')
  const reduce =
    typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // one cursor across both lines; a pause (the breath) sits between them
  const total = l1.length + l2.length
  const [n, setN] = React.useState(reduce ? total : 0)
  const [erasing, setErasing] = React.useState(false)
  React.useEffect(() => {
    if (reduce) return undefined
    let delay
    if (!erasing && n < total) {
      delay = n === l1.length ? 620 : 30 + Math.random() * 22 // the breath after line one
    } else if (!erasing) {
      delay = 7000 // hold the finished promise
    } else if (n > 0) {
      delay = 14 // erase — quick, unceremonious
    } else {
      delay = 900 // a beat of empty sky before it types again
    }
    const id = setTimeout(() => {
      if (!erasing && n < total) setN(n + 1)
      else if (!erasing) setErasing(true)
      else if (n > 0) setN(n - 1)
      else setErasing(false)
    }, delay)
    return () => clearTimeout(id)
  }, [n, erasing, total, l1.length, reduce])
  const s1 = l1.slice(0, Math.min(n, l1.length))
  const s2 = n > l1.length ? l2.slice(0, n - l1.length) : ''
  const caretOn2 = n >= l1.length && (erasing ? n > l1.length : true)
  const caret = (
    <span className="tw-caret" aria-hidden style={{ color: rgba(C.star, 0.85), fontWeight: 300, marginLeft: 1 }}>
      |
    </span>
  )
  const line = { minHeight: '1.42em', lineHeight: 1.42 }
  return (
    <div
      className="enter"
      aria-label={`${l1} ${l2}`}
      style={{
        animationDelay: '.16s', width: '100%', maxWidth: 420, padding: '0 6px', textAlign: 'center',
        fontFamily: "'Instrument Serif', serif", fontStyle: 'italic',
        fontSize: 'clamp(19px, 5.4vw, 24px)', color: rgba(C.cream, 0.94),
      }}
    >
      <div style={line}>
        {s1}
        {!reduce && !caretOn2 && caret}
      </div>
      <div style={line}>
        {s2}
        {!reduce && caretOn2 && caret}
      </div>
    </div>
  )
}

// ── 1 · THE COLD LANDING ──────────────────────────────────────────────────────
export function LandingScreen({ C, ctx }) {
  const { t } = useI18n()
  return (
    <Shell>
      <div className="enter" style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
        <div className="floaty"><Brandmark C={C} size={34} /></div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <h1
          className="enter"
          style={{ animationDelay: '.08s', margin: 0, textAlign: 'center', fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(30px, 8.5vw, 46px)', lineHeight: 1.16, color: C.cream, textWrap: 'balance' }}
        >
          <div>{t('landing.head1')}</div>
          <div style={{ color: C.star }}>{t('landing.head2')}</div>
        </h1>
        <HeroSequence C={C} />
      </div>

      <div className="enter" style={{ animationDelay: '.24s', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <PrimaryButton C={C} onClick={ctx.findOut}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            {t('landing.cta')} <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 12, color: C.muted }}>{t('landing.safety')}</p>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: rgba(C.muted, 0.8) }}>
          {t('landing.age')}{' '}
          <a href="/terms" target="_blank" rel="noopener" style={{ color: rgba(C.muted, 0.9), textDecoration: 'underline' }}>{t('landing.terms')}</a>.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 2, flexWrap: 'wrap' }}>
          {[
            ['/privacy', t('footer.privacy')],
            ['/terms', t('footer.terms')],
          ].map(([href, label], idx) => (
            <React.Fragment key={href}>
              {idx > 0 && <span aria-hidden style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: C.line }} />}
              <a href={href} target="_blank" rel="noopener" style={{ fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.5px', color: C.muted, textDecoration: 'none' }}>
                {label}
              </a>
            </React.Fragment>
          ))}
          <span aria-hidden style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: C.line }} />
          <GhostButton C={C} onClick={() => ctx.go('privacy')} style={{ padding: 0, fontSize: 11.5, fontFamily: "'Space Mono', monospace", letterSpacing: '.5px' }}>
            {t('footer.optout')}
          </GhostButton>
        </div>
        {ctx.demo && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' }}>
            <SandboxChip C={C} />
            <GhostButton C={C} onClick={() => ctx.go('worlds')} style={{ padding: 0, fontSize: 11.5, color: rgba(C.star, 0.85) }}>
              {t('demo.worlds')} →
            </GhostButton>
          </div>
        )}
      </div>
    </Shell>
  )
}

// ── the personal open-door landing (celestual.us/@handle) ────────────────────
export function OpenDoorScreen({ C, ctx }) {
  const { t } = useI18n()
  const poster = ctx.posterHandle
  return (
    <Shell>
      <div className="enter" style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
        <div className="floaty"><Brandmark C={C} size={30} /></div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 22 }}>
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <HandleChip C={C} handle={poster} big />
          <Kicker C={C}>{t('open.reach')}</Kicker>
        </div>
        <h1 className="enter" style={{ animationDelay: '.08s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(26px, 7vw, 36px)', lineHeight: 1.2, color: C.cream, maxWidth: 360, textWrap: 'balance' }}>
          {t('open.line')}
        </h1>
        <p className="enter" style={{ animationDelay: '.14s', margin: 0, fontSize: 13, lineHeight: 1.6, color: C.muted, maxWidth: 320 }}>
          {t('open.mech')}
        </p>
      </div>
      <div className="enter" style={{ animationDelay: '.2s', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* the prefilled ping — two taps from Story to placed ping */}
        <PrimaryButton C={C} onClick={() => ctx.startFromDoor(poster)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            {t('open.cta')} <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.startFromDoor('')} style={{ fontSize: 12.5 }}>
            {t('open.else')}
          </GhostButton>
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.muted }}>{t('landing.safety')}</p>
      </div>
    </Shell>
  )
}

// ── 2 · THE SEND ──────────────────────────────────────────────────────────────
export function WhoScreen({ C, ctx }) {
  const { t } = useI18n()
  const valid = ctx.them.trim().length >= 2 && normHandle(ctx.them) !== normHandle(ctx.me)
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const normd = normHandle(ctx.them)
  const onPlace = async () => {
    if (!valid || busy) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    setBusy(true)
    try {
      await ctx.place()
    } finally {
      setBusy(false)
    }
  }
  React.useEffect(() => {
    setConfirming(false)
  }, [ctx.them])

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.pings.length ? 'pings' : 'landing')} />
        <Brandmark C={C} size={18} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl }}>
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16, textAlign: 'left' }}>
          {/* the header, as a full serif headline, left-aligned — the accent line
              in amber (the "you" star), one warm light with the landing page */}
          <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(30px, 8.5vw, 38px)', lineHeight: 1.08, color: C.cream }}>
            {t('who.title1')}<br />
            <span style={{ color: C.star }}>{t('who.title2')}</span>
          </h2>
          {/* self @ first: the ping is FROM you, shown under the headline */}
          {normHandle(ctx.me) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Kicker C={C} style={{ fontSize: 10 }}>{t('who.fromLabel')}</Kicker>
              <HandleChip C={C} handle={normHandle(ctx.me)} />
            </span>
          )}
        </div>
        <div className="enter" style={{ animationDelay: '.06s', display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <div data-sendoff-field>
            <HandleSearchField C={C} value={ctx.them} onChange={ctx.setThem} placeholder={t('who.placeholder')} autoFocus onEnter={onPlace} />
          </div>
          {confirming && valid ? (
            <div key="confirm" className="fade" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 7px', color: C.muted, fontSize: 13, lineHeight: 1.5, padding: '0 2px' }}>
              <Icon name="lock" size={13} color={rgba(C.star, 0.85)} />
              <span>{t('who.confirm1')}</span>
              <HandleChip C={C} handle={normd} />
              <span>{t('who.confirm2')}</span>
            </div>
          ) : (
            <Hint C={C} icon="eye">{t('who.note')}</Hint>
          )}
          {ctx.error && <div style={{ color: rgba(C.star, 0.95), fontSize: 13, padding: '0 2px' }}>{ctx.error}</div>}
          {ctx.demo && <Hint C={C} icon="star" color={rgba(C.star, 0.85)}>{t('who.demoHint')}</Hint>}
        </div>

        {/* categorize them, then say why — the chosen line is read only if it's
            ever mutual */}
        <Collapse open={valid}>
          <div className="fade" style={{ paddingTop: 2 }}>
            <IntentPicker
              C={C}
              category={ctx.category}
              onCategory={(c) => {
                ctx.setCategory(c)
                ctx.setIntent('')
              }}
              value={ctx.intent}
              onChange={ctx.setIntent}
            />
          </div>
        </Collapse>

        {/* the slots — the weight under the act. only shown once we know who you
            are: before you've identified, your slot count is genuinely unknown. */}
        {ctx.established && (
          <div className="enter" style={{ animationDelay: '.12s', display: 'flex', justifyContent: 'flex-start' }}>
            <SlotPips C={C} standing={ctx.slotsStanding} cap={ctx.slotsCap} subscribed={ctx.demoSubscribed} />
          </div>
        )}
      </div>

      <PrimaryButton C={C} disabled={!valid || busy} onClick={onPlace}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
          {!busy && <Icon name="lock" size={16} color={C.onStar} stroke={2} />} {busy ? '…' : confirming ? t('who.ctaConfirm') : t('who.cta')}
        </span>
      </PrimaryButton>
    </Shell>
  )
}

// ── the identity step (your side — so the ping can resolve to you) ────────────
export function YouScreen({ C, ctx }) {
  const { t } = useI18n()
  const login = ctx.loginMode
  const emailVal = ctx.email.trim()
  const emailOk = emailVal === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)
  const handleOk = ctx.me.trim().length >= 2
  // the 18+ hard gate (§4.4) — signup only. one tap to confirm; nothing about
  // age is ever sent up or stored (data minimization): we keep whether, not when.
  const [over18, setOver18] = React.useState(false)
  const valid = handleOk && emailOk && (login || over18)
  const submit = () => valid && (login ? ctx.login() : ctx.continueFromYou())
  const needsVerify = ctx.verifyEnabled && handleOk && !ctx.verified
  const [emailOpen, setEmailOpen] = React.useState(() => emailVal !== '')
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(login ? 'landing' : 'who')} />
        <Brandmark C={C} size={18} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl }}>
        <h2 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(30px, 8vw, 36px)', lineHeight: 1.12, color: C.cream }}>
          {login ? (
            <>{t('you.loginTitle1')}<br /><span style={{ color: C.star }}>{t('you.loginTitle2')}</span></>
          ) : (
            <>{t('you.title1')}<br /><span style={{ color: C.star }}>{t('you.title2')}</span></>
          )}
        </h2>

        <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <Field C={C} kind="handle" value={ctx.me} onChange={ctx.setMe} placeholder={t('you.handle')} autoFocus emphasis onEnter={submit} />
          {login && handleOk ? (
            ctx.verified ? (
              <Hint C={C} icon="check" color={rgba(C.star, 0.9)}>{t('verify.youDone')}</Hint>
            ) : (
              <Hint C={C} icon="instagram" color={rgba(C.star, 0.85)}>{t('you.loginNote')}</Hint>
            )
          ) : ctx.verifyEnabled && handleOk ? (
            ctx.verified ? (
              <Hint C={C} icon="check" color={rgba(C.star, 0.9)}>{t('verify.youDone')}</Hint>
            ) : (
              <Hint C={C} icon="instagram" color={rgba(C.star, 0.85)}>{t('verify.youHint')}</Hint>
            )
          ) : (
            <Hint C={C} icon="instagram">{t('you.handleNote')}</Hint>
          )}
        </div>

        {/* the 18+ hard gate (§4.4), signup only — now one tap, not a birthdate.
            checked here, never stored: we keep whether, not when. */}
        <Collapse open={handleOk && !login}>
          <div className="fade" style={{ paddingTop: 4, display: 'flex', flexDirection: 'column', gap: 9 }}>
            <FieldLabel C={C}>{t('you.ageLabel')}</FieldLabel>
            <button
              onClick={() => setOver18((v) => !v)}
              aria-pressed={over18}
              style={{
                display: 'flex', alignItems: 'center', gap: SPACE.md, width: '100%', padding: '15px 17px',
                borderRadius: RADIUS.field, cursor: 'pointer', textAlign: 'left',
                background: over18 ? rgba(C.star, 0.1) : C.ink2,
                border: `1.5px solid ${over18 ? rgba(C.star, 0.55) : C.line}`,
                color: C.cream, fontFamily: "'Space Grotesk', sans-serif", transition: 'all .2s',
              }}
            >
              <span
                aria-hidden
                style={{
                  display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                  background: over18 ? C.star : 'transparent',
                  border: `1.5px solid ${over18 ? C.star : rgba(C.cream, 0.3)}`,
                  transition: 'all .2s',
                }}
              >
                {over18 && <Icon name="check" size={15} color={C.onStar} stroke={2.6} />}
              </span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 500 }}>
                {over18 ? t('you.ageConfirmed') : t('you.ageConfirm')}
              </span>
            </button>
            <Hint C={C} icon="lock">{t('you.ageNote')}</Hint>
          </div>
        </Collapse>

        {/* email — optional, revealed after a handle exists (signup only) */}
        <Collapse open={handleOk && !login}>
          <div style={{ paddingTop: 4 }}>
            {!emailOpen ? (
              <button
                onClick={() => setEmailOpen(true)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: SPACE.md, padding: '15px 17px',
                  borderRadius: RADIUS.field, cursor: 'pointer', textAlign: 'left',
                  background: C.ink2, border: `1px solid ${C.line}`,
                  color: C.cream, fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                <Icon name="mail" size={18} color={rgba(C.star, 0.9)} stroke={1.7} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 500 }}>{t('you.emailAdd')}</span>
                <span style={{ fontSize: 10.5, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(C.star, 0.92), background: rgba(C.star, 0.1), border: `1px solid ${rgba(C.star, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 8px', textTransform: 'uppercase' }}>{t('you.emailOptional')}</span>
                <Icon name="plus" size={16} color={rgba(C.star, 0.9)} stroke={2} />
              </button>
            ) : (
              <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <FieldLabel C={C} optional={t('you.emailOptional')}>{t('you.emailLabel')}</FieldLabel>
                <Field C={C} kind="email" value={ctx.email} onChange={ctx.setEmail} placeholder={t('you.email')} autoFocus onEnter={submit} />
                <Hint C={C} icon="mail">{t('you.note')}</Hint>
              </div>
            )}
          </div>
        </Collapse>
      </div>

      <PrimaryButton C={C} disabled={!valid} onClick={submit}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
          {needsVerify && <Icon name="instagram" size={16} color={C.onStar} stroke={2} />}
          {login ? t('you.loginCta') : needsVerify ? t('verify.continue') : t('you.continue')}
        </span>
      </PrimaryButton>
    </Shell>
  )
}

// ── 3 · PLACED — the recruiter screen (the most important in the product) ─────
// The placed ping now turns on your community. If you're in one that's still
// filling, the answer to "did they ping me too?" is held until it opens, and the
// one thing you control is bringing your world in — so both states lead with the
// count and a share action. Quiet fallbacks cover no-community-joined and an
// already-open community. The growth-narrative copy lives in growth.js.

// The community invite link — points at the community's own page so a friend can
// add themselves. It names no one.
function inviteUrl(slug) {
  const origin = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://celestual.us'
  return slug ? `${origin}/c/${slug}` : origin
}

// Share the invite: the native share sheet on mobile, a clipboard copy (with a
// brief "link copied" confirmation) everywhere else.
function ShareInviteButton({ C, slug }) {
  const { t } = useI18n()
  const [done, setDone] = React.useState(false)
  const doneTimer = React.useRef(null)
  React.useEffect(() => () => doneTimer.current && clearTimeout(doneTimer.current), [])
  const share = async () => {
    const url = inviteUrl(slug)
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ url })
        return
      }
    } catch {
      /* sheet dismissed or unavailable — fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url)
      setDone(true)
      if (doneTimer.current) clearTimeout(doneTimer.current)
      doneTimer.current = setTimeout(() => setDone(false), 2200)
    } catch {
      /* the link is elsewhere on screen if all else fails */
    }
  }
  return (
    <PrimaryButton C={C} onClick={share}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
        <Icon name={done ? 'check' : 'share'} size={16} color={C.onStar} stroke={2} />
        {done ? t('placed.shared') : t('placed.share')}
      </span>
    </PrimaryButton>
  )
}

// The launch clock, large — the shared anchor of both placed states. The seal +
// name + status on top; beneath, the live countdown to the one shared moment
// the whole sky opens. No thresholds, no progress bars: time is the only gate,
// and it's the same time for everyone.
function LaunchClockCard({ C, community }) {
  const { t } = useI18n()
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const open = communityOpen(community)
  const c = fmtCountdown(LAUNCH_AT.getTime() - now)
  return (
    <GlassPanel C={C} style={{ width: '100%', maxWidth: 360, padding: '17px 18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SchoolMark C={C} slug={community.slug} size={38} />
        <span style={{ flex: 1, minWidth: 0, fontFamily: "'Instrument Serif', serif", fontSize: 21, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{community.name}</span>
        <SkyStatus C={C} open={open} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 9, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(38px, 10vw, 50px)', lineHeight: 1, color: C.cream, textShadow: `0 0 26px ${rgba(C.star, 0.22)}` }}>
            {c ? c.big : t('reveal.now')}
          </span>
          {c && c.small && (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, letterSpacing: '.5px', color: rgba(C.star, 0.92) }}>{c.small}</span>
          )}
        </span>
        <Kicker C={C} style={{ fontSize: 9.5, letterSpacing: '2px' }}>{t('reveal.opens')}</Kicker>
      </div>
    </GlassPanel>
  )
}

// The reassurance footer shared by both growth states — quiet, bordered, the
// "it's already spreading, and it names no one" note.
function SpreadingNote({ C, lines }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '13px 15px', borderRadius: RADIUS.card, background: rgba(C.ink2, 0.4), border: `1px solid ${C.line}` }}>
      {lines.map((l, i) => (
        <p key={i} style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: rgba(C.muted, 0.92) }}>{l}</p>
      ))}
    </div>
  )
}

// The one hero shared by every placed state: the @ handle, big, bold, and
// amber-lit — the single thing that tells you at a glance whether they're
// here yet. Same bones everywhere (mono sigil + handle, full-width, tight
// leading, ellipsis on overflow); only the status line beneath it ever
// changes, and that's the whole point — the design should read as one family.
function PlacedHandleHero({ C, handle, reachable }) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, textAlign: 'center', width: '100%' }}>
      <div
        style={{
          width: '100%', fontFamily: "'Space Mono', monospace", fontWeight: 700,
          fontSize: 'clamp(38px, 11vw, 54px)', lineHeight: 1.02,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          // no glow shadow inside an overflow-hidden box — the clip edge turns
          // a soft glow into a faint rectangular highlight behind the handle
          textShadow: '0 2px 22px rgba(0,0,0,.7)',
        }}
      >
        <span style={{ color: C.star }}>@</span><span style={{ color: C.cream }}>{handle}</span>
      </div>
      <p
        style={{
          margin: 0, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontWeight: 400,
          fontSize: 'clamp(16.5px, 4.4vw, 19px)', lineHeight: 1.35,
          color: reachable ? rgba(C.star, 0.95) : rgba(C.cream, 0.8),
        }}
      >
        {reachable ? t('placed.reachableHead') : t('placed.waitingHead')}
      </p>
    </div>
  )
}

// State A — they're already reachable, and in your (still-gathering) community.
// The question you can't answer yet is the emotional peak; the meter is the
// answer's gate, and it's the thing you control.
function PlacedReachable({ C, ctx, handle, community }) {
  const { t } = useI18n()
  const g = placedReachable({ handle, short: community.short })
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24, padding: '16px 0 8px' }}>
        {/* confirmation — the @ hero leads, same as every other placed state */}
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <PlacedHandleHero C={C} handle={handle} reachable />
          <Kicker C={C} color={rgba(C.star, 0.92)}>{g.live}</Kicker>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: rgba(C.cream, 0.92), maxWidth: 340 }}>{g.here}</p>
        </div>

        {/* the question — the emotional peak */}
        <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(23px, 6.4vw, 31px)', lineHeight: 1.24, color: C.cream, maxWidth: 390, textWrap: 'balance' }}>
            {g.question}
          </h1>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted }}>{g.until}</p>
        </div>

        {/* the anchor — the launch clock, ticking toward the shared night */}
        <div className="enter" style={{ animationDelay: '.14s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <LaunchClockCard C={C} community={community} />
          <p style={{ margin: 0, textAlign: 'center', fontSize: 12.5, lineHeight: 1.6, color: rgba(C.star, 0.9), maxWidth: 340 }}>{g.fill}</p>
        </div>
      </div>

      {/* the actions */}
      <div className="enter" style={{ animationDelay: '.22s', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ShareInviteButton C={C} slug={community.slug} />
        <OutlineButton C={C} onClick={() => ctx.go('door')} style={{ width: '100%', padding: '14px 22px', borderRadius: RADIUS.field }}>
          <Icon name="download" size={15} color="currentColor" stroke={1.9} /> {t('placed.door')}
        </OutlineButton>
        <SpreadingNote C={C} lines={[g.foot, g.spreading]} />
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12.5 }}>{t('placed.pings')}</GhostButton>
        </div>
      </div>
    </Shell>
  )
}

// State B — they're not on celestual yet, and your community isn't full. The
// handle leads, held; the move is the same: bring your world in.
function PlacedWaiting({ C, ctx, handle, community }) {
  const { t } = useI18n()
  const g = placedWaiting({ handle, short: community.short })
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 22, padding: '16px 0 8px' }}>
        {/* the handle, large, held — the @ hero leads, same as every other placed state */}
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <PlacedHandleHero C={C} handle={handle} reachable={false} />
          <p className="enter" style={{ animationDelay: '.1s', margin: '4px 0 0', fontSize: 14, lineHeight: 1.65, color: C.muted, maxWidth: 350 }}>{g.only}</p>
        </div>

        {/* the anchor — the launch clock */}
        <div className="enter" style={{ animationDelay: '.16s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <LaunchClockCard C={C} community={community} />
          <p style={{ margin: 0, textAlign: 'center', fontSize: 12.5, lineHeight: 1.6, color: rgba(C.star, 0.9), maxWidth: 340 }}>{g.bring}</p>
        </div>
      </div>

      <div className="enter" style={{ animationDelay: '.22s', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ShareInviteButton C={C} slug={community.slug} />
        <SpreadingNote C={C} lines={[g.spreading]} />
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12.5 }}>{t('placed.pings')}</GhostButton>
        </div>
      </div>
    </Shell>
  )
}

// The quiet fallbacks: you haven't joined a community (nudge to pick one, since
// the flow only opens once your world is here), or your community is already
// open (the plain standing/waiting truth).
function PlacedQuiet({ C, ctx, handle, reachable, needsCommunity }) {
  const { t } = useI18n()
  const body = needsCommunity
    ? reachable
      ? t('placed.joinReachable', { handle })
      : t('placed.joinWaiting')
    : reachable
      ? t('placed.standingSub', { handle })
      : t('placed.waitingSub')
  // reachable still gets its own title ("one more thing." / "your ping is
  // live.") — it's just demoted beneath the @ hero now, since the @ + status
  // line is the headline in every placed state, not just this one.
  const subTitle = reachable ? (needsCommunity ? t('placed.joinTitle') : t('placed.standingTitle')) : null
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 22 }}>
        <div className="enter" style={{ width: '100%' }}>
          <PlacedHandleHero C={C} handle={handle} reachable={reachable} />
        </div>
        {subTitle && (
          <p className="enter" style={{ animationDelay: '.08s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(19px, 5.4vw, 24px)', lineHeight: 1.2, color: C.cream }}>
            {subTitle}
          </p>
        )}
        <p className="enter" style={{ animationDelay: '.14s', margin: 0, fontSize: 14, lineHeight: 1.7, color: C.muted, maxWidth: 330 }}>{body}</p>
      </div>

      <div className="enter" style={{ animationDelay: '.26s', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {needsCommunity ? (
          <PrimaryButton C={C} onClick={() => ctx.go('worlds')}>{t('placed.findComm')}</PrimaryButton>
        ) : (
          <PrimaryButton C={C} onClick={() => ctx.go('door')}>{t('placed.door')}</PrimaryButton>
        )}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12.5 }}>{t('placed.pings')}</GhostButton>
        </div>
      </div>
    </Shell>
  )
}

export function PlacedScreen({ C, ctx }) {
  const placed = ctx.lastPlaced || { handle: ctx.them, reachable: false }
  const reachable = !!placed.reachable
  const handle = placed.handle
  // your own community drives this screen — the thing you can actually move.
  const community = (ctx.communities || []).find((c) => c.joined) || null
  const gathering = community && !communityOpen(community)
  if (community && gathering) {
    return reachable
      ? <PlacedReachable C={C} ctx={ctx} handle={handle} community={community} />
      : <PlacedWaiting C={C} ctx={ctx} handle={handle} community={community} />
  }
  return <PlacedQuiet C={C} ctx={ctx} handle={handle} reachable={reachable} needsCommunity={!community} />
}

// ── 4 · YOUR PINGS — the status page ──────────────────────────────────────────
// A compact, clearly-labelled action button for a ping row. Real affordance —
// a bordered pill that hovers — instead of the old bare underlined text.
function RowBtn({ C, onClick, icon, children, tone = 'default' }) {
  const [h, setH] = React.useState(false)
  const accent = tone === 'accent'
  const col = accent ? C.star : tone === 'danger' ? rgba(C.cream, 0.72) : C.cream
  return (
    <button
      onClick={(e) => {
        // the whole card behind these buttons flies to the star — a row action
        // must never fall through into that
        e.stopPropagation()
        if (onClick) onClick(e)
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: RADIUS.chip,
        cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, fontSize: 13, color: col,
        background: h ? rgba(accent ? C.star : C.cream, 0.1) : accent ? rgba(C.star, 0.08) : 'transparent',
        border: `1px solid ${accent ? rgba(C.star, h ? 0.6 : 0.4) : rgba(C.cream, h ? 0.28 : 0.14)}`,
        transition: 'all .18s',
      }}
    >
      {icon && <Icon name={icon} size={14} color="currentColor" stroke={1.9} />}
      {children}
    </button>
  )
}

// One ping, as a frosted glass card lifted off the galaxy. The state reads in
// plain words (active / not here yet / mutual) with a one-line explanation, and
// the actions are real buttons.
function PingCard({ C, ping, ctx }) {
  const { t } = useI18n()
  const [confirmGo, setConfirmGo] = React.useState(false)
  const [renewed, setRenewed] = React.useState(false)
  const days = daysLeft(ping.expires_at)
  const soon = !ping.mutual && nearLapse(ping.expires_at)
  const state = ping.mutual ? 'mutual' : ping.reachable ? 'standing' : 'waiting'
  const chipColor = ping.mutual ? C.star : ping.reachable ? rgba(C.star, 0.92) : C.muted
  // Production renews outright, free, instantly (unchanged). The sandbox
  // detours through the same checkout the third slot uses (SlotPaywall, extend
  // mode) so the eventual $2.99 shape is visible; the actual renew only runs
  // once that mock payment succeeds (App.jsx's finishExtend).
  const renew = async () => {
    if (ctx.demo) {
      ctx.startExtend(ping.handle)
      return
    }
    await ctx.renew(ping.handle)
    setRenewed(true)
  }
  return (
    // the WHOLE card is the way to the sky: tap anywhere on it and the camera
    // flies to this ping's own star (row buttons stop their own taps)
    <GlassPanel
      C={C}
      onClick={ping.handle ? () => ctx.locatePing(ping.handle) : undefined}
      role={ping.handle ? 'button' : undefined}
      tabIndex={ping.handle ? 0 : undefined}
      onKeyDown={ping.handle ? (e) => { if (e.key === 'Enter') ctx.locatePing(ping.handle) } : undefined}
      aria-label={ping.handle ? t('pings.locate') : undefined}
      title={ping.handle ? t('pings.locate') : undefined}
      style={{ padding: '15px 16px 13px', cursor: ping.handle ? 'pointer' : 'default' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left' }}>
        <span style={{ flex: 1, minWidth: 0, fontFamily: "'Instrument Serif', serif", fontSize: 20, color: ping.handle ? C.cream : C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {ping.handle ? (
            <><span style={{ color: rgba(C.star, 0.9) }}>@</span>{ping.handle}</>
          ) : (
            <span style={{ fontStyle: 'italic', fontSize: 15 }}>{t('pings.elsewhere')}</span>
          )}
        </span>
        {ping.handle && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0, fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '.6px', textTransform: 'uppercase', color: rgba(C.star, 0.75) }}>
            <Icon name="star" size={11} color={rgba(C.star, 0.7)} stroke={1.8} /> {t('pings.locateShort')}
          </span>
        )}
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.6px', textTransform: 'uppercase', color: chipColor, background: rgba(chipColor, 0.1), border: `1px solid ${rgba(chipColor, 0.32)}`, borderRadius: RADIUS.chip, padding: '3px 9px', flexShrink: 0 }}>
          {t(`pings.${state}`)}
        </span>
      </div>

      {ping.handle && t(`pings.${state}Sub`) && (
        <p style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.5, color: rgba(C.muted, 0.92) }}>
          {t(`pings.${state}Sub`)}
        </p>
      )}
      {ping.intent && (
        <p style={{ margin: '7px 0 0', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 14, color: rgba(C.cream, 0.7) }}>
          “{intentLine(t, ping.intent)}”
        </p>
      )}

      {(ping.handle || (!ping.mutual && days != null)) && (
        <div style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${rgba(C.cream, 0.07)}` }}>
          {confirmGo ? (
            <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
              <span style={{ fontSize: 12.5, lineHeight: 1.5, color: C.muted }}>{t('pings.letgoConfirm')}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <RowBtn C={C} tone="danger" icon="x" onClick={() => ctx.letGo(ping.handle)}>{t('pings.letgoYes')}</RowBtn>
                <RowBtn C={C} onClick={() => setConfirmGo(false)}>{t('pings.keep')}</RowBtn>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {!ping.mutual && days != null && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Space Mono', monospace", fontSize: 11, color: soon ? rgba(C.star, 0.92) : rgba(C.muted, 0.8) }}>
                  {days === 0 ? t('pings.today') : soon ? t('pings.expiringSoon', { n: days }) : t('pings.days', { n: days })}
                </span>
              )}
              <span style={{ flex: 1 }} />
              {ping.mutual && ping.handle ? (
                <RowBtn C={C} tone="accent" icon="message" onClick={() => ctx.openConversation(ping.handle)}>{t('pings.open')}</RowBtn>
              ) : ping.handle ? (
                <>
                  {renewed ? (
                    <span className="fade" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: rgba(C.star, 0.9) }}>
                      <Icon name="check" size={13} color={rgba(C.star, 0.9)} /> {t('pings.renewed')}
                    </span>
                  ) : (
                    <RowBtn C={C} tone={soon ? 'accent' : 'default'} icon="refresh" onClick={renew}>{t('pings.renew')}</RowBtn>
                  )}
                  <RowBtn C={C} tone="danger" icon="x" onClick={() => setConfirmGo(true)}>{t('pings.letgo')}</RowBtn>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}

      {ctx.demo && !ping.mutual && ping.handle && (
        <div style={{ marginTop: 10 }}>
          <GhostButton
            C={C}
            onClick={(e) => {
              e.stopPropagation()
              ctx.simulateMutual(ping.handle)
            }}
            style={{ padding: 0, fontSize: 11, letterSpacing: '.6px', fontFamily: "'Space Mono', monospace", color: rgba(C.star, 0.8) }}
          >
            ✦ {t('pings.sim')}
          </GhostButton>
        </div>
      )}
    </GlassPanel>
  )
}

// An empty slot — a dashed glass placeholder holding a faint star, so the number
// of slots you have (and how many are open) is always visible at a glance. Once
// both free slots are held, this same shape becomes the door to the third
// (`paywall`): the dash warms to amber and the copy names what tapping it opens
// — the checkout, not a free placement.
function EmptySlotCard({ C, onClick, paywall }) {
  const { t } = useI18n()
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '15px 16px', textAlign: 'left', cursor: 'pointer',
        borderRadius: RADIUS.card,
        background: h ? rgba(C.ink2, 0.5) : rgba(C.ink2, 0.3),
        border: `1.5px dashed ${paywall ? rgba(C.star, h ? 0.42 : 0.26) : rgba(C.cream, h ? 0.26 : 0.15)}`,
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', transition: 'all .2s',
      }}
    >
      <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: '50%', flexShrink: 0, border: `1px solid ${paywall ? rgba(C.star, 0.3) : rgba(C.cream, 0.14)}`, opacity: h ? 1 : 0.7, transition: 'opacity .2s' }}>
        <Brandmark C={C} size={15} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: rgba(C.cream, 0.82) }}>{paywall ? t('pings.slotNext') : t('pings.slotEmpty')}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{paywall ? t('pings.slotNextSub') : t('pings.slotEmptySub')}</span>
      </span>
      <span style={{ flex: 1 }} />
      <Icon name="plus" size={16} color={rgba(C.star, 0.8)} stroke={2} />
    </button>
  )
}

// A mutual match on the status page — a resolved outcome, not a standing slot,
// so it lives in its own section and reads compact: the star, the handle, one
// action. It never counts against the three slots.
function MutualCard({ C, ping, ctx }) {
  const { t } = useI18n()
  return (
    <GlassPanel C={C} style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <button
          onClick={() => ctx.locatePing(ping.handle)}
          aria-label={t('pings.locate')}
          title={t('pings.locate')}
          style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 11, padding: 0, textAlign: 'left',
            background: 'none', border: 'none', color: 'inherit', font: 'inherit', cursor: 'pointer',
          }}
        >
          <StateDot C={C} state="mutual" />
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 19, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: rgba(C.star, 0.9) }}>@</span>{ping.handle}
            </span>
            {ping.intent && (
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 13, color: rgba(C.cream, 0.62), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                “{intentLine(t, ping.intent)}”
              </span>
            )}
          </span>
        </button>
        <RowBtn C={C} tone="accent" icon="message" onClick={() => ctx.openConversation(ping.handle)}>{t('pings.open')}</RowBtn>
      </div>
    </GlassPanel>
  )
}

// Your community, seated at the TOP of the pings page — clearly its own place,
// never mixed into the slot rows. One glass banner: the seal, the name, how its
// sky stands, its hero stat when it has one, and an unmistakable way IN. The
// finder stays one tap away (search/add), and the sky's live beats — a meteor
// for a ping, a constellation for a match — keep playing in the backdrop right
// here, with the same quiet caption the community page uses.
function CommunityHome({ C, ctx }) {
  const { t } = useI18n()
  const community = ctx.homeCommunity
  const open = community ? communityOpen(community) : false
  const matches = community ? Number(community.matches || 0) : 0
  const showStat = open && matches >= MATCH_FLOOR
  const [searching, setSearching] = React.useState(false)
  const view = (slug) => ctx.viewCommunity(slug)
  // the demo's live pulse fires into the shared backdrop galaxy from this
  // screen too, so the sky never goes still just because you left the page
  const pulse = useCommunityPulse({
    demo: ctx.demo, open, slug: community && community.slug, galaxyRef: ctx.homeGalaxyRef, bump: ctx.bumpCommunityActivity,
  })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '0 2px' }}>
        <Kicker C={C}>{community ? t('communities.yourCommunity') : t('communities.findYours')}</Kicker>
        {community && (
          <GhostButton C={C} onClick={() => setSearching((s) => !s)} style={{ padding: 0, fontSize: 12, color: rgba(C.star, 0.85) }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="search" size={12} color="currentColor" stroke={2} /> {t('communities.searchMore')}
            </span>
          </GhostButton>
        )}
      </div>
      {community ? (
        <>
          <GlassPanel C={C} style={{ padding: '15px 16px 14px', display: 'flex', flexDirection: 'column', gap: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <SchoolMark C={C} slug={community.slug} size={44} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, lineHeight: 1.08, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{community.name}</span>
                <SkyStatus C={C} open={open} />
              </span>
              {showStat && (
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                  <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 25, lineHeight: 1, color: C.star }}>{matches}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, letterSpacing: '.6px', textTransform: 'uppercase', color: rgba(C.muted, 0.9) }}>{t('communities.matchedShort')}</span>
                </span>
              )}
            </div>
            <OutlineButton C={C} onClick={() => view(community.slug)} style={{ width: '100%', padding: '12px 20px', borderRadius: RADIUS.field }}>
              {t('communities.view')} <Icon name="arrow" size={15} color="currentColor" stroke={1.9} />
            </OutlineButton>
          </GlassPanel>
          {/* the sky's live caption — someone placed a ping, it became mutual */}
          <LivePulse C={C} beat={pulse.beat} />
          {searching && (
            <div className="fade">
              <CommunityFinder C={C} ctx={ctx} onPick={view} />
            </div>
          )}
        </>
      ) : (
        <CommunityFinder C={C} ctx={ctx} onPick={view} />
      )}
    </div>
  )
}

export function PingsScreen({ C, ctx }) {
  const { t } = useI18n()
  const pings = ctx.pings || []
  const cap = ctx.slotsCap
  const mutual = pings.filter((p) => p.mutual)
  const active = pings.filter((p) => !p.mutual)
  const used = Math.min(active.length, cap)
  const emptyCount = Math.max(0, cap - active.length)
  const empty = pings.length === 0
  // both slots held (or however many the sandbox has raised the cap to) — the
  // last card in the list becomes the door to the next one, same shape, warmer.
  const atCap = !empty && active.length >= cap
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 38, paddingTop: 6 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Brandmark C={C} size={16} />
          <Kicker C={C}>{t('pings.kicker')}</Kicker>
          {ctx.demo && <SandboxChip C={C} />}
        </div>
      </div>

      <div className="enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11, paddingTop: 18 }}>
        {/* your community first — the place; the slots below are the pings */}
        <CommunityHome C={C} ctx={ctx} />

        {/* the slot space, clearly its own section under its own rule — always
            exactly `cap` rows: standing pings, then open slots. mutual matches
            are resolved and never sit here. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 4, paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
          {empty ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, margin: '6px 0 4px' }}>
              <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(26px, 7vw, 33px)', color: C.cream }}>
                {t('pings.emptyTitle')}
              </h2>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted, maxWidth: 300 }}>{t('pings.emptyBody')}</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 2px' }}>
                <Kicker C={C} style={{ fontSize: 10 }}>{t('pings.slotsUsed', { used, cap })}</Kicker>
                <SlotPips C={C} standing={used} cap={cap} compact subscribed={ctx.demoSubscribed} />
              </div>
              {active.map((p, i) => (
                <PingCard key={(p.handle || 'anon') + i} C={C} ping={p} ctx={ctx} />
              ))}
              {Array.from({ length: emptyCount }).map((_, i) => (
                <EmptySlotCard key={'e' + i} C={C} onClick={ctx.placeAnother} />
              ))}
              {atCap && <EmptySlotCard key="door" C={C} onClick={ctx.placeAnother} paywall />}
            </>
          )}

          {/* mutual — its own section, so a match never crowds the slots */}
          {mutual.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: empty ? 0 : 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 4px' }}>
                <Kicker C={C} color={rgba(C.star, 0.9)}>✦ {t('pings.mutualKicker')} · {mutual.length}</Kicker>
                <span aria-hidden style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${rgba(C.star, 0.22)}, transparent)` }} />
              </div>
              {mutual.map((p, i) => (
                <MutualCard key={'m' + (p.handle || i)} C={C} ping={p} ctx={ctx} />
              ))}
            </div>
          )}

          {pings.some((p) => !p.handle) && (
            <p style={{ margin: '4px 4px 0', fontSize: 11.5, lineHeight: 1.6, color: rgba(C.muted, 0.75) }}>{t('pings.elsewhereNote')}</p>
          )}
        </div>
      </div>

      <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 20 }}>
        <PrimaryButton C={C} onClick={ctx.placeAnother}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            <Icon name="plus" size={16} color={C.onStar} stroke={2.1} /> {empty ? t('pings.emptyCta') : t('pings.add')}
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('door')} style={{ fontSize: 12.5 }}>
            {t('pings.door')}
          </GhostButton>
        </div>
      </div>
    </Shell>
  )
}

// ── 5 · SHARE YOUR COMMUNITY — the living sky card ────────────────────────────
// The shareable is about the PLACE, not the person, and now the card itself is
// ALIVE: a real, breathing copy of the community's galaxy runs inside it — the
// same engine as the sky behind the app — with the seal, the serif lockup, and
// playful, tappable numbers. Tap the sky and a wave rolls through it; tap a
// number and the thing it counts happens in miniature (a meteor for a ping, a
// constellation for a match). Two ways out, both one hop: post it to your story
// (the share sheet carries the rendered card straight into instagram) or send
// it in a dm. No download step, no numbered instructions. It names no one.

// One tappable number on the living card: a big serif figure over a whispered
// mono caption. Pressing it answers in the sky behind it.
function SkyStat({ C, value, label, onTap }) {
  const [press, setPress] = React.useState(false)
  return (
    <button
      onClick={onTap}
      onPointerDown={() => setPress(true)}
      onPointerUp={() => setPress(false)}
      onPointerLeave={() => setPress(false)}
      style={{
        pointerEvents: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
        padding: '9px 12px 8px', minWidth: 74, cursor: 'pointer',
        background: rgba(C.ink, 0.36), border: `1px solid ${rgba(C.star, 0.24)}`, borderRadius: RADIUS.inner,
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        transform: press ? 'scale(0.94)' : 'scale(1)', transition: 'transform .15s ease',
      }}
    >
      <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 23, lineHeight: 1, color: C.star, textShadow: `0 0 16px ${rgba(C.star, 0.4)}` }}>{value}</span>
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 7.5, letterSpacing: '.9px', textTransform: 'uppercase', color: rgba(C.cream, 0.75), whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

export function SkyCardScreen({ C, ctx }) {
  const { t } = useI18n()
  const community = ctx.homeCommunity
  const open = community ? communityOpen(community) : false
  const stats = community
    ? {
        members: Number(community.members || 0),
        matches: community.matches != null ? Number(community.matches) : null,
        pings: community.pings != null ? Number(community.pings) : null,
      }
    : null
  const cardGalaxy = React.useRef(null)
  const [copied, setCopied] = React.useState(false)
  const copyTimer = React.useRef(null)
  React.useEffect(() => () => copyTimer.current && clearTimeout(copyTimer.current), [])
  const flashCopied = () => {
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 2200)
  }

  // Pre-render the shareable PNG so the share sheet opens inside the tap's own
  // gesture (rendering fonts + canvas after the tap would lose it on iOS).
  const fileRef = React.useRef(null)
  React.useEffect(() => {
    if (!community) return undefined
    let live = true
    renderSkyCard({ community, open, stats })
      .then(async (url) => {
        if (!live) return
        const blob = await (await fetch(url)).blob()
        if (live) fileRef.current = new File([blob], `celestual-${community.slug}-sky.png`, { type: 'image/png' })
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community && community.slug, open, stats && stats.members, stats && stats.matches, stats && stats.pings])

  // In the sandbox, the card quietly lives on its own: a meteor lands every few
  // seconds, so what you're about to post visibly breathes.
  React.useEffect(() => {
    if (!ctx.demo || !open) return undefined
    const id = setInterval(() => {
      if (cardGalaxy.current) cardGalaxy.current.launch(1)
    }, 4200)
    return () => clearInterval(id)
  }, [ctx.demo, open])

  const shareUrl = community ? inviteUrl(community.slug) : ''
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      flashCopied()
    } catch {
      /* the link is printed on the card if all else fails */
    }
  }
  // Post it to your story: ONE hop — the share sheet, carrying the rendered
  // card, and instagram is right there in it. Falls back to a link share, then
  // to a copy, so no platform dead-ends.
  const storyShare = async () => {
    const file = fileRef.current
    try {
      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file] })
        return
      }
    } catch {
      /* sheet dismissed or file share unavailable — fall through */
    }
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl })
        return
      }
    } catch {
      /* fall through to copy */
    }
    copyLink()
  }
  // Send it in a dm: the link through the share sheet — it lands straight in a
  // friend's instagram/whatsapp/messages thread. Desktop copies it instead.
  const dmShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ url: shareUrl })
        return
      }
    } catch {
      /* fall through to copy */
    }
    copyLink()
  }

  // the card's own beats — tapping a number makes the thing it counts happen
  const beatWave = () => {
    const f = cardGalaxy.current
    if (!f || !f.canvas) return
    const r = f.canvas.getBoundingClientRect()
    f.ripple(r.left + r.width / 2, r.top + r.height * 0.42)
  }
  const beatMeteor = () => {
    if (cardGalaxy.current) cardGalaxy.current.launch(1)
  }
  const beatMatch = () => {
    // a match is never marked in the sky (the double-blind, kept) — the sky
    // simply answers the touch with a wave through its heart
    beatWave()
  }

  // No community joined yet → there's no sky to share. Send them to find one.
  if (!community) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackBtn C={C} onClick={() => ctx.go(ctx.pings.length ? 'pings' : 'landing')} />
          <Kicker C={C}>{t('sky.kicker')}</Kicker>
          <div style={{ width: 38 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 }}>
          <div className="floaty"><StarMark C={C} size={64} /></div>
          <p style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 20, lineHeight: 1.35, color: rgba(C.cream, 0.9), maxWidth: 320 }}>{t('sky.none')}</p>
        </div>
        <div className="enter" style={{ paddingTop: 12 }}>
          <PrimaryButton C={C} onClick={() => ctx.go('worlds')}>{t('sky.find')}</PrimaryButton>
        </div>
      </Shell>
    )
  }

  const pings = stats.pings
  const matches = stats.matches
  const showMatches = open && matches != null && matches >= MATCH_FLOOR

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.pings.length ? 'pings' : 'landing')} />
        <Kicker C={C}>{t('sky.kicker')}</Kicker>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, paddingTop: 12 }}>
        <div className="enter" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(28px, 8vw, 36px)', lineHeight: 1.1, color: C.cream }}>
            {t('sky.title1')} <span style={{ color: C.star }}>{t('sky.title2')}</span>
          </h2>
          <p style={{ margin: '0 auto', fontSize: 13, lineHeight: 1.6, color: C.muted, maxWidth: 340 }}>
            {t(open ? 'sky.subOpen' : 'sky.subGathering', { name: community.short })}
          </p>
        </div>

        {/* THE LIVING CARD — a real galaxy breathing inside the shareable.
            Tap the sky: a wave rolls through it. Tap a number: it answers. */}
        <div
          className="enter"
          onClick={(e) => {
            if (cardGalaxy.current) cardGalaxy.current.ripple(e.clientX, e.clientY)
          }}
          style={{
            position: 'relative', width: 'min(300px, 76vw)', aspectRatio: '9 / 15', borderRadius: 24, overflow: 'hidden',
            border: `1px solid ${rgba(C.star, 0.26)}`, boxShadow: `0 30px 90px rgba(0,0,0,.62), 0 0 52px ${rgba(C.star, 0.15)}`,
            background: C.ink2, animationDelay: '.06s', cursor: 'pointer',
          }}
        >
          <CommunityGalaxyCanvas
            inline
            key={community.slug + (open ? ':open' : ':forming')}
            you={C.you}
            them={C.them}
            pings={open && pings != null ? pings : 0}
            forming={!open}
            onReady={(f) => (cardGalaxy.current = f)}
          />
          {/* the card's face — laid over the live sky, taps falling through
              except on the numbers */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 12px 13px', pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SchoolMark C={C} slug={community.slug} size={26} />
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: '2.5px', textTransform: 'uppercase', color: rgba(C.cream, 0.85) }}>{community.short}</span>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ textAlign: 'center', textShadow: '0 2px 18px rgba(0,0,0,.85)' }}>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 25, lineHeight: 1.12, color: C.cream }}>
                {t('sky.cardLine', { name: community.short })}
              </div>
              <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 25, lineHeight: 1.12, color: open ? C.star : rgba(C.cream, 0.9) }}>
                {open ? t('sky.cardOpen') : t('sky.cardGathering')}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 13 }}>
              <SkyStat C={C} value={stats.members.toLocaleString()} label={t('sky.statInside')} onTap={beatWave} />
              {open && pings != null ? (
                <SkyStat C={C} value={pings.toLocaleString()} label={t('sky.statPings')} onTap={beatMeteor} />
              ) : (
                <SkyStat C={C} value={untilLaunchShort()} label={t('sky.statOpens')} onTap={beatWave} />
              )}
              {showMatches && <SkyStat C={C} value={matches.toLocaleString()} label={t('sky.statMatches')} onTap={beatMatch} />}
            </div>
            <div style={{ marginTop: 12, fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: '.4px', color: rgba(C.cream, 0.65), textShadow: '0 1px 10px rgba(0,0,0,.8)' }}>
              celestual.us/c/{community.slug}
            </div>
          </div>
        </div>
        <p aria-hidden style={{ margin: 0, textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: 8.5, letterSpacing: '1px', textTransform: 'uppercase', color: rgba(C.muted, 0.6) }}>
          {t('sky.cardHint')}
        </p>
      </div>

      {/* two ways out, both one hop — no saving, no steps */}
      <div className="enter" style={{ animationDelay: '.14s', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
        <PrimaryButton C={C} onClick={storyShare}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            <Icon name="instagram" size={16} color={C.onStar} stroke={2} /> {t('sky.story')}
          </span>
        </PrimaryButton>
        <OutlineButton C={C} onClick={dmShare} style={{ width: '100%', padding: '13px 22px', borderRadius: RADIUS.field }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            <Icon name={copied ? 'check' : 'message'} size={15} color="currentColor" stroke={1.9} /> {copied ? t('sky.copied') : t('sky.dm')}
          </span>
        </OutlineButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={copyLink} style={{ fontSize: 12.5 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Icon name={copied ? 'check' : 'copy'} size={13} color="currentColor" /> {copied ? t('sky.copied') : t('sky.copy')}
            </span>
          </GhostButton>
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.55, color: rgba(C.muted, 0.8) }}>{t('sky.foot')}</p>
      </div>
    </Shell>
  )
}

// ── COMMUNITIES (the official, curated launch spaces) ─────────────────────────
// Communities are not user-created — the team owns the list (communities.js); a
// user only joins or leaves. Placing a ping never depends on any of this. There
// is no member threshold: every community's sky OPENS together when the launch
// countdown ends (communities.js LAUNCH_AT), and its live weekly readout lights
// up. The demo seeds them live, with a rolling activity feed, and lets you
// join — all in-memory, gone on tab close.

// How a community's state reads: not a badge, not a pill, no pulsing "live"
// dot (a named tell in DESIGN.md §9) — a quiet spoken line in the emotional
// register. An open sky speaks in cream with a breath of the star's warmth;
// a gathering one stays in the mechanical hush.
function SkyStatus({ C, open, size = 13.5 }) {
  const { t } = useI18n()
  return (
    <span
      style={{
        fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: size, lineHeight: 1.25,
        color: open ? rgba(C.cream, 0.92) : rgba(C.muted, 0.92),
        textShadow: open ? `0 0 14px ${rgba(C.star, 0.35)}` : 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {open ? t('communities.skyOpen') : t('communities.skyGathering')}
    </span>
  )
}

// ── the meeting view (a tapped public @) ──────────────────────────────────────
// The camera has flown to their star with the SAME held cinematic dive as the
// star view, so this overlay speaks the star view's exact language: a hairline
// stem rising from the held star, the @ large in the product's amber, one glass
// pill for the single outward step, and one clear way home top-right. A column,
// centered, everything ellipsized — nothing can ever overflow its box.
function MeetOverlay({ C, label, onClose }) {
  const { t } = useI18n()
  const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // the name arrives WITH the camera: after the bank (≤1.1s) + the run
  const arrive = reduced ? '0.2s' : '2.1s'
  return (
    <>
      {/* the close — releases the dive; the camera glides home on its own */}
      <div data-noripple style={{ position: 'fixed', top: 'max(14px, env(safe-area-inset-top))', right: 'max(14px, env(safe-area-inset-right))', zIndex: 30 }}>
        <button
          onClick={onClose}
          aria-label={t('reveal.close')}
          className="fade"
          style={{
            width: 42, height: 42, borderRadius: '50%', cursor: 'pointer',
            background: rgba(C.ink2, 0.8), border: `1px solid ${rgba(C.cream, 0.22)}`,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            display: 'grid', placeItems: 'center', color: rgba(C.cream, 0.92),
            boxShadow: '0 10px 34px rgba(0,0,0,.5)',
          }}
        >
          <Icon name="x" size={16} color="currentColor" stroke={2} />
        </button>
      </div>

      {/* the name, risen beneath the held star (arrives with the camera) */}
      <div
        className="fade"
        style={{
          position: 'fixed', left: 0, right: 0, top: '43%', zIndex: 24,
          pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
          paddingTop: 30, textAlign: 'center', animationDelay: arrive,
        }}
      >
        <span aria-hidden style={{ width: 1, height: 24, background: `linear-gradient(180deg, transparent, ${rgba(C.star, 0.65)})` }} />
        <span
          style={{
            fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 'clamp(22px, 6vw, 28px)',
            letterSpacing: '.5px', color: C.star, textShadow: '0 2px 18px rgba(0,0,0,.85)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '86vw',
          }}
        >
          @{label}
        </span>
        <a
          href={`https://www.instagram.com/${label}`}
          target="_blank"
          rel="noopener noreferrer"
          data-noripple
          style={{
            pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '86vw',
            padding: '9px 16px', borderRadius: RADIUS.chip,
            background: rgba(C.ink2, 0.82), border: `1px solid ${rgba(C.star, 0.42)}`,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            color: C.cream, textDecoration: 'none', fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 13, fontWeight: 600, boxShadow: '0 10px 34px rgba(0,0,0,.45)',
          }}
        >
          <span style={{ flexShrink: 0, display: 'inline-flex' }}><Icon name="instagram" size={14} color={rgba(C.star, 0.95)} stroke={1.9} /></span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('public.meet')}</span>
        </a>
      </div>
    </>
  )
}

// ── community life: the live pulse ────────────────────────────────────────────

// The demo's living pulse. On an OPEN community it fires the real beats: a ping
// streaks into the galaxy as a meteor (+ a caption), a match traces an anonymous
// constellation (+ a caption). A GATHERING community shows no countable beats
// (its exact numbers are withheld) — only the quiet growth of new members.
// Everything is imperative on the live galaxy field (galaxyRef) so the canvas
// and the printed numbers move together. In-memory; demo only.
function useCommunityPulse({ demo, open, slug, galaxyRef, bump }) {
  // ONE beat at a time — the sky is the show; the caption is an aside. A new
  // beat replaces the last (the keyed remount replays the rise-hold-fade).
  const [beat, setBeat] = React.useState(null)
  const idRef = React.useRef(0)
  const clearRef = React.useRef(null)
  const bumpRef = React.useRef(bump)
  bumpRef.current = bump

  const pushBeat = React.useCallback((text, kind) => {
    const id = ++idRef.current
    setBeat({ id, text, kind })
    if (clearRef.current) clearTimeout(clearRef.current)
    clearRef.current = setTimeout(() => setBeat((b) => (b && b.id === id ? null : b)), 3200)
  }, [])

  React.useEffect(() => {
    setBeat(null)
    return () => {
      if (clearRef.current) clearTimeout(clearRef.current)
    }
  }, [slug])

  // a placed ping: a meteor lands + the count ticks (open communities only)
  const firePing = React.useCallback(() => {
    if (galaxyRef.current) galaxyRef.current.launch(1)
    if (bumpRef.current) bumpRef.current(slug, 'ping')
    pushBeat('someone just placed a ping', 'ping')
  }, [slug, galaxyRef, pushBeat])

  React.useEffect(() => {
    if (!demo || !slug) return undefined
    const timers = []
    if (open) {
      timers.push(setInterval(firePing, 3200 + Math.random() * 1400))
      // a match, now and then — only ever a caption and a count: nothing in
      // the sky marks a match (the double-blind, kept)
      timers.push(setInterval(() => {
        if (bumpRef.current) bumpRef.current(slug, 'match')
        pushBeat('it just became mutual for two people here', 'match')
      }, 16000 + Math.random() * 6000))
    } else {
      // gathering: only quiet growth, no counted beats
      timers.push(setInterval(() => {
        if (bumpRef.current) bumpRef.current(slug, 'join')
        pushBeat('someone new just joined', 'join')
      }, 6000 + Math.random() * 3000))
    }
    return () => timers.forEach(clearInterval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo, open, slug])

  // the sandbox control: send a quick wave of pings (open) or bring a few in
  const fireWave = React.useCallback(() => {
    if (open) {
      for (let k = 0; k < 6; k++) setTimeout(firePing, k * 300)
    } else {
      for (let k = 0; k < 4; k++) setTimeout(() => { if (bumpRef.current) bumpRef.current(slug, 'join') }, k * 200)
      pushBeat('four more just joined', 'join')
    }
  }, [open, slug, firePing, pushBeat])

  return { beat, fireWave }
}

// The live pulse — a single quiet caption docked beneath the sky: no chip, no
// card, just a line of overheard signal that rises, holds, and lifts away. Its
// slot keeps a fixed height so the page never breathes with it.
function LivePulse({ C, beat }) {
  const col = beat && beat.kind === 'match' ? C.them : beat && beat.kind === 'join' ? C.muted : C.star
  return (
    <div aria-live="polite" style={{ height: 30, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      {beat && (
        <span
          key={beat.id}
          className="pulse-line"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, maxWidth: '94%', whiteSpace: 'nowrap',
            fontFamily: "'Space Grotesk', sans-serif", fontSize: 12.5, letterSpacing: '.2px',
            color: rgba(C.cream, 0.82), textShadow: '0 1px 12px rgba(0,0,0,.8)',
          }}
        >
          <Icon name={beat.kind === 'join' ? 'plus' : 'star'} size={11} color={rgba(col, 0.9)} stroke={2} />
          {beat.text}
        </span>
      )}
    </div>
  )
}

// ── the reveal countdown + what it means ──────────────────────────────────────
// A community's sky lights its week all at once, on a weekly cadence (Sunday
// night). The countdown is a live clock to that shared moment — it makes the place
// feel alive and adds a gentle deadline without ever nagging. The ⓘ opens a quiet
// note explaining the countdown, the requirement, and exactly what lights up, so
// none of the mechanic is hidden. Ticks in the viewer's own timezone.
function fmtCountdown(ms) {
  if (ms <= 0) return null
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  if (d > 0) return { big: `${d}d ${pad(h)}h`, small: `${pad(m)}m` }
  if (h > 0) return { big: `${h}h ${pad(m)}m`, small: `${pad(sec)}s` }
  return { big: `${pad(m)}m ${pad(sec)}s`, small: null }
}

// The launch clock compressed to one short token ("12d 04h", "3h 12m") for a
// tight stat slot — the share card's countdown stat.
function untilLaunchShort(now = Date.now()) {
  const c = fmtCountdown(LAUNCH_AT.getTime() - now)
  return c ? c.big : 'soon'
}

function RevealCountdown({ C, open }) {
  const { t } = useI18n()
  const [now, setNow] = React.useState(() => Date.now())
  const [info, setInfo] = React.useState(false)
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  // Open: the weekly reveal (sunday night). Gathering: the LAUNCH itself — the
  // one shared moment every community's sky opens. No thresholds anywhere;
  // time is the only gate, and it's the same time for everyone.
  const target = React.useMemo(
    () => (open ? nextRevealAt(new Date(now)).getTime() : LAUNCH_AT.getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, Math.floor(now / 30000)],
  )
  const c = fmtCountdown(target - now)
  const label = open ? t('reveal.week') : t('reveal.opens')
  // One quiet line — the page's heartbeat, not its headline: label in mono
  // metadata, the time itself in amber. Docked low, so the ⓘ note opens UPWARD,
  // anchored to the readout strip (the nearest positioned ancestor) so it can
  // never clip off a narrow screen.
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        <Icon name="clock" size={12} color={rgba(C.star, 0.85)} stroke={1.8} />
        <Kicker C={C} style={{ fontSize: 9, letterSpacing: '1.8px', color: rgba(C.muted, 0.95) }}>{label}</Kicker>
      </span>
      {/* the time + its ⓘ stay one unit, so a narrow viewport breaks between the
          label and the clock — never stranding the info button on its own line */}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'baseline', gap: 5,
            fontFamily: "'Space Mono', monospace", fontVariantNumeric: 'tabular-nums',
          }}
        >
          <span style={{ fontSize: 14.5, letterSpacing: '.5px', color: C.star, textShadow: `0 0 14px ${rgba(C.star, 0.35)}` }}>{c ? c.big : t('reveal.now')}</span>
          {c && c.small && <span style={{ fontSize: 11, color: rgba(C.muted, 0.9) }}>{c.small}</span>}
        </span>
        <button
          onClick={() => setInfo((v) => !v)}
          aria-label={t('reveal.infoTitle')}
          data-noripple
          style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <Icon name="info" size={14} color={rgba(C.muted, info ? 1 : 0.7)} stroke={1.7} />
        </button>
      </span>

      {info && (
        <>
          <button
            aria-hidden
            onClick={() => setInfo(false)}
            data-noripple
            style={{ position: 'fixed', inset: 0, zIndex: 29, background: 'transparent', border: 'none', cursor: 'default' }}
          />
          <div
            className="fade"
            data-noripple
            style={{
              position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, right: 0, zIndex: 30,
              padding: '16px 17px', borderRadius: RADIUS.card,
              background: rgba(C.ink2, 0.97), border: `1px solid ${rgba(C.star, 0.24)}`,
              boxShadow: '0 24px 70px rgba(0,0,0,.6)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left',
            }}
          >
            <Kicker C={C} style={{ fontSize: 10 }}>{t('reveal.infoTitle')}</Kicker>
            {[['clock', t('reveal.infoWhat')], ['lock', t('reveal.infoReq')], ['star', t('reveal.infoReveals')]].map(([ic, tx]) => (
              <div key={ic} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name={ic} size={13} color={rgba(C.star, 0.8)} stroke={1.8} /></span>
                <span style={{ fontSize: 12.5, lineHeight: 1.55, color: rgba(C.cream, 0.86) }}>{tx}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <GhostButton C={C} onClick={() => setInfo(false)} style={{ padding: 0, fontSize: 12, color: rgba(C.star, 0.9) }}>{t('reveal.close')}</GhostButton>
            </div>
          </div>
        </>
      )}
    </div>
  )
}


// One community as a list row: the seal, its name + status, and — for an open
// one past the match floor — its hero stat (matches this week). The whole row
// opens the community; a joined one is marked. No percentage: a community is not
// a progress bar, it's a place that's either open or still gathering.
function CommunityCard({ C, community, ctx }) {
  const { t } = useI18n()
  const open = communityOpen(community)
  const matches = Number(community.matches || 0)
  const showStat = open && matches >= MATCH_FLOOR
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={() => ctx.viewCommunity(community.slug)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '14px 15px', borderRadius: RADIUS.card,
        background: rgba(C.ink2, h ? 0.72 : 0.6), border: `1px solid ${rgba(C.cream, h ? 0.16 : 0.1)}`,
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', transition: 'background .2s, border-color .2s',
      }}
    >
      <SchoolMark C={C} slug={community.slug} size={46} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, maxWidth: '100%' }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, lineHeight: 1.05, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{community.name}</span>
          {community.joined && <Icon name="check" size={13} color={rgba(C.star, 0.9)} />}
        </span>
        <SkyStatus C={C} open={open} />
      </span>
      {showStat ? (
        <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
          <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 26, lineHeight: 1, color: C.star }}>{matches}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8.5, letterSpacing: '.6px', textTransform: 'uppercase', color: rgba(C.muted, 0.9) }}>{t('communities.matchedShort')}</span>
        </span>
      ) : (
        <Icon name="arrow" size={18} color={rgba(C.muted, 0.7)} stroke={1.9} />
      )}
    </button>
  )
}

export function WorldsScreen({ C, ctx }) {
  const { t } = useI18n()
  const communities = ctx.communities || []
  // joined first, then open ones (by matches), then the gathering ones by size
  const ordered = [...communities].sort(
    (a, b) =>
      (b.joined ? 1 : 0) - (a.joined ? 1 : 0) ||
      (communityOpen(b) ? 1 : 0) - (communityOpen(a) ? 1 : 0) ||
      Number(b.matches || 0) - Number(a.matches || 0) ||
      Number(b.members || 0) - Number(a.members || 0),
  )
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.pings.length ? 'pings' : 'landing')} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Kicker C={C}>{t('communities.kicker')}</Kicker>
          {ctx.demo && <SandboxChip C={C} />}
        </div>
        <div style={{ width: 38 }} />
      </div>

      <div className="enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
        {/* your one community, made unmistakable and one tap away */}
        {ctx.homeCommunity ? (
          <HomeCommunityBanner C={C} community={ctx.homeCommunity} onOpen={() => ctx.viewCommunity(ctx.homeCommunity.slug)} />
        ) : (
          <p style={{ margin: '0 2px', fontSize: 13, lineHeight: 1.55, color: C.muted }}>{t('communities.intro')}</p>
        )}
        {ordered.map((c) => (
          <CommunityCard key={c.slug} C={C} community={c} ctx={ctx} />
        ))}
      </div>

      <p style={{ margin: '16px 2px 0', textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.muted, 0.8) }}>
        {ctx.homeCommunity ? t('home.oneOnly') : t('communities.foot')}
      </p>
    </Shell>
  )
}

// The "you're in X" banner atop the communities list — amber-lit, tappable, so a
// member's own sky is obvious and immediately reachable. A ✦ mark, the seal, the
// name, and a clear go-in arrow.
function HomeCommunityBanner({ C, community, onOpen }) {
  const { t } = useI18n()
  const [h, setH] = React.useState(false)
  return (
    <button
      onClick={onOpen}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '15px 16px', borderRadius: RADIUS.card,
        background: `linear-gradient(120deg, ${rgba(C.star, h ? 0.16 : 0.12)}, ${rgba(C.them, 0.06)})`,
        border: `1px solid ${rgba(C.star, h ? 0.5 : 0.36)}`,
        boxShadow: `0 0 26px ${rgba(C.star, h ? 0.16 : 0.1)}`, transition: 'background .2s, border-color .2s, box-shadow .2s',
      }}
    >
      <SchoolMark C={C} slug={community.slug} size={44} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: '2px', textTransform: 'uppercase', color: rgba(C.star, 0.95) }}>
          <Icon name="check" size={11} color={rgba(C.star, 0.95)} stroke={2.6} /> {t('home.badge')}
        </span>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 21, lineHeight: 1.05, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{community.name}</span>
      </span>
      <Icon name="arrow" size={18} color={rgba(C.star, 0.9)} stroke={2} />
    </button>
  )
}

// The community page (also the /c/<slug> destination). Its living galaxy IS the
// page — one star per real ping, a meteor for every new one, an anonymous
// constellation for every mutual match — so the layout stays out of its way:
// a compact identity lockup up top, an unobstructed hero zone for the sky, a
// single quiet live-pulse caption at its foot, and one glass readout panel
// holding the numbers and the shared reveal clock. When this is YOUR community,
// the page reuses the app-wide backdrop (which IS your community's galaxy), so
// your own star — placed anywhere in the app — is findable right here: the
// find-your-star control flies the camera through the field to it. A gathering
// community swirls as a forming proto-galaxy and withholds its counts; an open
// one resolves into stars and prints its weekly readout. Everyone can watch;
// only a member (proven at their school by a .edu code) can ping in.
export function CommunityScreen({ C, ctx }) {
  const { t } = useI18n()
  const communities = ctx.communities || []
  const community = communities.find((c) => c.slug === ctx.openCommunity) || communities[0]
  const slug = community && community.slug
  const localGalaxyRef = React.useRef(null)
  // Your own community reuses the app's backdrop galaxy (ctx.homeGalaxyRef); any
  // other community you're browsing mounts its own field on top.
  const isHome = !!(ctx.homeCommunity && slug && ctx.homeCommunity.slug === slug)
  const useShared = isHome && !!ctx.homeGalaxyRef
  const galaxyRef = useShared ? ctx.homeGalaxyRef : localGalaxyRef

  const open = community ? communityOpen(community) : false
  const week = community && open ? community.week : null
  const matches = Number((community && community.matches) || 0)
  const showMatches = open && matches >= MATCH_FLOOR

  const pulse = useCommunityPulse({
    demo: ctx.demo, open, slug, galaxyRef, bump: ctx.bumpCommunityActivity,
  })
  // find-your-star: the camera dives through the field to the member's own star
  // and glides back. `finding` keeps the control lit for the flight's length so
  // it can't be double-fired mid-dive.
  const [finding, setFinding] = React.useState(false)
  const findStar = () => {
    if (finding) return
    const ok = galaxyRef.current && galaxyRef.current.locateMine()
    // the full flight: the bank (≤1.1s) + the run in + the hold + the return
    if (ok) { setFinding(true); setTimeout(() => setFinding(false), 5700) }
  }

  // The hand-driven sky lives ONLY on this page: switch on the camera gestures
  // (drag orbits, pinch/scroll zooms, double-tap dives) and the public-@ layer
  // for whichever galaxy is the hero here (the shared home field, or a browsed
  // community's own). While a zoom holds, the page goes IMMERSIVE — the seal
  // and every panel melt away so the sky owns the whole frame, with one quiet
  // pill to pull back. Everywhere else this same engine is just the ambient
  // backdrop: no gestures, no handles floating behind foreground cards.
  const [zoomed, setZoomed] = React.useState(false)
  // a tapped public @ — the camera has dollied to their star; this is the small
  // meeting card that names them and offers the one outward step
  const [meet, setMeet] = React.useState(null)
  const wireZoom = React.useCallback((f) => {
    if (!f || !f.setZoomEnabled) return
    f.setZoomEnabled(true)
    f.onZoomState = setZoomed
    f.onTagTap = (label) => setMeet({ label })
    // the engine may arrive after the measuring effect ran — push the chrome
    // insets to it the moment it's live
    if (insetsPushRef.current) insetsPushRef.current()
  }, [])
  // The public @s appear ONLY while the sky is held fully expanded (the
  // immersive zoom): at rest the galaxy stays pure light, and the moment the
  // chrome melts away the opted-in handles rise one by one over their stars.
  React.useEffect(() => {
    const g = galaxyRef.current
    if (g && g.setTagsEnabled) g.setTagsEnabled(zoomed)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomed])
  React.useEffect(() => {
    if (useShared) wireZoom(galaxyRef.current)
    return () => {
      const g = galaxyRef.current
      if (g && g.dive && g.dive.held && g.releaseDive) g.releaseDive()
      if (g && g.setZoomEnabled) g.setZoomEnabled(false)
      if (g && g.setTagsEnabled) g.setTagsEnabled(false)
      if (g && g.onZoomState === setZoomed) g.onZoomState = null
      if (g && g.onTagTap) g.onTagTap = null
      setZoomed(false)
      setMeet(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useShared, slug])
  const pullBack = () => {
    const g = galaxyRef.current
    if (g && g.dive && g.dive.held && g.releaseDive) g.releaseDive()
    if (g && g.resetView) g.resetView()
    setMeet(null)
  }
  // the meeting over: release the held dive — the camera glides home on its own
  const closeMeet = () => {
    const g = galaxyRef.current
    if (g && g.releaseDive) g.releaseDive()
    setMeet(null)
  }

  // The sky owns the frame: the screen measures its own chrome (the header
  // lockup, the readout strip + actions) and hands those insets to the engine,
  // which re-centers the disk in the band of sky the foreground leaves clear.
  // The heart-seal follows the engine's own center, so the mark always rests
  // exactly in the core light — on any phone, any fold, any monitor.
  const topRef = React.useRef(null)
  const botRef = React.useRef(null)
  const insetsPushRef = React.useRef(null)
  const [sealY, setSealY] = React.useState(null)
  React.useEffect(() => {
    let raf = 0
    const send = () => {
      const g = galaxyRef.current
      if (!g || !g.setViewInsets) return
      const tb = topRef.current ? topRef.current.getBoundingClientRect().bottom : 0
      const bb = botRef.current ? Math.max(0, window.innerHeight - botRef.current.getBoundingClientRect().top) : 0
      g.setViewInsets(Math.max(0, tb), bb + 6)
      if (g.cy) setSealY(g.cy)
    }
    const queue = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(send)
    }
    insetsPushRef.current = queue
    queue()
    const ro = window.ResizeObserver ? new ResizeObserver(queue) : null
    if (ro && topRef.current) ro.observe(topRef.current)
    if (ro && botRef.current) ro.observe(botRef.current)
    window.addEventListener('resize', queue)
    return () => {
      if (ro) ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('resize', queue)
      insetsPushRef.current = null
      const g = galaxyRef.current
      if (g && g.setViewInsets) g.setViewInsets(0, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, useShared, community && community.joined, open])
  // chrome melts away while the sky is held zoomed — and for the length of a
  // find-your-star dive, so the flight owns the whole frame. One shared
  // envelope; the entrance animations must be suppressed for the melt (their
  // fill-mode would pin opacity at 1 and override the inline fade — same trick
  // App plays for the fly-to-a-star flight).
  const skyHeld = zoomed || finding || !!meet
  const melt = { opacity: skyHeld ? 0 : 1, transition: 'opacity .5s ease', pointerEvents: skyHeld ? 'none' : 'auto', animation: skyHeld ? 'none' : undefined }

  // the dock melts with the rest of the chrome while the sky is held
  React.useEffect(() => {
    if (ctx.setNavHidden) ctx.setNavHidden(skyHeld)
    return () => {
      if (ctx.setNavHidden) ctx.setNavHidden(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skyHeld])

  if (!community) {
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackBtn C={C} onClick={() => ctx.go('worlds')} />
          <Brandmark C={C} size={18} />
          <div style={{ width: 38 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ fontSize: 13, color: C.muted }}>{t('communities.none')}</p>
        </div>
        <div />
      </Shell>
    )
  }
  const joined = !!community.joined
  const pings = community.pings != null ? Number(community.pings) : 0

  return (
    <Shell>
      {/* Your own community's field is the app backdrop (rendered by App); any other
          community you're browsing mounts its own field, full-bleed behind all (z0). */}
      {!useShared && (
        <CommunityGalaxyCanvas
          key={slug}
          you={C.you}
          them={C.them}
          pings={pings}
          forming={!open}
          publicHandles={ctx.demo ? DEMO_PUBLIC[slug] || [] : []}
          onReady={(f) => { localGalaxyRef.current = f; wireZoom(f) }}
        />
      )}
      {/* the seal at the galaxy's heart — the community's mark resting in its own
          core light (the engine centers the disk at ~42% of the viewport). A soft
          ink clearing sits under it so the dense bulge stars never fight the
          mark (no hard ring — the core's own light is the frame). It fades away
          whenever a camera dive or a held zoom takes the sky over. */}
      <div
        aria-hidden
        style={{
          position: 'fixed', left: '50%', top: sealY != null ? sealY : '42%', transform: 'translate(-50%, -50%)', zIndex: 0,
          pointerEvents: 'none', display: 'grid', placeItems: 'center',
          opacity: skyHeld || ctx.skyFlight ? 0 : 1, transition: 'opacity .8s ease, top .45s cubic-bezier(.2,.7,.2,1)',
        }}
      >
        <span style={{ position: 'absolute', width: 126, height: 126, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(C.ink, 0.42)}, ${rgba(C.ink, 0.18)} 46%, transparent 68%)` }} />
        <span style={{ position: 'absolute', width: 190, height: 190, borderRadius: '50%', background: `radial-gradient(circle, ${rgba(C.star, 0.1)}, ${rgba(C.them, 0.035)} 55%, transparent 72%)`, filter: 'blur(3px)' }} />
        <span style={{ opacity: 0.92, filter: `drop-shadow(0 0 18px ${rgba(C.star, 0.38)})` }}>
          <SchoolMark C={C} slug={community.slug} size={54} />
        </span>
      </div>

      {/* a soft scrim seats the readout + actions on quiet space without walling
          off the sky (z0, over canvas). It lifts with the rest of the chrome
          while the sky is held zoomed. */}
      <div aria-hidden style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: '32%', background: `linear-gradient(to bottom, transparent, ${rgba(C.ink, 0.44)} 52%, ${rgba(C.ink, 0.82)})`, pointerEvents: 'none', zIndex: 0, opacity: skyHeld ? 0 : 1, transition: 'opacity .5s ease' }} />

      {/* a tapped public @ — the MEETING view: the camera has flown to their
          star with the same held dive as the star view; this overlay names
          them beneath it and offers the one outward step. */}
      {meet && !finding && <MeetOverlay key={meet.label} C={C} label={meet.label} onClose={closeMeet} />}

      {/* the way home from a held zoom — one quiet pill, floating clear of the
          melted chrome. data-noripple so the tap lands on it, not the sky. */}
      {zoomed && !finding && !meet && (
        <div data-noripple style={{ position: 'fixed', left: '50%', bottom: 'max(30px, env(safe-area-inset-bottom))', transform: 'translateX(-50%)', zIndex: 5 }}>
          <button
            onClick={pullBack}
            className="fade"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer',
              padding: '9px 18px', borderRadius: RADIUS.chip,
              background: rgba(C.ink2, 0.78), border: `1px solid ${rgba(C.cream, 0.22)}`,
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '1px', textTransform: 'uppercase',
              color: rgba(C.cream, 0.92), boxShadow: '0 12px 40px rgba(0,0,0,.5)',
            }}
          >
            <span aria-hidden style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
              <Icon name="arrow" size={12} color="currentColor" stroke={2} />
            </span>
            {t('sky.reset')}
          </button>
        </div>
      )}

      {/* all content sits above the field (z1). touch-action yields horizontal
          drags (and, once zoomed, everything) to the sky's camera. */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', touchAction: zoomed ? 'none' : 'pan-y' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BackBtn C={C} onClick={() => ctx.go('worlds')} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, opacity: skyHeld ? 0 : 1, transition: 'opacity .5s ease' }}>
            <Kicker C={C}>{t('communities.kicker')}</Kicker>
            {ctx.demo && <SandboxChip C={C} />}
          </div>
          <div style={{ width: 38 }} />
        </div>

        {/* identity — the seal now rests at the galaxy's heart; up here only the
            name and where it stands, so the sky stays the page's real hero.
            (topRef: this block's bottom edge is the chrome inset the engine
            centers the disk beneath.) */}
        <div ref={topRef} className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 8, ...melt }}>
          <h1 style={{ margin: 0, textAlign: 'center', fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(23px, 6vw, 30px)', lineHeight: 1.05, color: C.cream }}>{community.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {isHome && <MemberBadge C={C} />}
            <SkyStatus C={C} open={open} size={14.5} />
          </div>
        </div>

        {/* the sky breathes in this open zone — nothing overlaps it; the live
            pulse is a single caption docked at its foot, with one whispered line
            of how to hold the sky beneath it. */}
        <div style={{ flex: 1, minHeight: 'clamp(170px, 30vh, 300px)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', ...melt }}>
          <LivePulse C={C} beat={pulse.beat} />
          <p aria-hidden style={{ margin: '0 0 2px', textAlign: 'center', fontFamily: "'Space Mono', monospace", fontSize: 8.5, letterSpacing: '1px', textTransform: 'uppercase', color: rgba(C.muted, 0.5) }}>
            {t('sky.hint')}
          </p>
        </div>

        {/* the foot of the page (botRef: measured as the bottom chrome inset).
            The readout is ONE thin strip — the clock and the headline number in
            a single line; the full weekly detail unfolds as a floating sheet
            ABOVE the strip on demand, so nothing ever stands as a wall between
            the viewer and the galaxy. */}
        <div ref={botRef} data-noripple style={{ display: 'flex', flexDirection: 'column', gap: 9, ...melt }}>
          <SkyReadout
            C={C}
            open={open}
            matches={matches}
            showMatches={showMatches}
            pings={pings}
            week={week}
          />

          {/* one action — a member pings + finds their star; a watcher joins
              (which sends a .edu code first). Everyone can watch. */}
          {joined ? (
            <>
              <PrimaryButton C={C} onClick={ctx.findOut} style={{ padding: '14px 22px' }}>{t('communities.place')}</PrimaryButton>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                {isHome && (
                  <GhostButton C={C} onClick={findStar} style={{ padding: '5px 4px', fontSize: 12, color: rgba(C.star, finding ? 1 : 0.9) }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name={finding ? 'check' : 'star'} size={13} color="currentColor" stroke={1.9} /> {t('home.locate')}
                    </span>
                  </GhostButton>
                )}
                {/* announce your @ — the one mutual, deliberate way a handle ever
                    shows in a public sky. on goes through the warning sheet;
                    off is one quiet tap. */}
                {isHome && (
                  <GhostButton
                    C={C}
                    onClick={ctx.publicStar ? ctx.retractPublicStar : ctx.askPublicStar}
                    style={{ padding: '5px 4px', fontSize: 12, color: ctx.publicStar ? rgba(C.star, 0.95) : undefined }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Icon name="eye" size={13} color="currentColor" stroke={1.8} /> {ctx.publicStar ? t('public.on') : t('public.announce')}
                    </span>
                  </GhostButton>
                )}
                <GhostButton C={C} onClick={() => ctx.leaveCommunity(community.slug)} style={{ padding: '5px 4px', fontSize: 12 }}>{t('communities.leave')}</GhostButton>
              </div>
            </>
          ) : (
            <>
              <PrimaryButton C={C} onClick={() => ctx.joinCommunity(community.slug)} style={{ padding: '14px 22px' }}>{t('communities.join', { name: community.short })}</PrimaryButton>
              <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.muted, 0.9) }}>{t('home.watch', { name: community.short })}</p>
            </>
          )}
          {ctx.demo && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GhostButton C={C} onClick={pulse.fireWave} style={{ padding: 0, fontSize: 11, letterSpacing: '.5px', fontFamily: "'Space Mono', monospace", color: rgba(C.star, 0.8) }}>
                ✦ {t(open ? 'communities.demoWave' : 'communities.demoGather')}
              </GhostButton>
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}

// The community readout, folded to a single line: the reveal clock on the left,
// the one headline fact on the right, and a small toggle that unfolds the full
// weekly detail as a sheet FLOATING over the sky (absolute, above the strip) —
// the strip's own height never changes, so the galaxy's frame stays rock-steady
// and no card ever walls off the disk. data-noripple everywhere: taps here must
// never reach the sky.
function SkyReadout({ C, open, matches, showMatches, pings, week }) {
  const { t } = useI18n()
  const [more, setMore] = React.useState(false)
  const headline = open
    ? showMatches
      ? `${matches.toLocaleString()} ${t('communities.matchedShort')}`
      : t('communities.matchesSoon')
    : t('communities.gathering')
  return (
    <div data-noripple style={{ position: 'relative' }}>
      {more && (
        <>
          {/* tap-away veil under the floating detail */}
          <button
            aria-hidden
            onClick={() => setMore(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 5, background: 'transparent', border: 'none', cursor: 'default' }}
          />
          <div
            className="fade"
            style={{
              position: 'absolute', bottom: 'calc(100% + 10px)', left: 0, right: 0, zIndex: 6,
              padding: '14px 16px', borderRadius: RADIUS.card,
              background: rgba(C.ink2, 0.94), border: `1px solid ${rgba(C.star, 0.22)}`,
              boxShadow: '0 24px 70px rgba(0,0,0,.55)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
              display: 'flex', flexDirection: 'column', gap: 9,
            }}
          >
            {open ? (
              <>
                {showMatches ? (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span key={matches} className="fade" style={{ fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(28px, 7.5vw, 38px)', lineHeight: 1, color: C.star, textShadow: `0 0 30px ${rgba(C.star, 0.3)}` }}>{matches.toLocaleString()}</span>
                    <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 15.5, color: rgba(C.cream, 0.9) }}>{t('communities.matchedLabel')}</span>
                  </div>
                ) : (
                  <p style={{ margin: 0, textAlign: 'center', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.35, color: rgba(C.cream, 0.85) }}>{t('communities.matchFloor')}</p>
                )}
                {week && week.topReason && (
                  <p style={{ margin: 0, textAlign: 'center', fontSize: 12.5, lineHeight: 1.5, color: C.muted }}>
                    {t('communities.reasonLabel')}{' '}
                    <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 14.5, color: rgba(C.cream, 0.92) }}>“{intentLine(t, week.topReason)}”</span>
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', flexWrap: 'wrap', fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.3px', color: rgba(C.muted, 0.9) }}>
                  <span>{t('communities.pings', { n: pings.toLocaleString() })}</span>
                  {week && week.joined != null && <span aria-hidden style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: C.line }} />}
                  {week && week.joined != null && <span style={{ color: rgba(C.star, 0.85) }}>{t('communities.joinedWeek', { n: Number(week.joined).toLocaleString() })}</span>}
                </div>
              </>
            ) : (
              <>
                <p style={{ margin: 0, textAlign: 'center', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 17, lineHeight: 1.3, color: rgba(C.cream, 0.92) }}>{t('communities.gatheringHero')}</p>
                <p style={{ margin: '0 auto', textAlign: 'center', fontSize: 12.5, lineHeight: 1.55, color: C.muted, maxWidth: 320 }}>{t('communities.gatheringBody2')}</p>
              </>
            )}
          </div>
        </>
      )}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
          padding: '8px 8px 8px 14px', borderRadius: RADIUS.field,
          background: rgba(C.ink2, 0.58), border: `1px solid ${rgba(C.cream, 0.08)}`,
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <RevealCountdown C={C} open={open} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: '.4px', color: showMatches ? rgba(C.star, 0.95) : rgba(C.muted, 0.9), whiteSpace: 'nowrap' }}>
            {headline}
          </span>
          <button
            onClick={() => setMore((v) => !v)}
            aria-label={t('communities.thisWeek')}
            aria-expanded={more}
            style={{ display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transform: more ? 'rotate(-90deg)' : 'rotate(90deg)', transition: 'transform .25s ease' }}
          >
            <Icon name="back" size={13} color={rgba(C.muted, more ? 1 : 0.8)} stroke={2} />
          </button>
        </span>
      </div>
    </div>
  )
}

// The clear "this is your community" badge — amber, checked, unmistakable, so a
// member always knows which sky is theirs at a glance.
function MemberBadge({ C }) {
  const { t } = useI18n()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.6px', textTransform: 'uppercase', color: rgba(C.star, 0.98), background: rgba(C.star, 0.14), border: `1px solid ${rgba(C.star, 0.42)}`, borderRadius: RADIUS.chip, padding: '4px 11px', flexShrink: 0 }}>
      <Icon name="check" size={12} color={rgba(C.star, 0.98)} stroke={2.4} /> {t('home.badge')}
    </span>
  )
}

// One result row inside the community finder's popup — its own component so the
// hover lift stays local.
function FinderRow({ C, community, onPick }) {
  const { t } = useI18n()
  const [h, setH] = React.useState(false)
  const open = communityOpen(community)
  return (
    <button
      onClick={() => onPick(community.slug)}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', width: '100%', alignItems: 'center', gap: 12, padding: '10px 10px', borderRadius: RADIUS.inner,
        border: 'none', cursor: 'pointer', textAlign: 'left', background: h ? rgba(C.star, 0.09) : 'transparent', transition: 'background .16s',
      }}
    >
      <SchoolMark C={C} slug={community.slug} size={34} />
      <span style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 17, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{community.name}</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.4px', textTransform: 'uppercase', color: open ? rgba(C.star, 0.9) : C.muted }}>
          {open ? t('communities.open') : t('communities.gathering')}{community.joined ? ` · ${t('communities.joinedTag')}` : ''}
        </span>
      </span>
      {community.joined ? (
        <Icon name="check" size={16} color={rgba(C.star, 0.9)} stroke={2.2} />
      ) : (
        <Icon name="plus" size={15} color={rgba(C.star, 0.85)} stroke={2} />
      )}
    </button>
  )
}

// The shared "find your community" control: a real search field that, on focus,
// pops open the curated schools. Picking one calls onPick(slug) — join it, or
// open its page, depending on the caller. Placing a ping never depends on any of
// this, so every use is skippable.
function CommunityFinder({ C, ctx, onPick, autoFocus }) {
  const { t } = useI18n()
  const communities = ctx.communities || []
  const [q, setQ] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [focus, setFocus] = React.useState(false)
  const boxRef = React.useRef(null)
  const SHADOW = makeShadow(C)
  const ql = q.trim().toLowerCase()
  const results = communities.filter(
    (c) => !ql || c.name.toLowerCase().includes(ql) || (c.short || '').toLowerCase().includes(ql) || c.slug.replace(/-/g, ' ').includes(ql),
  )
  React.useEffect(() => {
    if (!open) return undefined
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const lit = focus || open
  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '15px 16px', borderRadius: RADIUS.field,
          background: C.ink2, border: `1.5px solid ${lit ? rgba(C.star, 0.7) : C.line}`,
          boxShadow: lit ? SHADOW.focus(C.star) : 'none', transition: 'border-color .2s, box-shadow .25s', cursor: 'text',
        }}
      >
        <Icon name="search" size={19} color={rgba(C.star, 0.9)} stroke={1.9} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => { setFocus(true); setOpen(true) }}
          onBlur={() => setFocus(false)}
          placeholder={t('communities.searchPlaceholder')}
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="none"
          style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: C.cream, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, letterSpacing: '.2px' }}
        />
        <span aria-hidden style={{ display: 'grid', placeItems: 'center', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', opacity: 0.75 }}>
          <Icon name="back" size={14} color={C.muted} stroke={1.9} />
        </span>
      </div>
      {open && (
        <div
          className="fade"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 25, padding: 6,
            borderRadius: RADIUS.card, background: rgba(C.ink2, 0.98), border: `1px solid ${rgba(C.star, 0.2)}`,
            boxShadow: SHADOW.menu, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', maxHeight: 320, overflowY: 'auto',
          }}
        >
          {results.length ? (
            results.map((c) => <FinderRow key={c.slug} C={C} community={c} onPick={(slug) => { onPick(slug); setOpen(false) }} />)
          ) : (
            <div style={{ padding: '14px 12px', fontSize: 13, lineHeight: 1.5, color: C.muted }}>{t('communities.searchNone')}</div>
          )}
        </div>
      )}
    </div>
  )
}

// The one community you've joined, worn as a real badge — a full-width, amber-
// lit panel that says "you're in" at a glance. There is only ever ONE (the
// one-community rule), so it takes the room a single membership deserves
// instead of hiding in a small chip.
function JoinedBadge({ C, community, onRemove }) {
  const { t } = useI18n()
  return (
    <div
      className="fade"
      style={{
        display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '15px 16px',
        borderRadius: RADIUS.card,
        background: `linear-gradient(120deg, ${rgba(C.star, 0.13)}, ${rgba(C.them, 0.06)})`,
        border: `1px solid ${rgba(C.star, 0.42)}`,
        boxShadow: `0 0 30px ${rgba(C.star, 0.13)}`,
      }}
    >
      <SchoolMark C={C} slug={community.slug} size={46} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Space Mono', monospace", fontSize: 9.5, letterSpacing: '2px', textTransform: 'uppercase', color: rgba(C.star, 0.95) }}>
          <Icon name="check" size={11} color={rgba(C.star, 0.95)} stroke={2.6} /> {t('schools.joined')}
        </span>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, lineHeight: 1.05, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{community.name}</span>
      </span>
      <button
        onClick={onRemove}
        aria-label={t('communities.leave')}
        style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'none', border: `1px solid ${rgba(C.cream, 0.16)}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: rgba(C.cream, 0.72) }}
      >
        <Icon name="x" size={13} color="currentColor" />
      </button>
    </div>
  )
}

// ── AFFILIATED SCHOOLS (new-user onboarding, after identity) ──────────────────
// Shown once, between proving your @ and placing your first ping: a search that
// reveals the curated communities. You can be in exactly one — the one you're
// actually at — and your ping only reaches people from it, so picking one opens
// the .edu gate (App owns the sheet) to confirm you're really there before it
// joins. One primary action places the ping.
export function SchoolsScreen({ C, ctx }) {
  const { t } = useI18n()
  const communities = ctx.communities || []
  const joined = communities.filter((c) => c.joined)
  // Picking a school hands off to ctx.joinCommunity, which opens the .edu code
  // sheet; membership is single, so joining one leaves any other.
  const askJoin = (slug) => {
    const c = communities.find((x) => x.slug === slug)
    if (c && !c.joined) ctx.joinCommunity(slug)
  }
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('you')} />
        <Brandmark C={C} size={18} />
        <div style={{ width: 38 }} />
      </div>

      <div className="enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl, paddingTop: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center', alignItems: 'center' }}>
          <Kicker C={C}>{t('schools.kicker')}</Kicker>
          <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(28px, 8vw, 36px)', lineHeight: 1.12, color: C.cream }}>
            {t('schools.title1')}<br /><span style={{ color: C.star }}>{t('schools.title2')}</span>
          </h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.muted, maxWidth: 340 }}>{t('schools.sub')}</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FieldLabel C={C} optional={t('communities.searchOptional')}>{t('communities.searchLabel')}</FieldLabel>
          <CommunityFinder C={C} ctx={ctx} onPick={askJoin} />
          {joined.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 2 }}>
              {joined.map((c) => (
                <JoinedBadge key={c.slug} C={C} community={c} onRemove={() => ctx.leaveCommunity(c.slug)} />
              ))}
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.3px', color: rgba(C.muted, 0.85), padding: '0 2px' }}>{t('home.oneOnly')}</span>
            </div>
          ) : (
            <Hint C={C} icon="search" color={rgba(C.star, 0.85)}>{t('communities.searchOpen')}</Hint>
          )}
        </div>
      </div>

      <div className="enter" style={{ animationDelay: '.1s', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <PrimaryButton C={C} onClick={ctx.finishOnboarding}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            <Icon name="lock" size={16} color={C.onStar} stroke={2} /> {joined.length > 0 ? t('schools.cta') : t('schools.ctaSkip')}
          </span>
        </PrimaryButton>
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.muted }}>{t('schools.foot')}</p>
      </div>
    </Shell>
  )
}

// ── 8 · THE MATCH ─────────────────────────────────────────────────────────────
export function MatchScreen({ C, ctx }) {
  const { t } = useI18n()
  const m = ctx.match || {}
  const them = m.them || normHandle(ctx.them) || 'them'
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 22 }}>
        {/* the one place the brand permits brightness — the star, larger than anywhere */}
        <div className="enter"><StarMark C={C} size={128} /></div>
        <h1 className="enter" style={{ animationDelay: '.1s', margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(38px, 11vw, 52px)', lineHeight: 1.05, color: C.cream }}>
          {t('match.title')}
        </h1>
        <p className="enter" style={{ animationDelay: '.18s', margin: 0, fontSize: 14, lineHeight: 1.7, color: C.muted, maxWidth: 320 }}>
          {t('match.sub', { them })}
        </p>
        {(m.theirIntent || m.yourIntent) && (
          <div className="enter" style={{ animationDelay: '.26s', display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 330 }}>
            {m.theirIntent && (
              <div style={{ border: `1px solid ${rgba(C.star, 0.35)}`, borderRadius: RADIUS.card, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Kicker C={C} style={{ fontSize: 10 }}>{t('match.theySaid')}</Kicker>
                <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 19, color: C.cream }}>
                  “{intentLine(t, m.theirIntent)}”
                </span>
              </div>
            )}
            {m.yourIntent && (
              <div style={{ border: `1px solid ${C.line}`, borderRadius: RADIUS.card, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Kicker C={C} style={{ fontSize: 10 }}>{t('match.youSaid')}</Kicker>
                <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 19, color: rgba(C.cream, 0.85) }}>
                  “{intentLine(t, m.yourIntent)}”
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="enter" style={{ animationDelay: '.32s', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PrimaryButton C={C} onClick={() => ctx.openConversation(them)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            {t('match.cta')} <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        {/* no share button, no confetti, no screenshot-bait: the story travels by
            telling, and the absence of a gotcha artifact IS the anti-humiliation
            architecture (framework Screen 8) */}
        <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, color: C.muted }}>{t('match.exit')}</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12 }}>
            {t('placed.pings')}
          </GhostButton>
        </div>
      </div>
    </Shell>
  )
}

// ── THE SEND-OFF — the @ becomes a star and flies into the galaxy ─────────────
// The flight itself is drawn by the galaxy canvas (owned by App): the @ field
// collapses into a star (the Liftoff overlay), which coalesces at that point and
// drifts on into the disk. This shell only holds a calm line, low on the screen
// so it never sits under the flight path, while that ~5s plays out.
export function SendoffScreen({ C, ctx }) {
  const { t } = useI18n()
  return (
    <Shell>
      <div style={{ flex: 1 }} />
      <div className="sendoff-line" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 11, paddingBottom: 'clamp(24px, 12vh, 90px)' }}>
        <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 'clamp(24px, 7vw, 30px)', color: C.cream }}>{t('sendoff.title')}</div>
        <div style={{ fontSize: 12.5, color: C.muted, fontFamily: "'Space Mono', monospace", letterSpacing: '.5px' }}>
          {t('sendoff.sub')}
        </div>
      </div>
      <div style={{ flex: 1 }} />
    </Shell>
  )
}

// ── 9 · THE THIRD SLOT (route key stays 'fourth' — see App.jsx's SCREENS) ────
// Production keeps ONE door — "let one go" — with no money anywhere, per
// docs/PRICING-REVENUE.md (Stripe stays plumbed and dormant until density is
// proven). The /demo build previews the real shape behind a realistic
// checkout: a one-time slot ($2.99, repeatable) or a $12.99/mo subscription
// (ten pings, each standing six months). The checkout appears here at the
// moment a user runs out of slots, and — in the sandbox only — also fronts the
// renew action on a near-lapse ping ("extend" mode, $2.99 to keep it standing).

// The card-brand marks that sit at the end of a Stripe card field — the two
// product stars double as the mastercard glyph, so no third hue enters.
function CardBrands({ C }) {
  const shell = { width: 26, height: 16, borderRadius: 3, border: `1px solid ${C.line}`, background: rgba(C.cream, 0.06), display: 'grid', placeItems: 'center', flexShrink: 0 }
  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }} aria-hidden>
      <span style={{ ...shell, fontFamily: "'Space Mono', monospace", fontSize: 7, fontWeight: 700, letterSpacing: '.5px', color: rgba(C.cream, 0.55) }}>VISA</span>
      <span style={shell}>
        <span style={{ display: 'inline-flex' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: rgba(C.them, 0.85) }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: rgba(C.star, 0.85), marginLeft: -4 }} />
        </span>
      </span>
    </span>
  )
}

// One inert Stripe-style field. Typeable, but the value is never read or stored
// (the sandbox note says so); it exists to make the checkout read as real.
function PayField({ C, value, onChange, placeholder, mono, trailing, inputMode }) {
  const [focus, setFocus] = React.useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 13px', borderRadius: RADIUS.inner, background: C.ink, border: `1px solid ${focus ? rgba(C.star, 0.55) : C.line}`, transition: 'border-color .18s' }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        inputMode={inputMode || 'numeric'}
        spellCheck={false}
        style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: C.cream, fontFamily: mono ? "'Space Mono', monospace" : "'Space Grotesk', sans-serif", fontSize: 14.5, letterSpacing: mono ? '.5px' : '.2px' }}
      />
      {trailing}
    </div>
  )
}

// One of the two checkout offers — tap to choose. The chosen one lights amber
// like an IntentLineChip; the subscription additionally wears a small badge
// ("the better deal") so it reads as the smart pick without shouting.
function OfferOption({ C, on, onClick, title, price, unit, detail, badge }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        display: 'flex', flexDirection: 'column', gap: 6, width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '13px 15px', borderRadius: RADIUS.card,
        background: on ? rgba(C.star, 0.1) : rgba(C.ink2, 0.4),
        border: `1.5px solid ${on ? rgba(C.star, 0.6) : C.line}`,
        boxShadow: on ? `0 0 20px ${rgba(C.star, 0.14)}` : 'none',
        transition: 'all .2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
          <span
            aria-hidden
            style={{
              display: 'grid', placeItems: 'center', width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              border: `1.5px solid ${on ? C.star : rgba(C.cream, 0.32)}`,
            }}
          >
            {on && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.star, boxShadow: `0 0 7px ${rgba(C.star, 0.8)}` }} />}
          </span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5, fontWeight: 600, color: C.cream }}>{title}</span>
        </span>
        {badge && (
          <span style={{ flexShrink: 0, fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '.5px', textTransform: 'uppercase', color: rgba(C.star, 0.9), border: `1px solid ${rgba(C.star, 0.4)}`, borderRadius: RADIUS.chip, padding: '2px 7px' }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: 25 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: C.cream }}>{price}</span>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '.4px', textTransform: 'uppercase', color: C.muted }}>{unit}</span>
      </div>
      <p style={{ margin: 0, paddingLeft: 25, fontSize: 12, lineHeight: 1.5, color: rgba(C.muted, 0.92) }}>{detail}</p>
    </button>
  )
}

// The sandbox checkout — one more ping (or, arriving from a renew, keeping one
// standing), $2.99 once, alongside the $12.99/mo subscription. `mode` is
// 'slot' (the default: hit the cap, or tapped "place another") or 'extend'
// (tapped renew on a near-lapse ping — App.jsx's extendHandle names it).
function SlotPaywall({ C, ctx, mode }) {
  const { t } = useI18n()
  const extend = mode === 'extend'
  // default: the single-ping option, matching how they arrived either way —
  // the subscription is the upsell, never the assumption.
  const [choice, setChoice] = React.useState('once') // 'once' | 'sub'
  const [phase, setPhase] = React.useState('form') // form | paying | done
  const [card, setCard] = React.useState('')
  const [exp, setExp] = React.useState('')
  const [cvc, setCvc] = React.useState('')
  const [zip, setZip] = React.useState('')
  const timer = React.useRef(null)
  React.useEffect(() => () => timer.current && clearTimeout(timer.current), [])
  const sub = choice === 'sub'
  const pay = () => {
    if (phase !== 'form') return
    setPhase('paying')
    // hold the flag until the user leaves the "done" state — flipping it now
    // would swap this screen out from under its own success view.
    timer.current = setTimeout(() => setPhase('done'), 1500)
  }
  const price = sub ? t('paywall.subPrice') : t('paywall.price')
  const kicker = extend ? t('paywall.extendKicker') : t('paywall.kicker')

  // The success view's one action: extend just runs the actual renew and heads
  // back; a slot purchase (once or sub) goes place the newly-held ping.
  const finish = () => (extend ? ctx.finishExtend() : ctx.placeBoughtSlot(sub))
  const viewPingsInstead = () => {
    ctx.buySlot(sub)
    ctx.go('pings')
  }

  if (phase === 'done') {
    const title = extend ? t('paywall.doneTitleExtend') : sub ? t('paywall.doneTitleSub') : t('paywall.doneTitleOnce')
    const doneSub = extend ? t('paywall.doneSubExtend') : sub ? t('paywall.doneSubSub') : t('paywall.doneSubOnce')
    return (
      <Shell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 38 }} />
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <Kicker C={C}>{kicker}</Kicker>
            <SandboxChip C={C} />
          </div>
          <div style={{ width: 38 }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18 }}>
          <div className="enter floaty"><StarMark C={C} size={78} /></div>
          <h1 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(28px, 8vw, 36px)', color: C.cream }}>{title}</h1>
          <p className="enter" style={{ animationDelay: '.08s', margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted, maxWidth: 300 }}>{doneSub}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryButton C={C} onClick={finish}>{extend ? t('paywall.doneBack') : t('paywall.donePlace')}</PrimaryButton>
          {!extend && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GhostButton C={C} onClick={viewPingsInstead} style={{ fontSize: 12.5 }}>{t('placed.pings')}</GhostButton>
            </div>
          )}
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('pings')} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <Kicker C={C}>{kicker}</Kicker>
          <SandboxChip C={C} />
        </div>
        <div style={{ width: 38 }} />
      </div>

      <div className="enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 15, paddingTop: 10 }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h1 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(26px, 7.4vw, 33px)', color: C.cream }}>
            {extend ? t('paywall.extendTitle') : t('paywall.title')}
          </h1>
          <p style={{ margin: '0 auto', fontSize: 13, lineHeight: 1.55, color: C.muted, maxWidth: 320 }}>
            {extend ? t('paywall.extendSub') : t('paywall.sub')}
          </p>
        </div>

        {/* the two offers — one tap picks; the checkout below runs whichever's lit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <OfferOption
            C={C}
            on={!sub}
            onClick={() => setChoice('once')}
            title={extend ? t('paywall.onceExtendLabel') : t('paywall.onceLabel')}
            price={t('paywall.price')}
            unit={t('paywall.priceUnit')}
            detail={t('paywall.onceDetail')}
          />
          <OfferOption
            C={C}
            on={sub}
            onClick={() => setChoice('sub')}
            title={t('paywall.subLabel')}
            price={t('paywall.subPrice')}
            unit={t('paywall.subUnit')}
            detail={t('paywall.subDetail')}
            badge={t('paywall.subBadge')}
          />
        </div>

        {/* the checkout card — the same fake-stripe fields regardless of choice */}
        <GlassPanel C={C} style={{ padding: '16px 16px 15px', display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PayField C={C} value={card} onChange={setCard} placeholder={t('paywall.cardNumber')} mono trailing={<CardBrands C={C} />} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1.15, minWidth: 0 }}><PayField C={C} value={exp} onChange={setExp} placeholder={t('paywall.expiry')} mono /></div>
              <div style={{ flex: 1, minWidth: 0 }}><PayField C={C} value={cvc} onChange={setCvc} placeholder={t('paywall.cvc')} mono /></div>
              <div style={{ flex: 1, minWidth: 0 }}><PayField C={C} value={zip} onChange={setZip} placeholder={t('paywall.zip')} /></div>
            </div>
          </div>

          <PrimaryButton C={C} disabled={phase === 'paying'} onClick={pay}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
              {phase === 'paying' ? t('paywall.paying') : <><Icon name="lock" size={15} color={C.onStar} stroke={2} /> {sub ? t('paywall.paySub', { price }) : t('paywall.pay', { price })}</>}
            </span>
          </PrimaryButton>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '.4px', color: rgba(C.muted, 0.85) }}>
            <Icon name="lock" size={11} color={rgba(C.muted, 0.75)} stroke={1.8} /> {t('paywall.secure')}
            <span aria-hidden style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: C.line }} />
            {t('paywall.stripe')}
          </div>
        </GlassPanel>

        <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: rgba(C.star, 0.85) }}>{t('paywall.demoNote')}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
        <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12.5 }}>{t('paywall.letgo')}</GhostButton>
      </div>
    </Shell>
  )
}

export function FourthSlotScreen({ C, ctx }) {
  const { t } = useI18n()
  // sandbox only, and only while there's still something to sell: an extend
  // checkout for a near-lapse ping takes priority (it can happen regardless of
  // subscription state); otherwise the next-slot/subscription offer, until
  // subscribed and genuinely at the ten-ping cap. Everywhere else — production,
  // always — the single dormant door.
  if (ctx.demo && ctx.extendHandle) return <SlotPaywall C={C} ctx={ctx} mode="extend" />
  if (ctx.demo && !ctx.demoSubscribed) return <SlotPaywall C={C} ctx={ctx} mode="slot" />
  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go('pings')} />
        <Brandmark C={C} size={18} />
        <div style={{ width: 38 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18 }}>
        {/* the slots, all held */}
        <SlotPips C={C} standing={ctx.slotsCap} cap={ctx.slotsCap} subscribed={ctx.demoSubscribed} />
        <h1 className="enter" style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(30px, 8vw, 38px)', color: C.cream }}>
          {t('fourth.title')}
        </h1>
        <p className="enter" style={{ animationDelay: '.08s', margin: 0, fontSize: 13.5, lineHeight: 1.65, color: C.muted, maxWidth: 300 }}>
          {t('fourth.body')}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PrimaryButton C={C} onClick={() => ctx.go('pings')}>{t('fourth.cta')}</PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: 12.5 }}>
            {t('fourth.back')}
          </GhostButton>
        </div>
      </div>
    </Shell>
  )
}

// ── PRIVACY & THE OPT-OUT ─────────────────────────────────────────────────────
export function PrivacyScreen({ C, ctx }) {
  const { t } = useI18n()
  const [handle, setHandle] = React.useState('')
  const [status, setStatus] = React.useState(null)
  const ok = handle.trim().length >= 2
  const submit = async () => {
    if (!ok || status === 'working') return
    setStatus('working')
    try {
      await ctx.suppressHandle(handle)
      setStatus('done')
    } catch (e) {
      console.error(e)
      setStatus('error')
    }
  }
  const H = ({ children }) => (
    <h3 style={{ margin: '20px 0 6px', fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: C.cream }}>{children}</h3>
  )
  const P = ({ children }) => <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.muted }}>{children}</p>

  return (
    <Shell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <BackBtn C={C} onClick={() => ctx.go(ctx.pings.length ? 'pings' : 'landing')} />
        <Brandmark C={C} size={18} />
        <div style={{ width: 38 }} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8 }}>
        <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontWeight: 400, fontStyle: 'italic', fontSize: 'clamp(26px, 7vw, 34px)', lineHeight: 1.16, color: C.cream }}>
          {t('privacy.title')}
        </h2>

        <H>{t('privacy.h1')}</H>
        <P>{t('privacy.p1')}</P>
        <H>{t('privacy.h2')}</H>
        <P>{t('privacy.p2')}</P>
        <H>{t('privacy.h3')}</H>
        <P>{t('privacy.p3')}</P>
        <H>{t('privacy.h4')}</H>
        <P>{t('privacy.p4')}</P>
        <H>{t('privacy.h6')}</H>
        <P>{t('privacy.p6')}</P>

        <H>{t('privacy.h5')}</H>
        <P>{t('privacy.p5')}</P>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Field C={C} kind="handle" value={handle} onChange={setHandle} placeholder={t('privacy.removePlaceholder')} />
          <PrimaryButton C={C} disabled={!ok || status === 'working'} onClick={submit}>
            {status === 'working' ? t('privacy.removing') : t('privacy.removeCta')}
          </PrimaryButton>
          {status === 'done' && (
            <P>
              {t('privacy.removed1')} <HandleChip C={C} handle={normHandle(handle)} /> {t('privacy.removed2')}
            </P>
          )}
          {status === 'error' && <div style={{ fontSize: 13, color: rgba(C.star, 0.95) }}>{t('privacy.removeErr')}</div>}
        </div>

        <p style={{ margin: '22px 0 0', fontSize: 11, lineHeight: 1.55, color: C.muted }}>
          {t('privacy.foot')} <a href="mailto:privacy@celestual.us" style={{ color: C.muted }}>privacy@celestual.us</a>.
        </p>
        <p style={{ margin: '10px 0 0', fontSize: 11, lineHeight: 1.55, color: C.muted }}>
          <a href="/privacy" target="_blank" rel="noopener" style={{ color: C.muted, textDecoration: 'underline' }}>{t('privacy.fullPolicy')}</a>
          {' · '}
          <a href="/terms" target="_blank" rel="noopener" style={{ color: C.muted, textDecoration: 'underline' }}>{t('privacy.tos')}</a>
          {' · '}
          <a href="/data-deletion" target="_blank" rel="noopener" style={{ color: C.muted, textDecoration: 'underline' }}>{t('privacy.deleteData')}</a>
        </p>
      </div>
    </Shell>
  )
}

// ── ACCOUNT (identity, worlds, the exits) ─────────────────────────────────────
function AccountsEditor({ C, ctx }) {
  const { t } = useI18n()
  const [open, setOpen] = React.useState(ctx.altHandles.length > 0)
  const [draft, setDraft] = React.useState('')
  const total = 1 + ctx.altHandles.length
  const canAdd = total < 3
  const add = () => {
    const n = normHandle(draft)
    if (!n || n === normHandle(ctx.me)) {
      setDraft('')
      return
    }
    ctx.addAltHandle(n)
    setDraft('')
  }
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', cursor: 'pointer', color: rgba(C.star, 0.9), fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}
      >
        <Icon name="plus" size={14} color="currentColor" stroke={2} /> {t('accounts.add')}
      </button>
    )
  }
  return (
    <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <FieldLabel C={C} optional={t('accounts.optional')}>{t('accounts.label')}</FieldLabel>
      {ctx.altHandles.map((h) => (
        <div key={h} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <HandleChip C={C} handle={h} />
          <button
            onClick={() => ctx.removeAltHandle(h)}
            aria-label={t('accounts.remove')}
            style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'none', border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}
          >
            <Icon name="x" size={13} color="currentColor" />
          </button>
        </div>
      ))}
      {canAdd && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field C={C} kind="handle" value={draft} onChange={setDraft} placeholder={t('accounts.placeholder')} onEnter={add} />
          </div>
          <OutlineButton C={C} onClick={add} style={{ flexShrink: 0 }}>{t('accounts.addBtn')}</OutlineButton>
        </div>
      )}
      <Hint C={C} icon="instagram" color={rgba(C.star, 0.85)}>{t('accounts.note')}</Hint>
    </div>
  )
}

// Communities are curated, so the account only SHOWS the ones you're in (join /
// leave lives on the community pages). A read-only summary + a way in.
function CommunitiesSummary({ C, ctx }) {
  const { t } = useI18n()
  const joined = (ctx.communities || []).filter((c) => c.joined)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <FieldLabel C={C}>{t('communities.label')}</FieldLabel>
        <GhostButton C={C} onClick={() => { ctx.closeAccount(); ctx.go('worlds') }} style={{ padding: 0, fontSize: 12, color: rgba(C.star, 0.85) }}>
          {t('communities.browse')} →
        </GhostButton>
      </div>
      {joined.length === 0 ? (
        <span style={{ fontSize: 13, lineHeight: 1.5, color: C.muted }}>{t('communities.summaryNone')}</span>
      ) : (
        joined.map((c) => {
          const open = communityOpen(c)
          return (
            <div key={c.slug} style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
              <SchoolMark C={C} slug={c.slug} size={30} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10.5, letterSpacing: '.4px', textTransform: 'uppercase', color: open ? rgba(C.star, 0.9) : C.muted, flexShrink: 0 }}>
                {open ? t('communities.open') : t('communities.gathering')}
              </span>
            </div>
          )
        })
      )}
    </div>
  )
}

export function AccountSheet({ C, ctx }) {
  const { t } = useI18n()
  const SHADOW = makeShadow(C)
  const [confirmDel, setConfirmDel] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const close = () => ctx.closeAccount()
  const dialogRef = useDialog(close)
  const onDelete = async () => {
    if (!confirmDel) {
      setConfirmDel(true)
      return
    }
    setDeleting(true)
    try {
      await ctx.deleteEverything()
    } finally {
      setDeleting(false)
    }
  }
  const standing = ctx.slotsStanding
  return (
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 14px max(20px, env(safe-area-inset-bottom))', overflowY: 'auto' }}
    >
      <div className="scrim-in" aria-hidden style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.72), backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('account.kicker')}
        tabIndex={-1}
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 410, margin: 'auto 0', background: rgba(C.ink2, 0.97), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '30px 26px 26px', display: 'flex', flexDirection: 'column', gap: 24, outline: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Brandmark C={C} size={14} />
              <Kicker C={C}>{t('account.kicker')}</Kicker>
              {ctx.demo && <SandboxChip C={C} />}
            </div>
            <div style={{ marginTop: 12, fontFamily: "'Instrument Serif', serif", fontSize: 'clamp(30px, 9vw, 37px)', lineHeight: 1.05, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: C.star }}>@</span>{ctx.me || 'you'}
            </div>
            <div style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '.3px', color: ctx.verified ? rgba(C.star, 0.95) : C.muted }}>
              {ctx.verified && <Icon name="instagram" size={12} color={rgba(C.star, 0.95)} />}
              {ctx.verified ? t('account.verified') : t('account.localOnly')}
            </div>
          </div>
          <button onClick={close} aria-label={t('account.close')} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'none', border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}>
            <Icon name="x" size={15} color="currentColor" />
          </button>
        </div>

        <Rule C={C} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FieldLabel C={C}>{t('account.handleLabel')}</FieldLabel>
            <Field C={C} kind="handle" value={ctx.me} onChange={ctx.setMe} placeholder="your.handle" />
            {ctx.verifyEnabled && !ctx.verified && (
              <Hint C={C} icon="instagram" color={rgba(C.star, 0.85)}>{t('account.reverifyNote')}</Hint>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FieldLabel C={C} optional={t('account.emailOptional')}>{t('account.emailLabel')}</FieldLabel>
            <Field C={C} kind="email" value={ctx.email} onChange={ctx.setEmail} placeholder="you@email.com" />
            <Hint C={C} icon="mail">{t('account.emailNote')}</Hint>
          </div>
          <AccountsEditor C={C} ctx={ctx} />
        </div>

        <Rule C={C} />

        {/* your worlds — the community counters you carry */}
        <CommunitiesSummary C={C} ctx={ctx} />

        <Rule C={C} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: standing ? C.cream : C.muted, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
            {standing > 0 && (
              <span aria-hidden style={{ color: C.star, fontSize: 12, textShadow: `0 0 8px ${rgba(C.star, 0.6)}` }}>✦</span>
            )}{' '}
            {standing > 0 ? t('account.pingsLine', { n: standing }) : t('account.pingsNone')}
          </span>
          <GhostButton C={C} onClick={() => { close(); ctx.go('pings') }} style={{ padding: 0, fontSize: 12.5, color: C.star }}>
            {t('account.pingsOpen')} →
          </GhostButton>
        </div>

        <Rule C={C} />

        {!confirmDel ? (
          // sign out / delete are available everywhere, including the sandbox
          // (there they reset the demo and land back on the cold landing — the
          // handlers are already demo-safe, nothing reaches a server).
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {ctx.demo && (
              <span style={{ fontSize: 12, lineHeight: 1.55, color: C.muted }}>{t('account.sandboxNote')}</span>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {(ctx.verified || ctx.demo) && (
                <GhostButton C={C} onClick={ctx.signOut} style={{ padding: 0, fontSize: 13, color: C.cream }}>
                  {t('account.signOut')}
                </GhostButton>
              )}
              <GhostButton C={C} onClick={onDelete} style={{ padding: 0, fontSize: 13, color: rgba(C.muted, 0.9) }}>
                {t('account.delete')}
              </GhostButton>
            </div>
          </div>
        ) : (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <span style={{ fontSize: 13, lineHeight: 1.5, color: C.cream }}>{ctx.demo ? t('account.deleteConfirmDemo') : t('account.deleteConfirm')}</span>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              <GhostButton C={C} onClick={onDelete} style={{ padding: 0, fontSize: 13, color: C.star }}>
                {deleting ? t('account.deleting') : t('account.deleteYes')}
              </GhostButton>
              <GhostButton C={C} onClick={() => setConfirmDel(false)} style={{ padding: 0, fontSize: 13, color: C.muted }}>
                {t('account.cancel')}
              </GhostButton>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── INSTAGRAM DM VERIFICATION (prove the @ is yours — no OAuth) ────────────────
// Copy a code to the clipboard and DM it to our Instagram; Meta's webhook tells
// the backend who really sent it, and this overlay watches for the flip. It
// never navigates, so the in-memory ping survives underneath it. The /demo
// variant runs the same overlay but auto-verifies locally (real verification
// isn't wired in the sandbox — it says so on its face).

const VERIFIED_HOLD_MS = 2000

function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  return /Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(navigator.userAgent || '')
}

function isMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
}

// Open Instagram WITHOUT stranding the user (desktop → wide popup; mobile /
// in-app webview → same-tab universal link; savePending resumes on return).
function openExternal(appUrl, webUrl = appUrl) {
  if (isInAppBrowser() || isMobile()) {
    try {
      window.location.href = appUrl
    } catch {
      /* ignore */
    }
    return
  }
  const url = webUrl
  try {
    const aw = window.screen?.availWidth || 1280
    const ah = window.screen?.availHeight || 800
    const w = Math.min(720, Math.max(560, aw - 80))
    const h = Math.min(840, ah - 60)
    const baseX = window.screenLeft ?? window.screenX ?? 0
    const baseY = window.screenTop ?? window.screenY ?? 0
    const vw = window.innerWidth || document.documentElement.clientWidth || w
    const vh = window.innerHeight || document.documentElement.clientHeight || h
    const left = Math.max(0, baseX + (vw - w) / 2)
    const top = Math.max(0, baseY + (vh - h) / 2)
    window.open(url, '_blank', `popup,noopener,width=${w},height=${h},left=${left},top=${top}`)
  } catch {
    try {
      window.location.href = url
    } catch {
      /* ignore */
    }
  }
}

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through to the legacy path */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

export function IgVerifySheet({ C, handle, demo, onVerified, onClose }) {
  const { t } = useI18n()
  const SHADOW = makeShadow(C)
  const ig = igUsername()
  const [phase, setPhase] = React.useState('starting') // starting | waiting | verified | expired | error
  const [token, setToken] = React.useState('')
  const [errCode, setErrCode] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  // After a while stuck on "waiting", surface a self-serve way out (the DM can
  // be dropped by the relay; a fresh code re-runs the whole path).
  const [stuck, setStuck] = React.useState(false)
  const proofRef = React.useRef(null)
  const hashRef = React.useRef(null)
  const expiryRef = React.useRef(0)
  const pollRef = React.useRef(null)
  const doneRef = React.useRef(null)
  // Guards the mount effect against double-invocation (StrictMode / rapid
  // remount) minting TWO codes back-to-back — the second would orphan the
  // first, and whichever the person actually DMs might be the orphan.
  const startedRef = React.useRef(false)

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }
  React.useEffect(() => () => { if (doneRef.current) clearTimeout(doneRef.current) }, [])

  const begin = React.useCallback(async () => {
    stopPoll()
    setPhase('starting')
    setErrCode('')
    setCopied(false)
    setStuck(false)
    setToken('')
    // Demo: never touch the backend. Mint a local code + proof and let the
    // polling effect auto-confirm after a beat — the whole DM flow reads
    // end-to-end with no server (the auto-verify is the sandbox stand-in until
    // real verification is switched on).
    if (demo) {
      proofRef.current = genProof()
      hashRef.current = null
      expiryRef.current = Date.now() + 10 * 60 * 1000
      setToken(String(Math.floor(1000 + Math.random() * 9000)))
      setPhase('waiting')
      return
    }
    try {
      const r = await startVerification(handle)
      proofRef.current = r.proof
      hashRef.current = r.proofHash
      expiryRef.current = Date.parse(r.expiresAt) || Date.now() + 10 * 60 * 1000
      savePending({ handle, token: r.token, proofHash: r.proofHash, proof: r.proof, expiresAt: r.expiresAt })
      setToken(r.token)
      setPhase('waiting')
    } catch (e) {
      setErrCode(e?.code || 'error')
      setPhase('error')
    }
  }, [handle, demo])

  React.useEffect(() => {
    if (startedRef.current === normHandle(handle)) return stopPoll
    startedRef.current = normHandle(handle)
    if (demo) {
      begin()
      return stopPoll
    }
    const saved = loadPending()
    if (saved && normHandle(saved.handle) === normHandle(handle)) {
      proofRef.current = saved.proof
      hashRef.current = saved.proofHash
      expiryRef.current = Date.parse(saved.expiresAt) || 0
      setToken(saved.token)
      setPhase('waiting')
      return stopPoll
    }
    begin()
    return stopPoll
  }, [begin, handle, demo])

  React.useEffect(() => {
    if (phase !== 'waiting') return
    if (demo) {
      const id = setTimeout(() => {
        setPhase('verified')
        const proof = proofRef.current
        doneRef.current = setTimeout(() => onVerified(proof), VERIFIED_HOLD_MS)
      }, 1800)
      return () => clearTimeout(id)
    }
    const tick = async () => {
      const lapsed = Date.now() > expiryRef.current
      // Even past the local clock, ask the server one last time — the DM can
      // land in the final seconds, and "expired" must never beat a real ✓.
      const status = await pollVerification(token, hashRef.current)
      if (status === 'verified') {
        stopPoll()
        clearPending()
        setPhase('verified')
        const proof = proofRef.current
        doneRef.current = setTimeout(() => onVerified(proof), VERIFIED_HOLD_MS)
      } else if (status === 'expired' || lapsed) {
        stopPoll()
        clearPending()
        setPhase('expired')
      }
    }
    pollRef.current = setInterval(tick, 2500)
    // Coming back from Instagram (tab regains focus/visibility) checks at once,
    // so the flip to "verified" is instant instead of up to a poll-beat late —
    // and a background-throttled interval can't strand the wait.
    const onReturn = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    // A DM that the relay drops would otherwise strand the wait for the full
    // code TTL with no way out — after a minute, offer a fresh start inline.
    const stuckId = setTimeout(() => setStuck(true), 60000)
    return () => {
      stopPoll()
      clearTimeout(stuckId)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [phase, token, onVerified, demo])

  const copyAndOpen = () => {
    copyText(dmCode(token)).then(setCopied)
    // The sandbox must never leave the page — nothing external launches.
    if (demo) return
    openExternal(igDeepLink(), igWebLink())
  }
  const inApp = isInAppBrowser()
  const mobile = isMobile()

  // Closing the sheet KEEPS the pending record: the DM may already be on its
  // way, and savePending self-expires with the code TTL. Reopening resumes this
  // exact code (the mount effect), so an accidental outside-tap or Escape can
  // never strand a verification mid-flight.
  const dismiss = () => onClose()
  const dialogRef = useDialog(dismiss)

  const errMsg =
    errCode === 'rate_limited' ? t('verify.errRate') : errCode === 'busy' ? t('verify.errBusy') : t('verify.errGeneric')

  return (
    <div
      onClick={dismiss}
      style={{ position: 'fixed', inset: 0, zIndex: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom))', overflowY: 'auto' }}
    >
      <div className="scrim-in" aria-hidden style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.74), backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('verify.title')}
        tabIndex={-1}
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 400, margin: 'auto', background: rgba(C.ink2, 0.98), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 18, outline: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', background: rgba(C.star, 0.12), flexShrink: 0 }}>
            <Icon name="instagram" size={20} color={C.star} stroke={1.8} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: C.cream, lineHeight: 1.1 }}>{t('verify.title')}</div>
            <div style={{ marginTop: 6 }}>
              <HandleChip C={C} handle={handle} />
            </div>
          </div>
          <button onClick={dismiss} aria-label={t('verify.cancel')} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: C.ink3, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}>
            <Icon name="x" size={14} color="currentColor" />
          </button>
        </div>

        {phase === 'verified' ? (
          <div className="fade" role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, padding: '26px 0 22px' }}>
            <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 66, height: 66 }}>
              <span aria-hidden className="v-ring" style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: `1.5px solid ${rgba(C.star, 0.6)}` }} />
              <span aria-hidden className="v-ring" style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: `1.5px solid ${rgba(C.star, 0.6)}`, animationDelay: '0.3s' }} />
              <span className="v-pop" style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 60, height: 60, borderRadius: '50%', background: rgba(C.star, 0.16), border: `1px solid ${rgba(C.star, 0.5)}`, boxShadow: `0 0 30px ${rgba(C.star, 0.45)}` }}>
                <Icon name="check" size={30} color={C.star} stroke={2.4} />
              </span>
            </span>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 23, color: C.cream }}>{t('verify.verified')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'Space Mono', monospace", fontSize: 11.5, letterSpacing: '0.5px', color: rgba(C.star, 0.9) }}>
              <Sonar C={C} size={11} /> {t('verify.verifiedSub')}
            </div>
          </div>
        ) : phase === 'expired' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 21, color: C.cream }}>{t('verify.expiredTitle')}</div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: C.muted }}>{t('verify.expiredBody')}</p>
            <PrimaryButton C={C} onClick={begin}>{t('verify.regen')}</PrimaryButton>
          </div>
        ) : phase === 'error' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: rgba(C.star, 0.95) }}>{errMsg}</p>
            <PrimaryButton C={C} onClick={begin}>{t('verify.regen')}</PrimaryButton>
          </div>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted }}>{t('verify.sub')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '16px 0', borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
              <Kicker C={C}>{t('verify.code')}</Kicker>
              {phase === 'starting' || !token ? (
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 38, letterSpacing: '10px', color: C.muted, paddingLeft: 10 }}>····</span>
              ) : (
                /* userSelect:'all' — one long-press/click selects the whole code,
                   so a blocked clipboard never strands anyone. */
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 31, fontWeight: 700, letterSpacing: '4px', color: C.star, paddingLeft: 4, textShadow: `0 0 26px ${rgba(C.star, 0.4)}`, userSelect: 'all', WebkitUserSelect: 'all' }}>{dmCode(token)}</span>
              )}
            </div>

            <PrimaryButton C={C} disabled={phase === 'starting' || !token} onClick={copyAndOpen}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
                <Icon name={copied ? 'check' : 'copy'} size={16} color={C.onStar} stroke={2} />
                {copied ? t('verify.copied') : t('verify.copyOpen')}
              </span>
            </PrimaryButton>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[t('verify.step1'), t('verify.step2', { ig: '@' + ig }), t('verify.step3')].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, color: C.muted, fontSize: 12.5, lineHeight: 1.5 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 19, height: 19, borderRadius: '50%', flexShrink: 0, background: rgba(C.star, 0.12), color: C.star, fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, color: C.muted, fontSize: 12.5, fontFamily: "'Space Mono', monospace" }}>
              <Sonar C={C} size={12} /> {t('verify.waiting')}
            </div>

            {stuck && !demo && phase === 'waiting' && (
              <div className="fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: C.muted }}>
                <span>{t('verify.stuckHint')}</span>
                <button
                  onClick={begin}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.star, fontSize: 12, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  {t('verify.stuckAction')}
                </button>
              </div>
            )}

            {demo && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.star, 0.9) }}>{t('verify.demoNote')}</p>
            )}
            {!demo && inApp && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.star, 0.9) }}>{t('verify.inApp')}</p>
            )}
            {!demo && !mobile && !inApp && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: C.muted }}>{t('verify.desktop')}</p>
            )}

            <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: C.muted }}>{t('verify.tosNote')}</p>
          </>
        )}
      </div>
    </div>
  )
}

// ── the public-@ warning (announce yourself in your community's sky) ──────────
// The one deliberate way a handle ever shows in a public sky: your own, by your
// own choice, above your own star. This sheet is the honest stop before it
// flips — it says exactly what becomes visible (that you're here) and what
// never does (who you pinged). Reversible anytime; off is one tap, no ceremony.
export function PublicStarSheet({ C, community, handle, onConfirm, onClose }) {
  const { t } = useI18n()
  const SHADOW = makeShadow(C)
  const dialogRef = useDialog(onClose)
  const name = (community && (community.short || community.name)) || t('communities.yourCommunity')
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom))', overflowY: 'auto' }}
    >
      <div className="scrim-in" aria-hidden style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.74), backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('public.title')}
        tabIndex={-1}
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 400, margin: 'auto', background: rgba(C.ink2, 0.98), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '26px 22px 22px', display: 'flex', flexDirection: 'column', gap: 18, outline: 'none' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: '50%', background: rgba(C.star, 0.12) }}>
            <Icon name="eye" size={20} color={C.star} stroke={1.7} />
          </span>
          <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 23, lineHeight: 1.15, color: C.cream }}>{t('public.title')}</div>
          {handle && <HandleChip C={C} handle={handle} />}
        </div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: C.muted, textAlign: 'center' }}>{t('public.body', { name })}</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', borderRadius: RADIUS.inner, background: rgba(C.ink, 0.6), border: `1px solid ${C.line}` }}>
          <span style={{ marginTop: 1, flexShrink: 0 }}><Icon name="lock" size={13} color={rgba(C.star, 0.85)} /></span>
          <span style={{ fontSize: 12, lineHeight: 1.55, color: rgba(C.cream, 0.85) }}>{t('public.keeps')}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryButton C={C} onClick={onConfirm}>{t('public.confirm')}</PrimaryButton>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GhostButton C={C} onClick={onClose} style={{ fontSize: 13 }}>{t('public.cancel')}</GhostButton>
          </div>
          <p style={{ margin: 0, textAlign: 'center', fontSize: 11, lineHeight: 1.5, color: rgba(C.muted, 0.8) }}>{t('public.note')}</p>
        </div>
      </div>
    </div>
  )
}

// ── the held star view (App overlays this while a ping's star is held) ────────
// The engines pin a held star just above mid-frame; this overlay seats its name
// beneath it: the @ in the product's amber — larger than it appears anywhere
// else — with the ping's intent line resting under it in the emotional register
// and the category's own light naming what they are to you. Everything ignores
// the pointer (the hand is orbiting the sky) except the one clear way home.
export function StarViewOverlay({ C, view, onClose }) {
  const { t } = useI18n()
  const tint = CATEGORY_TINTS[view.kind] || C.star
  return (
    <>
      {/* the close — glides the camera home to the pings page */}
      <div data-noripple style={{ position: 'fixed', top: 'max(14px, env(safe-area-inset-top))', right: 'max(14px, env(safe-area-inset-right))', zIndex: 30 }}>
        <button
          onClick={onClose}
          aria-label={t('starview.close')}
          className="fade"
          style={{
            width: 42, height: 42, borderRadius: '50%', cursor: 'pointer',
            background: rgba(C.ink2, 0.8), border: `1px solid ${rgba(C.cream, 0.22)}`,
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            display: 'grid', placeItems: 'center', color: rgba(C.cream, 0.92),
            boxShadow: '0 10px 34px rgba(0,0,0,.5)',
          }}
        >
          <Icon name="x" size={16} color="currentColor" stroke={2} />
        </button>
      </div>

      {/* the name, risen beneath the held star (arrives with the camera) */}
      {/* full-width so it stays truly centered (the fade animation owns the
          transform, so no translateX can live on this element) */}
      <div
        className="fade"
        style={{
          position: 'fixed', left: 0, right: 0, top: '43%', zIndex: 24,
          pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          // the name arrives WITH the camera: after the bank (≤1.1s) + the run
          paddingTop: 30, textAlign: 'center', animationDelay: '2.1s',
        }}
      >
        <span aria-hidden style={{ width: 1, height: 24, background: `linear-gradient(180deg, transparent, ${rgba(C.star, 0.65)})` }} />
        {/* no glow shadow here: a soft text-shadow clipped by the ellipsis box
            (overflow: hidden) paints a faint rectangular highlight behind the
            handle — the star above carries all the light this needs */}
        <span
          style={{
            fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 'clamp(23px, 6.5vw, 30px)',
            letterSpacing: '.5px', color: C.star,
            textShadow: '0 2px 18px rgba(0,0,0,.85)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '88vw',
          }}
        >
          @{view.handle}
        </span>
        {view.intent ? (
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 17.5, lineHeight: 1.4, color: rgba(C.cream, 0.94), textShadow: '0 2px 16px rgba(0,0,0,.85)', maxWidth: 330 }}>
            “{intentLine(t, view.intent)}”
          </span>
        ) : (
          <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 14.5, color: rgba(C.muted, 0.95), textShadow: '0 2px 14px rgba(0,0,0,.85)' }}>
            {t('starview.noIntent')}
          </span>
        )}
        {view.kind && (
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: '2.2px', textTransform: 'uppercase', color: rgba(tint, 0.98), textShadow: `0 0 12px ${rgba(tint, 0.5)}, 0 2px 12px rgba(0,0,0,.8)` }}>
            {t(`category.${view.kind}`)}
          </span>
        )}
      </div>

      {/* how to move — one whispered line, low and out of the way */}
      <div aria-hidden className="fade" style={{ position: 'fixed', left: 0, right: 0, bottom: 'max(18px, env(safe-area-inset-bottom))', zIndex: 24, pointerEvents: 'none', textAlign: 'center', animationDelay: '2.8s' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: '1.2px', textTransform: 'uppercase', color: rgba(C.muted, 0.75) }}>
          {t('starview.hint')}
        </span>
      </div>
    </>
  )
}

// ── /copy — where the verification email's copy button lands ─────────────────
// An email can't reach the clipboard, so its copy button opens this one-tap
// page instead: the code held large, one button that copies it, nothing else.
// The code rides the URL fragment, so it never touches a server log.
export function CopyCodeScreen({ C, ctx }) {
  const { t } = useI18n()
  const code = String(ctx.copyCode || '').replace(/\D/g, '').slice(0, 8)
  const [copied, setCopied] = React.useState(false)
  const copy = async () => {
    if (await copyText(code)) setCopied(true)
  }
  return (
    <Shell>
      <div className="enter" style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
        <Brandmark C={C} size={26} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 18 }}>
        {code ? (
          <>
            <Kicker C={C}>{t('copy.kicker')}</Kicker>
            <div
              className="enter"
              style={{
                fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 'clamp(44px, 15vw, 60px)',
                letterSpacing: '14px', paddingLeft: 14, color: C.star, textShadow: `0 0 34px ${rgba(C.star, 0.4)}`,
              }}
            >
              {code}
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: C.muted, maxWidth: 300 }}>{t('copy.note')}</p>
          </>
        ) : (
          <p style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 19, lineHeight: 1.4, color: rgba(C.cream, 0.9), maxWidth: 300 }}>
            {t('copy.missing')}
          </p>
        )}
      </div>
      {code && (
        <PrimaryButton C={C} onClick={copy}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
            <Icon name={copied ? 'check' : 'copy'} size={16} color={C.onStar} stroke={2} /> {copied ? t('copy.copied') : t('copy.cta')}
          </span>
        </PrimaryButton>
      )}
    </Shell>
  )
}

// ── the .edu gate — join a community by proving you're at that school ──────────
// Your ping only ever reaches people from your own community, so joining one asks
// for a code emailed to an address at that school's domain. Two steps: enter the
// address, then the code. On success it reports { slug, email } up so App can flip
// membership. The sandbox runs this exact real pipeline too (a real code, really
// emailed, really verified) — its one carve-out is the domain check, which also
// accepts @gmail.com. Only a build with no backend configured at all falls back
// to a local auto-confirm, so the shape stays playable with nothing wired.
export function EduVerifySheet({ C, slug, demo, onVerified, onClose }) {
  const { t } = useI18n()
  const SHADOW = makeShadow(C)
  const community = bySlug(slug) || {}
  const domain = community.domain || 'school.edu'
  const name = community.name || 'your school'
  const short = community.short || name
  const real = eduVerifyEnabled()

  const [phase, setPhase] = React.useState('email') // email | sending | code | verifying | verified
  const [email, setEmail] = React.useState('')
  const [code, setCode] = React.useState('')
  const [errCode, setErrCode] = React.useState('')
  const [resent, setResent] = React.useState(false)
  const tokenRef = React.useRef(null)
  const doneRef = React.useRef(null)
  React.useEffect(() => () => { if (doneRef.current) clearTimeout(doneRef.current) }, [])

  const dismiss = () => onClose()
  const dialogRef = useDialog(dismiss)

  const send = async () => {
    setErrCode('')
    const pre = localEmailCheck(email, slug, demo)
    if (!pre.ok) { setErrCode(pre.error); return }
    setPhase('sending')
    if (!real) {
      tokenRef.current = 'demo'
      setTimeout(() => setPhase('code'), 650)
      return
    }
    try {
      const r = await sendEduCode({ email, slug, demo })
      tokenRef.current = r.token
      setPhase('code')
    } catch (e) {
      setErrCode(e?.code || 'send')
      setPhase('email')
    }
  }

  const resend = async () => {
    setCode('')
    setErrCode('')
    setResent(true)
    setTimeout(() => setResent(false), 2400)
    await send()
  }

  const succeed = () => {
    setPhase('verified')
    doneRef.current = setTimeout(() => onVerified({ slug, email: email.trim().toLowerCase() }), VERIFIED_HOLD_MS)
  }

  const submit = async () => {
    const c = code.replace(/\D/g, '')
    if (c.length !== 4) { setErrCode('code'); return }
    setErrCode('')
    setPhase('verifying')
    if (!real) { succeed(); return }
    const res = await verifyEduCode({ token: tokenRef.current, code: c })
    if (res.ok) succeed()
    else { setErrCode(res.error || 'code'); setPhase('code') }
  }

  const errMsg =
    errCode === 'domain' ? t('edu.errDomain', { domain, name })
      : errCode === 'email' ? t('edu.errEmail')
      : errCode === 'rate' ? t('edu.errRate')
      : errCode === 'send' ? t('edu.errSend')
      : errCode === 'expired' ? t('edu.errExpired')
      : errCode === 'code' ? t('edu.errCode')
      : ''

  const busy = phase === 'sending' || phase === 'verifying'

  return (
    <div
      onClick={dismiss}
      style={{ position: 'fixed', inset: 0, zIndex: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom))', overflowY: 'auto' }}
    >
      <div className="scrim-in" aria-hidden style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.74), backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('edu.title', { name })}
        tabIndex={-1}
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 400, margin: 'auto', background: rgba(C.ink2, 0.98), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 18, outline: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <SchoolMark C={C} slug={slug} size={42} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 22, color: C.cream, lineHeight: 1.12 }}>{t('edu.title', { name })}</div>
          </div>
          <button onClick={dismiss} aria-label={t('edu.cancel')} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: C.ink3, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}>
            <Icon name="x" size={14} color="currentColor" />
          </button>
        </div>

        {phase === 'verified' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 13, padding: '26px 0 22px' }}>
            <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 66, height: 66 }}>
              <span aria-hidden className="v-ring" style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: `1.5px solid ${rgba(C.star, 0.6)}` }} />
              <span aria-hidden className="v-ring" style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: `1.5px solid ${rgba(C.star, 0.6)}`, animationDelay: '0.3s' }} />
              <span className="v-pop" style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 60, height: 60, borderRadius: '50%', background: rgba(C.star, 0.16), border: `1px solid ${rgba(C.star, 0.5)}`, boxShadow: `0 0 30px ${rgba(C.star, 0.45)}` }}>
                <Icon name="check" size={30} color={C.star} stroke={2.4} />
              </span>
            </span>
            <div style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', fontSize: 23, color: C.cream, textAlign: 'center' }}>{t('edu.verified', { name: short })}</div>
          </div>
        ) : phase === 'email' || phase === 'sending' ? (
          <>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: C.muted }}>{t('edu.sub', { domain, name })}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FieldLabel C={C}>{t('edu.emailLabel')}</FieldLabel>
              <Field
                C={C}
                kind="email"
                value={email}
                onChange={(v) => { setEmail(v); if (errCode) setErrCode('') }}
                placeholder={t('edu.emailPlaceholder', { domain })}
                autoFocus
                onEnter={send}
              />
              {errMsg && <span style={{ fontSize: 12, lineHeight: 1.5, color: rgba(C.star, 0.95) }}>{errMsg}</span>}
            </div>
            <PrimaryButton C={C} disabled={busy || !email.trim()} onClick={send}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
                <Icon name="mail" size={16} color={C.onStar} stroke={1.9} /> {phase === 'sending' ? t('edu.sending') : t('edu.send')}
              </span>
            </PrimaryButton>
            {demo && !real && <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.star, 0.9) }}>{t('edu.demoNote')}</p>}
            {demo && real && <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.star, 0.9) }}>{t('edu.demoGmailNote')}</p>}
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: C.muted }}>{t('edu.codeSent', { email })}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <FieldLabel C={C}>{t('edu.codeLabel')}</FieldLabel>
              <input
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 4)); if (errCode) setErrCode('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                placeholder="••••"
                aria-label={t('edu.codeLabel')}
                autoFocus
                style={{
                  width: '100%', height: 58, textAlign: 'center', borderRadius: RADIUS.field,
                  background: C.ink, border: `1.5px solid ${errMsg ? rgba(C.star, 0.6) : C.line}`, color: C.star,
                  fontFamily: "'Space Mono', monospace", fontSize: 32, fontWeight: 700, letterSpacing: '16px', paddingLeft: 16,
                  outline: 'none', textShadow: `0 0 22px ${rgba(C.star, 0.35)}`,
                }}
              />
              {errMsg && <span style={{ fontSize: 12, lineHeight: 1.5, color: rgba(C.star, 0.95) }}>{errMsg}</span>}
            </div>
            <PrimaryButton C={C} disabled={busy || code.length !== 4} onClick={submit}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, justifyContent: 'center' }}>
                <Icon name="check" size={16} color={C.onStar} stroke={2.2} /> {phase === 'verifying' ? t('edu.verifying') : t('edu.verify')}
              </span>
            </PrimaryButton>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              <GhostButton C={C} onClick={resend} style={{ fontSize: 12 }}>{resent ? t('edu.resent') : t('edu.resend')}</GhostButton>
              <GhostButton C={C} onClick={() => { setPhase('email'); setCode(''); setErrCode('') }} style={{ fontSize: 12 }}>{t('edu.change')}</GhostButton>
            </div>
            {demo && !real && <p style={{ margin: 0, textAlign: 'center', fontSize: 11.5, lineHeight: 1.5, color: rgba(C.star, 0.9) }}>{t('edu.demoNote')}</p>}
          </>
        )}
      </div>
    </div>
  )
}
