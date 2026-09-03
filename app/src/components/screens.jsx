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
import { createPortal } from 'react-dom'
import { normHandle } from '../api/celestual.js'
import { daysLeft, nearLapse } from '../api/pings.js'
import {
  startVerification, pollVerification, igDeepLink, igWebLink, igUsername,
  dmCode, savePending, loadPending, clearPending, genProof,
} from '../api/igverify.js'
import { useI18n } from '../i18n/index.js'
import { useHandleResolve, HandleReadout, ResolvedHandle } from './handle.jsx'
import { leatherSurface } from '../texture.js'
import {
  Brandmark, Sigil, StarMark, Kicker, Mono, Rule, StateDot, Sonar,
  PrimaryButton, GhostButton, OutlineButton, Plate, Field, HandleChip, HandleSearchField,
  Icon, rgba, RADIUS, SPACE, makeShadow, useDialog, usePrefersReducedMotion,
  Display, Title, Lead, Small, Note, ScreenHeader, ExitRow, Slots, FONT, SIZE, TRACK,
  TEXT, HAIR, ONSKY, LIGHT, MEASURE,
} from './ui.jsx'
import Card from '../card/Disc.jsx'
import Composer from '../card/Composer.jsx'
import Spread from '../card/Spread.jsx'
import { shareCard } from '../card/share.js'

// The shared column: at least one dynamic-viewport tall, ranged left inside a
// measure that sits in the MIDDLE of the window. Both halves of that matter —
// on a phone the measure is the whole screen and the setting looks composed,
// and pinned to the left EDGE as well, the identical page becomes a stripe of
// type in the left third of a laptop with an acre of empty case beside it. The
// two stop reading as the same product.
//
// The top padding clears the masthead (App.jsx), which is fixed across the head
// of every page and is the reason no screen carries its own wordmark any more.
export function Shell({ children }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 'max(104px, calc(env(safe-area-inset-top) + 92px)) clamp(20px, 5vw, 40px) max(32px, env(safe-area-inset-bottom))',
      }}
    >
      <div style={{ width: '100%', maxWidth: MEASURE, flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}

// The old `Hint` was an icon + a sentence under every field. The icon never said
// anything the sentence didn't, so it's gone; `Note` (ui.jsx) is the whole
// treatment now. Most of the sentences went with it — a field that needs a
// paragraph under it is a field that isn't clear enough.

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
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: '0 2px' }}>
      <Kicker C={C} style={{ fontSize: SIZE.meta, letterSpacing: TRACK.meta }}>{children}</Kicker>
      {optional && (
        <span style={{ fontSize: SIZE.micro, letterSpacing: TRACK.meta, fontFamily: FONT.mono, color: rgba(C.star, 0.92), background: rgba(C.star, 0.1), border: `1px solid ${rgba(C.star, 0.28)}`, borderRadius: RADIUS.chip, padding: '2px 8px', textTransform: 'uppercase' }}>{optional}</span>
      )}
    </div>
  )
}

// The sandbox badge — the demo says what it is, everywhere it matters.
export function SlotPips({ C, standing, cap, compact, subscribed }) {
  const { t } = useI18n()
  const free = Math.max(0, cap - standing)
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: SPACE.sm }}>
      <Slots C={C} used={standing} cap={cap} />
      {!compact && (
        <span style={{ marginLeft: 4, fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: '.3px', color: C.muted }}>
          {standing > 0 ? t('slots.holding', { n: standing, cap }) : t('slots.free', { n: free, cap })}
        </span>
      )}
      {subscribed && (
        <span style={{ marginLeft: compact ? 2 : 6, fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: '.4px', color: rgba(C.star, 0.75) }}>
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
  const reduce = usePrefersReducedMotion()
  // one cursor across both lines; a pause (the breath) sits between them
  const total = l1.length + l2.length
  const [n, setN] = React.useState(reduce ? total : 0)
  const [erasing, setErasing] = React.useState(false)
  // ── one clock, on the frame ────────────────────────────────────────────────
  // This was a chain of setTimeouts, one per character, each re-arming from a
  // state change. Two things were wrong with that on the one page in the
  // product that has nothing else on it but a full-screen galaxy.
  //
  // The erase step is 14ms, which is SHORTER than a frame — so it asked React
  // for up to seventy commits a second to produce sixty visible states, and a
  // third of them landed between frames and were never seen at all. And a
  // timeout chain does not stop when the page does: a backgrounded tab keeps
  // typing on throttled timers and comes back mid-word.
  //
  // One requestAnimationFrame loop with its own clock does the same typing, at
  // the same speeds, with a hard ceiling of one commit per frame and no work at
  // all while the tab is hidden — because that is exactly what rAF already
  // promises. The state machine below is the same four rules it always was.
  React.useEffect(() => {
    if (reduce) {
      setN(total)
      setErasing(false)
      return undefined
    }
    const st = { n: 0, erasing: false }
    const delayFor = () => {
      if (!st.erasing && st.n < total) return st.n === l1.length ? 620 : 30 + Math.random() * 22 // the breath after line one
      if (!st.erasing) return 7000 // hold the finished promise
      if (st.n > 0) return 14 // erase — quick, unceremonious
      return 900 // a beat of empty sky before it types again
    }
    setN(0)
    setErasing(false)
    let raf = 0
    let last = 0
    let wait = delayFor()
    const step = (ts) => {
      raf = requestAnimationFrame(step)
      // the first frame only starts the clock; and a tab coming back from the
      // background hands us one enormous delta, which must not fast-forward the
      // whole line in a single commit
      const dt = last ? Math.min(ts - last, 100) : 0
      last = ts
      wait -= dt
      if (wait > 0) return
      // Catch up WITHIN the frame rather than across frames: a screen running at
      // thirty draws one frame per two erase steps, and stepping once per frame
      // would quietly halve the typing speed on exactly the devices that can
      // least afford to look wrong. Bounded, so a long stall can never turn into
      // a burst of work, and it still commits once — the eye only ever sees the
      // last state of a frame anyway.
      for (let k = 0; k < 4 && wait <= 0; k++) {
        if (!st.erasing && st.n < total) st.n++
        else if (!st.erasing) st.erasing = true
        else if (st.n > 0) st.n--
        else st.erasing = false
        wait += delayFor()
      }
      if (wait < 0) wait = 0
      setN(st.n)
      setErasing(st.erasing)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [total, l1.length, reduce])
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
        animationDelay: '.16s', width: '100%', maxWidth: 420, textAlign: 'left',
        fontFamily: FONT.serif, fontStyle: 'italic',
        fontSize: SIZE.lead, color: rgba(C.cream, 0.94), textShadow: ONSKY,
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
      {/* ── the title page ───────────────────────────────────────────────────
          Ranged left inside the centred measure, the way every page in this
          book is set. The claim is one sentence broken over two registers: the
          statement in ivory, the question in the one light, italic, because the
          question is the part somebody actually feels.

          The mark that used to float above this is gone. The masthead carries
          the wordmark on every screen now, and a second one here was the page
          signing its own name twice. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start' }}>
        <h1 className="enter" style={{ margin: 0 }}>
          <span style={{ display: 'block', fontFamily: FONT.serif, fontWeight: 300, fontSize: SIZE.colophon, lineHeight: 0.92, letterSpacing: '-0.02em', color: C.cream }}>
            {t('landing.head1')}
          </span>
          <span style={{ display: 'block', marginTop: 10, fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 300, fontSize: SIZE.colophon, lineHeight: 0.94, letterSpacing: '-0.018em', color: C.star }}>
            {t('landing.head2')}
          </span>
        </h1>

        <Rule C={C} width={132} style={{ margin: `${SPACE.xl}px 0 ${SPACE.lg}px` }} />

        <HeroSequence C={C} />

        {/* ── the two ways in, on one baseline ──────────────────────────────
            The plate is the act; "log in" is the quiet exit beside it. It used
            to be a chip pinned to the top-left corner of the viewport, which
            put the single most important thing a RETURNING person needs as far
            from the thing they came to press as the screen allows, in the one
            corner nothing else on the page is aligned to. Two doors, one row,
            both obviously doors. */}
        <div className="enter" style={{ animationDelay: '.16s', display: 'flex', alignItems: 'center', gap: SPACE.xl, flexWrap: 'wrap', marginTop: SPACE.xl }}>
          <Plate onClick={ctx.findOut} full={false}>{t('landing.cta')}</Plate>
          <GhostButton C={C} onClick={ctx.startLogin} style={{ fontSize: SIZE.small }}>{t('landing.login')}</GhostButton>
        </div>

        {/* The safety line that used to sit here ("no profiles. no browsing.
            nothing happens unless it's mutual.") is gone. The hero already says
            the whole mechanism in two lines — enter their @, and if it is not
            mutual it never happened — and a third line under the buttons
            restating it in the metadata face was the page saying the same thing
            twice and crowding the one act it is asking for. */}

        {/* The first light notice, a hiring call with its own countdown, used
            to sit here. It came off the title page, and then the campaign it
            belonged to came off the product entirely in Phase 7. */}
      </div>

      {/* ── the colophon ───────────────────────────────────────────────────
          The small print at the foot of the setting, where small print belongs
          — and it is the one block on this page set directly over the bright
          half of the chart. The galactic centre comes up under the last third
          of the window (engine.js centerY), which is orders of magnitude
          brighter than the ground either side of it, and 10px tracked mono over
          it was a smear rather than a line of type.
          So the foot of the page has a GROUND: one long, slow wash of the
          case's own colour rising out of the bottom edge, opaque enough at the
          very bottom to read against and gone well before it reaches the
          headline. It is fixed to the viewport rather than to this block, so
          the gradient's falloff never lands mid-sentence at some window height
          nobody tested. */}
      <div
        aria-hidden
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, height: '46dvh', zIndex: -1, pointerEvents: 'none',
          background:
            `linear-gradient(to bottom, transparent 0%, ${rgba(C.ink, 0.26)} 22%, ` +
            `${rgba(C.ink, 0.66)} 44%, ${rgba(C.ink, 0.88)} 66%, ${rgba(C.ink, 0.96)} 100%)`,
        }}
      />
      <div className="enter" style={{ position: 'relative', animationDelay: '.24s', display: 'flex', flexDirection: 'column', gap: SPACE.sm, alignItems: 'flex-start', paddingTop: SPACE.xl }}>
        <Small C={C} style={{ maxWidth: 400 }}>
          {t('landing.age')}{' '}
          <a href="/terms" target="_blank" rel="noopener" style={{ color: TEXT.quiet }}>{t('landing.terms')}</a>.
        </Small>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, flexWrap: 'wrap' }}>
          {[
            ['/privacy', t('footer.privacy')],
            ['/terms', t('footer.terms')],
          ].map(([href, label], idx) => (
            <React.Fragment key={href}>
              {idx > 0 && <span aria-hidden style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: C.line }} />}
              <a href={href} target="_blank" rel="noopener" style={{ fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: TRACK.tick, color: TEXT.faint, textDecoration: 'none', textShadow: ONSKY }}>
                {label}
              </a>
            </React.Fragment>
          ))}
          <span aria-hidden style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: C.line }} />
          <button
            type="button"
            onClick={() => window.location.assign('/optout')}
            style={{ fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: TRACK.tick, color: TEXT.faint, textShadow: ONSKY }}
          >
            {t('footer.optout')}
          </button>
        </div>
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: SPACE.xl }}>
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.md }}>
          <HandleChip C={C} handle={poster} big />
          <Kicker C={C}>{t('open.reach')}</Kicker>
        </div>
        <h1 className="enter" style={{ animationDelay: '.08s', margin: 0, fontFamily: FONT.serif, fontWeight: 400, fontSize: SIZE.title, lineHeight: 1.2, color: C.cream, maxWidth: 360, textWrap: 'balance' }}>
          {t('open.line')}
        </h1>
        <p className="enter" style={{ animationDelay: '.14s', margin: 0, fontSize: SIZE.small, lineHeight: 1.6, color: C.muted, maxWidth: 320 }}>
          {t('open.mech')}
        </p>
      </div>
      <div className="enter" style={{ animationDelay: '.2s', display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        {/* the prefilled ping — two taps from Story to placed ping */}
        <PrimaryButton C={C} onClick={() => ctx.startFromDoor(poster)}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.md, justifyContent: 'center' }}>
            {t('open.cta')} <Icon name="arrow" size={17} color={C.onStar} stroke={2.1} />
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.startFromDoor('')} style={{ fontSize: SIZE.small }}>
            {t('open.else')}
          </GhostButton>
        </div>
        <p style={{ margin: 0, textAlign: 'center', fontSize: SIZE.meta, color: C.muted }}>{t('landing.safety')}</p>
      </div>
    </Shell>
  )
}

// ── 2 · THE SEND ──────────────────────────────────────────────────────────────
// The @, confirmed, and nothing else. This screen used to place the ping; it now
// hands off to the composer, because what a ping carries is a card somebody
// wrote and asking for it after the act would make it read as an extra.
//
// The two-tap confirm stays exactly as it was. A typo here is otherwise a
// permanent, silent, un-diagnosable dead end: the ping resolves to nobody and
// nothing in the product can ever say so.
export function WhoScreen({ C, ctx }) {
  const { t } = useI18n()
  const valid = ctx.them.trim().length >= 2 && normHandle(ctx.them) !== normHandle(ctx.me)
  const [confirming, setConfirming] = React.useState(false)
  const normd = normHandle(ctx.them)
  // The account behind the @, if there is one. It changes ONE thing about this
  // screen and nothing else: which sentence the second tap is confirming. A
  // handle we could not find is still placeable, because our lookup is not the
  // registry and a person who knows their friend's @ is right.
  const at = useHandleResolve(ctx.them)
  const unfound = at.state === 'missing'
  const onNext = () => {
    if (!valid) return
    if (!confirming) {
      setConfirming(true)
      return
    }
    ctx.compose()
  }
  React.useEffect(() => {
    setConfirming(false)
  }, [ctx.them])

  return (
    <Shell>
      <ScreenHeader C={C} onBack={() => ctx.go(ctx.pings.length ? 'pings' : 'landing')} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl }}>
        <div className="enter" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: SPACE.lg, textAlign: 'left' }}>
          {/* the header, as a full serif headline, left-aligned — the accent line
              in amber (the "you" star), one warm light with the landing page.
              Set at the title-page step rather than the section step: this is
              the question the whole product exists to ask, and it was being
              asked at the same size as "share the open sky". */}
          <h2 style={{ margin: 0, fontFamily: FONT.serif, fontWeight: 300, fontSize: SIZE.colophon, lineHeight: 0.94, letterSpacing: TRACK.title, color: C.cream }}>
            {t('who.title1')}<br />
            <span style={{ color: C.star }}>{t('who.title2')}</span>
          </h2>
          {/* self @ first: the ping is FROM you, shown under the headline */}
          {normHandle(ctx.me) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.sm }}>
              <Kicker C={C} style={{ fontSize: SIZE.micro }}>{t('who.fromLabel')}</Kicker>
              <HandleChip C={C} handle={normHandle(ctx.me)} />
            </span>
          )}
        </div>
        <div className="enter" style={{ animationDelay: '.06s', display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          {/* The @ is written at the size the headline is asked at. This is the
              one line of text a person types in the whole product, and it was
              being taken at 22px under a question set at 46. */}
          <div data-sendoff-field>
            <HandleSearchField C={C} value={ctx.them} onChange={ctx.setThem} placeholder={t('who.placeholder')} autoFocus onEnter={onNext} scale="hero" />
          </div>
          {/* the account, under the line. This is the only thing on the screen
              that confirms the @ against a person rather than against the
              typing, and it draws nothing at all until it has something true
              to say.

              It stands down for exactly one case: the second tap on a handle
              we could not find, where the confirm line below is already saying
              that and saying it better, because it also says what pressing
              again will do. */}
          {!(confirming && unfound) && <HandleReadout C={C} at={at} size={30} />}
          {/* The note that used to stand here when nothing was being confirmed
              ("no alert. no trace. invisible until they enter you back.") is
              gone. It was a paragraph under a field explaining what the field
              does, which is the one thing the copy in this product is not
              allowed to be, and it was set in the quietest grey on the screen
              directly under the loudest thing on it. */}
          {confirming && valid && (
            <div key="confirm" className="fade" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px 7px', color: C.muted, fontFamily: FONT.sans, fontWeight: 300, fontSize: SIZE.small, lineHeight: 1.5, padding: '0 2px', textShadow: ONSKY }}>
              <span>{t('who.confirm1')}</span>
              <HandleChip C={C} handle={normd} />
              {/* one line, and which line depends on whether we found anybody.
                  Stacked, the two would say the same thing twice. */}
              <span>{unfound ? t('who.confirmUnknown') : t('who.confirm2')}</span>
            </div>
          )}
          {ctx.error && <Note C={C} tone="accent">{ctx.error}</Note>}
        </div>

        {/* the slots — the weight under the act. only shown once we know who you
            are: before you've identified, your slot count is genuinely unknown. */}
        {ctx.established && (
          <div className="enter" style={{ animationDelay: '.12s', display: 'flex', justifyContent: 'flex-start' }}>
            <SlotPips C={C} standing={ctx.slotsStanding} cap={ctx.slotsCap} />
          </div>
        )}
      </div>

      <PrimaryButton C={C} disabled={!valid} onClick={onNext}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.md, justifyContent: 'center' }}>
          {confirming ? t('who.ctaConfirm') : t('who.cta')}
        </span>
      </PrimaryButton>
    </Shell>
  )
}

// ── 2b · THE CARD ─────────────────────────────────────────────────────────────
// The composer IS the card (docs/STAR-CARDS.md §2b): you type into the poster,
// at the size and in the face it will keep, and you drag the block to where you
// want it. There is no preview step, because the thing on screen is the artifact.
//
// No label above it. The card's own rim already carries the @, and a header
// repeating it is the same fact stated twice on one screen.
//
// The identity gate can still open on top of this (a first ping proves the @
// before it lands), and the composed card survives that: App holds it in a ref
// from here until the moment the ping is recorded.
export function ComposeScreen({ C, ctx }) {
  const [busy, setBusy] = React.useState(false)
  const place = async (card) => {
    if (busy) return
    setBusy(true)
    try {
      await ctx.place(card)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Shell>
      <ScreenHeader C={C} onBack={() => ctx.go('who')} />
      <div style={{ flex: 1, display: 'flex', paddingTop: SPACE.xl }}>
        <Composer C={C} handle={normHandle(ctx.them)} busy={busy} onPlace={place} onBack={() => ctx.go('who')} />
      </div>
    </Shell>
  )
}

// ── the identity step (your side — so the ping can resolve to you) ────────────
// ONE field and ONE button. The person types their @ and the SERVER decides what
// happens next (migration 0015 + celestual-relogin `start`):
//
//   never seen this @   → it's a signup: the email and the age confirm unfold
//   known, has an email → the link goes to that inbox, and we name it
//   known, no email     → the DM sheet opens on its own
//
// What this replaces: two competing buttons ("email me a sign-in link" /
// "verify by dm instead"), a hint under the field explaining the difference,
// and a confirmation written in the conditional because the client could not
// tell which door it had just gone through. The person never chooses a
// mechanism again; they only ever type who they are.
export function YouScreen({ C, ctx }) {
  const { t } = useI18n()
  const login = ctx.loginMode
  const id = ctx.identity // { phase:'idle'|'checking'|'resolved', route, to }
  const emailVal = ctx.email.trim()
  const emailFormatOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)
  const handleOk = ctx.me.trim().length >= 2
  // The signup panel: the email (the reveal channel and the way back in) and the
  // 18+ confirm (§4.4 — one tap, never stored: we keep whether, not when).
  const signup = id.phase === 'resolved' && id.route === 'signup'
  const [over18, setOver18] = React.useState(false)
  const ready = signup ? handleOk && emailFormatOk && over18 : handleOk
  const busy = id.phase === 'checking'
  const submit = () => {
    if (!ready || busy) return
    if (signup) ctx.continueFromYou()
    else ctx.resolveIdentity()
  }
  // The @ changed under a resolved answer: that answer is about a different
  // person now, so drop it and let the server answer again.
  React.useEffect(() => {
    if (id.phase !== 'idle') ctx.resetIdentity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx.me])

  const sent = id.phase === 'resolved' && id.route === 'email'
  const unknown = id.phase === 'resolved' && id.route === 'signup' && !!id.fresh
  const cta = signup && !login ? t('verify.continue') : busy ? t('you.checking') : t('you.continue')

  return (
    <Shell>
      <ScreenHeader C={C} onBack={() => ctx.go(login ? 'landing' : 'who')} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl }}>
        <Display C={C} className="enter">
          {login ? (
            <>{t('you.loginTitle1')}<br /><span style={{ color: C.star }}>{t('you.loginTitle2')}</span></>
          ) : (
            <>{t('you.title1')}<br /><span style={{ color: C.star }}>{t('you.title2')}</span></>
          )}
        </Display>

        <div className="enter" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <Field C={C} kind="handle" value={ctx.me} onChange={ctx.setMe} placeholder={t('you.handle')} autoFocus emphasis onEnter={submit} />
          {/* your own account, read back to you. A typo in your OWN @ is worse
              than a typo in theirs: it sends the ownership code to a stranger's
              inbox and leaves your pings under a name that is not yours. */}
          <ResolvedHandle C={C} value={ctx.me} />
          {/* the ONLY line that ever sits under this field, and only once the
              server has actually decided something */}
          {ctx.verified && <Note C={C} tone="accent">{t('verify.youDone')}</Note>}
          {unknown && <Note C={C}>{t('you.unknown')}</Note>}
        </div>

        {/* the signup panel — unfolds only for an @ the server has never seen */}
        <Collapse open={signup && !login}>
          <div className="fade" style={{ paddingTop: SPACE.xs, display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
              <FieldLabel C={C}>{t('you.emailLabel')}</FieldLabel>
              <Field C={C} kind="email" value={ctx.email} onChange={ctx.setEmail} placeholder={t('you.email')} onEnter={submit} />
            </div>
            <button
              onClick={() => setOver18((v) => !v)}
              aria-pressed={over18}
              style={{
                display: 'flex', alignItems: 'center', gap: SPACE.md, width: '100%', padding: '15px 17px',
                borderRadius: RADIUS.field, cursor: 'pointer', textAlign: 'left',
                background: over18 ? rgba(C.star, 0.1) : C.ink2,
                border: `1.5px solid ${over18 ? rgba(C.star, 0.55) : C.line}`,
                color: C.cream, fontFamily: FONT.sans, transition: 'all .2s',
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
              <span style={{ flex: 1, minWidth: 0, fontSize: SIZE.body, fontWeight: 500 }}>
                {over18 ? t('you.ageConfirmed') : t('you.ageConfirm')}
              </span>
            </button>
          </div>
        </Collapse>
      </div>

      {sent ? (
        // The link is really sent, to a real inbox we can name. No "if".
        <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, padding: '17px 18px', borderRadius: RADIUS.card, background: rgba(C.ink2, 0.55), border: `1px solid ${C.line}` }}>
            <Lead C={C}>{t('you.linkSentTitle')}</Lead>
            <Small C={C}>{t('you.linkSentNote', { to: id.to })}</Small>
          </div>
          <ExitRow C={C}>
            <GhostButton C={C} onClick={ctx.requestSignIn}>{t('you.linkResend')}</GhostButton>
            <GhostButton C={C} onClick={ctx.login}>{t('you.linkDm')}</GhostButton>
          </ExitRow>
        </div>
      ) : (
        <PrimaryButton C={C} disabled={!ready || busy} onClick={submit}>
          {cta}
        </PrimaryButton>
      )}
    </Shell>
  )
}

// ── 3 · PLACED — the recruiter screen (the most important in the product) ─────
// The placed ping now turns on your community. If you're in one that's still
// filling, the answer to "did they ping me too?" is held until it opens, and the
// one thing you control is bringing your world in — so both states lead with the
// count and a share action. Quiet fallbacks cover no-community-joined and an
// Phase 8 retired the community half of it (Q15).


// The one hero shared by every placed state: the @ handle, big, bold, and
// amber-lit — the single thing that tells you at a glance whether they're
// here yet. Same bones everywhere (mono sigil + handle, full-width, tight
// leading, ellipsis on overflow); only the status line beneath it ever
// changes, and that's the whole point — the design should read as one family.
function PlacedHandleHero({ C, handle, reachable }) {
  const { t } = useI18n()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.md, textAlign: 'center', width: '100%' }}>
      <div
        style={{
          width: '100%', fontFamily: FONT.mono, fontWeight: 500,
          fontSize: SIZE.hero, lineHeight: 1.02,
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
          margin: 0, fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 400,
          fontSize: SIZE.lead, lineHeight: 1.35,
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
// Phase 8. This was one of three placed states; the other two were about a
// community that was still gathering, and communities are retired (Q15). What
// is left is the state that was always true of the act itself: the @ is up, and
// either they can be reached or they cannot.
function PlacedQuiet({ C, ctx, handle, reachable }) {
  const { t } = useI18n()
  const body = reachable ? t('placed.standingSub', { handle }) : t('placed.waitingSub')
  // reachable still gets its own title, demoted beneath the @ hero: the @ plus
  // its status line is the headline in every placed state.
  const subTitle = reachable ? t('placed.standingTitle') : null
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: SPACE.xl }}>
        <div className="enter" style={{ width: '100%' }}>
          <PlacedHandleHero C={C} handle={handle} reachable={reachable} />
        </div>
        {subTitle && (
          <p className="enter" style={{ animationDelay: '.08s', margin: 0, fontFamily: FONT.serif, fontWeight: 400, fontStyle: 'italic', fontSize: SIZE.lead, lineHeight: 1.2, color: C.cream }}>
            {subTitle}
          </p>
        )}
        <p className="enter" style={{ animationDelay: '.14s', margin: 0, fontSize: SIZE.body, lineHeight: 1.7, color: C.muted, maxWidth: 330 }}>{body}</p>
      </div>

      <div className="enter" style={{ animationDelay: '.26s', display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: SIZE.small }}>{t('placed.pings')}</GhostButton>
        </div>
      </div>
    </Shell>
  )
}

export function PlacedScreen({ C, ctx }) {
  const placed = ctx.lastPlaced || { handle: ctx.them, reachable: false }
  return <PlacedQuiet C={C} ctx={ctx} handle={placed.handle} reachable={!!placed.reachable} />
}

// ── 4 · YOUR PINGS — the ledger ───────────────────────────────────────────────
// The seal, at the size a seal is. Every entry in the ledger wears this
// footprint whether or not there is anything in it, which is what makes the
// column read as a set of SLOTS rather than as a list that happens to have some
// pictures down one side.
const SEAL = 88

// One entry: an object, the writing beside it, and a rule under the pair. There
// is no panel. A page in a ledger is entries divided by rules, and the leather
// slab each ping used to sit on was five objects competing on one screen with
// the actual object — the seal — shrunk to a chip inside them.
function Row({ C, children, as = 'div', onClick, style }) {
  const Tag = as
  return (
    <Tag
      {...(as === 'button' ? { type: 'button', onClick } : { onClick })}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACE.md,
        width: '100%',
        padding: `${SPACE.md}px 0`,
        borderBottom: `1px solid ${HAIR.faint}`,
        textAlign: 'left',
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}

// The seal on an entry, and the way to the star it is. It is the ONLY thing on
// the row that flies the camera: the row used to be, which meant every quiet
// action on it had to stop its own click from falling through into a camera
// flight. The object you fly to is the object you press.
function SealButton({ C, card, url, onClick, label, className }) {
  const inner = (
    <Card
      C={C}
      card={card || { words: '', bg: 'hide', tone: 0.12 }}
      url={url}
      size={SEAL}
      glow={0.55}
    />
  )
  if (!onClick) return <span style={{ flex: '0 0 auto', opacity: 0.72 }}>{inner}</span>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={className}
      style={{ flex: '0 0 auto', borderRadius: '50%', padding: 0 }}
    >
      {inner}
    </button>
  )
}

// A row action: a line of type with a hairline under it. Not a pill, not a
// bordered chip — a footnote reference, which is exactly the weight an action
// inside an entry deserves when the entry itself is the thing being read.
// `sub` prints what the action DOES beside it, which is the whole reason the
// renew action stopped being ambiguous.
function RowLink({ C, children, sub, onClick, lit, quiet }) {
  const [hot, setHot] = React.useState(false)
  const col = lit ? C.star : quiet ? TEXT.faint : TEXT.quiet
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: SPACE.sm }}>
      <button
        type="button"
        onClick={onClick}
        onPointerEnter={() => setHot(true)}
        onPointerLeave={() => setHot(false)}
        style={{
          fontFamily: FONT.sans,
          fontWeight: 300,
          fontSize: 11.5,
          letterSpacing: '0.04em',
          color: hot ? TEXT.read : col,
          borderBottom: `1px solid ${rgba(C.cream, hot ? 0.4 : quiet ? 0.12 : 0.2)}`,
          paddingBottom: 1,
          textShadow: ONSKY,
          transition: 'color .18s linear, border-color .18s linear',
        }}
      >
        {children}
      </button>
      {sub && <Mono C={C} size={SIZE.micro}>{sub}</Mono>}
    </span>
  )
}

// ── one entry in the ledger ──────────────────────────────────────────────────
// A row, not a card. Every ping used to sit on its own slab of stitched leather,
// and a list of them read as a stack of objects rather than as a page in a
// ledger: five panels down a screen is five things competing to be looked at,
// and the seal — the one object on the row that is genuinely an object — was
// reduced to a 38px chip inside the panel that was shouting over it.
//
// So the leather comes off. The seal is set at the size it deserves, on the
// case itself, with the entry ranged beside it and one hairline ruled under the
// pair. That is what a ledger is: entries on a page, divided by rules.
//
// THE SEAL IS THE WAY TO THE SKY, and only the seal. It used to be the whole
// panel, which meant every quiet text action on the row had to stop its own
// click from falling through into a camera flight. The object you fly to is the
// object you press.
function PingCard({ C, ping, ctx }) {
  const { t } = useI18n()
  const [confirmGo, setConfirmGo] = React.useState(false)
  const [renewed, setRenewed] = React.useState(null)
  const [renewing, setRenewing] = React.useState(false)
  const days = daysLeft(ping.expires_at)
  const soon = !ping.mutual && nearLapse(ping.expires_at)
  const state = ping.mutual ? 'mutual' : ping.reachable ? 'standing' : 'waiting'
  // Production renews outright, free, instantly. The sandbox detours through
  const renew = async () => {
    setRenewing(true)
    const until = await ctx.renew(ping.handle)
    setRenewing(false)
    setRenewed(until || true)
  }
  return (
    <Row C={C}>
      <SealButton
        C={C}
        card={ping.card}
        url={ping.photoId ? ctx.cardUrls[ping.photoId] : null}
        onClick={ping.handle ? () => ctx.locatePing(ping.handle) : undefined}
        label={ping.handle ? t('pings.locate') : undefined}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* the state, told by FORM rather than by hue: a filled mark that
            breathes is standing, an open dashed one is waiting, a joined pair is
            mutual. Somebody who cannot see colour reads this exactly as well as
            somebody who can, which is what a one-hue brand buys you. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginBottom: 6 }}>
          <StateDot C={C} state={state} size={9} />
          <Kicker C={C} color={ping.mutual ? C.star : state === 'standing' ? rgba(C.star, 0.92) : TEXT.faint}>
            {t(`pings.${state}`)}
          </Kicker>
        </div>

        <div style={{ fontFamily: FONT.mono, fontSize: 15, letterSpacing: '0.02em', color: ping.handle ? C.cream : TEXT.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: ONSKY }}>
          {ping.handle ? `@${ping.handle}` : t('pings.unnamed')}
        </div>

        {/* what you wrote on it. Yours to re-read; sealed to them until it is
            mutual, which is the only claim this row makes. */}
        {ping.card && ping.card.words && (
          <p style={{ margin: '6px 0 0', fontFamily: FONT.serif, fontStyle: 'italic', fontSize: SIZE.body, lineHeight: 1.35, color: rgba(C.cream, 0.62) }}>
            “{ping.card.words}”
          </p>
        )}

        {confirmGo ? (
          <div className="fade" style={{ marginTop: 9, display: 'flex', flexDirection: 'column', gap: SPACE.sm, alignItems: 'flex-start' }}>
            <Small C={C}>{t('pings.letgoConfirm')}</Small>
            <div style={{ display: 'flex', gap: SPACE.md, alignItems: 'center' }}>
              <RowLink C={C} onClick={() => ctx.letGo(ping.handle)}>{t('pings.letgoYes')}</RowLink>
              <RowLink C={C} quiet onClick={() => setConfirmGo(false)}>{t('pings.keep')}</RowLink>
            </div>
          </div>
        ) : (
          <>
            {/* the clock, and the DATE it runs out on, on their own line. The
                date is the part that was missing everywhere: it is also the day
                this slot comes back, so a person holding two pings can see when
                the next one opens without doing arithmetic on "43 days left".
                It sits UNDER the countdown rather than beside it, so the row of
                actions below stays one row at every width. */}
            {/* the clock. Days left, and that is the whole readout — the date
                it runs out on came off, because a countdown IS a date and
                printing both is saying one number twice. */}
            {!ping.mutual && days != null && (
              <Mono C={C} color={soon ? rgba(C.star, 0.92) : TEXT.quiet} style={{ display: 'block', marginTop: 7 }}>
                {days === 0 ? t('pings.today') : t('pings.days', { n: days })}
              </Mono>
            )}
            <div style={{ marginTop: 9, display: 'flex', gap: SPACE.lg, alignItems: 'baseline', flexWrap: 'wrap' }}>
              {ping.mutual && ping.handle ? (
                <RowLink C={C} lit onClick={() => ctx.openConversation(ping.handle)}>{t('pings.open')}</RowLink>
              ) : ping.handle ? (
                <>
                  {renewed ? (
                    <span className="fade" style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 11.5, letterSpacing: '0.04em', color: rgba(C.star, 0.92), textShadow: ONSKY }}>
                      {t('pings.renewed')}
                    </span>
                  ) : (
                    <RowLink C={C} lit={soon} onClick={renewing ? undefined : renew} sub={t('pings.renewSub')}>
                      {renewing ? t('pings.renewing') : t('pings.renew')}
                    </RowLink>
                  )}
                  <RowLink C={C} quiet onClick={() => setConfirmGo(true)}>{t('pings.letgo')}</RowLink>
                </>
              ) : null}
            </div>
          </>
        )}

      </div>
    </Row>
  )
}

// An open slot — the seal's own footprint, scored into the case and empty. It
// is the same 88px circle every entry above it wears, so the ledger reads as a
// column of slots with some of them filled rather than as a list with a button
// stuck on the end. Once every free slot is held, this same shape becomes the
// door to the next one (`paywall`) and names what tapping it opens: the
// checkout, not a free placement.
function EmptySlotCard({ C, onClick, paywall }) {
  const { t } = useI18n()
  return (
    <Row C={C} as="button" onClick={onClick}>
      <span
        style={{
          flex: '0 0 auto', width: SEAL, height: SEAL, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px dashed ${paywall ? rgba(C.star, 0.34) : rgba(C.cream, 0.18)}`,
          boxShadow: LIGHT.well,
        }}
      >
        <Sigil size={22} cut={paywall ? 'lamp' : 'ivory'} a={paywall ? 1 : 0.4} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, textAlign: 'left' }}>
        <Kicker C={C} color={paywall ? C.star : TEXT.quiet}>{paywall ? t('pings.slotNext') : t('pings.slotEmpty')}</Kicker>
        {/* "tap to place a ping" used to sit here. A slot you can press, on a
            page about placing pings, does not need to be told what pressing it
            does. The price does, because that is a fact and not an
            instruction. */}
        {paywall && <Mono C={C}>{t('pings.slotNextSub')}</Mono>}
      </span>
    </Row>
  )
}

// ── a slot the meter counts and this device has not named YET ────────────────
// The server knows how many pings are standing under your @, and since migration
// 0010 it also knows the @ each one points at — so a ping placed on a phone you
// no longer have is still YOUR ping, and it belongs in this list under its own
// name like every other one.
//
// It used to be drawn as a card that named a DEVICE and asked you to press
// something ("on another device" / "bring it here"), which put a piece of our
// storage model on a page about people and made restoring a chore. The restore
// runs on its own now (App.jsx's readLedger, retried while anything is still
// unaccounted for), so what is left here is the half second before the @ lands
// and the pre-0010 rows whose target survives only as a salted hash and can be
// named on no device but the one that typed it.
//
// Those get an ordinary standing entry. Same seal, same state, same clock. It
// simply has no @ printed on it, which is the truth.
const UNNAMED = { handle: null, reachable: true, card: null, mutual: false }

// ── when the next slot opens ─────────────────────────────────────────────────
// Every slot is held, so the only two ways forward are waiting and letting one
// go. Both are named, and the wait has a DATE on it rather than a shrug. The
// date is not new information — it is the lapse date of the soonest-lapsing
// ping, which the product has always known and never printed.
function NextSlotLine({ C, ctx }) {
  const { t } = useI18n()
  const next = ctx.nextSlot
  if (!next) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: `${SPACE.md}px 0 0` }}>
      <Kicker C={C} color={C.star}>
        {next.days === 0 ? t('pings.nextSlotToday') : t('pings.nextSlot', { n: next.days })}
      </Kicker>
      <Small C={C}>{t('pings.nextSlotOr')}</Small>
    </div>
  )
}

// ── the mutual slot ───────────────────────────────────────────────────────────
// A match arrives SEALED. What sits in the mutual section until someone opens
// it is a closed disc that will not stay still: it shakes every few seconds, a
// small physical impatience, because something is in there and the product is
// not going to pretend otherwise. Nothing about what it says is on this screen.
//
// Tapping it is the decision, and the decision is the whole reason the seal
// exists. It hands the sky its match — the two stars fall together, the merger
// flashes, the binary settles — and both cards unseal off that same clock.
//
// Afterwards it stays open: the two discs, side by side, and the one action
// that matters. An unsealing that could happen twice was never an unsealing.
function SealedMutual({ C, ping, onOpen }) {
  const { t } = useI18n()
  const [shake, setShake] = React.useState(false)
  React.useEffect(() => {
    // intermittent, not constant. A thing that shakes without stopping is a
    // loading spinner; a thing that shakes every few seconds is a thing with
    // something inside it.
    let stop = false
    let off
    const beat = () => {
      if (stop) return
      setShake(true)
      off = setTimeout(() => setShake(false), 700)
    }
    const id = setInterval(beat, 4200)
    const first = setTimeout(beat, 900)
    return () => {
      stop = true
      clearInterval(id)
      clearTimeout(first)
      clearTimeout(off)
    }
  }, [])

  return (
    <Row C={C} as="button" onClick={onOpen} style={{ cursor: 'pointer' }}>
      {/* the seal, at the size every other entry wears: a disc with the light of
          a card behind it and nothing of the card visible through it. It strains
          against its lid every few seconds, because something is in there and
          the product is not going to pretend otherwise. */}
      <span
        className={shake ? 'strain' : undefined}
        aria-hidden
        style={{
          flex: '0 0 auto', display: 'grid', placeItems: 'center', width: SEAL, height: SEAL,
          borderRadius: '50%', ...leatherSurface(C.ink3),
          boxShadow: `0 0 0 1px ${rgba(C.star, 0.5)}, ${LIGHT.seal}`,
        }}
      >
        <Sigil size={26} cut="lamp" ground={C.ink3} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0, flex: 1 }}>
        <Kicker C={C} color={C.star}>{t('pings.mutualKicker')}</Kicker>
        <span style={{ fontFamily: FONT.serif, fontSize: SIZE.lead, color: C.cream, textShadow: ONSKY }}>
          {t('pings.sealedTitle')}
        </span>
        <Small C={C}>{t('pings.sealedSub', { them: ping.handle })}</Small>
      </span>
      <Icon name="arrow" size={16} color={rgba(C.star, 0.9)} stroke={1.2} />
    </Row>
  )
}

// The same slot, open. Both cards at thumbnail size, theirs first — at a reveal
// the only thing anyone wants is the half they could not see — and the one way
// on. Tapping the pair plays the spread again; nothing is unsealed a second
// time, it is simply the size the cards can actually be read at.
function OpenMutual({ C, ping, ctx }) {
  const { t } = useI18n()
  const theirs = ping.theirCard
  const yours = ping.card
  const url = ping.photoId ? ctx.cardUrls[ping.photoId] : null
  return (
    <Row C={C}>
      {/* the pair, overlapped the way two things set down together overlap.
          Theirs on top, because at a reveal the only thing anyone wants is the
          half they could not see. Pressing them plays the spread again: nothing
          is unsealed a second time, it is simply the size the cards can
          actually be read at. */}
      {/* The pair keeps the footprint every other entry's seal has (SEAL wide),
          rather than a card and a half of it. Two discs at 0.72 lapping by 0.3
          measure 1.14 seals across, and on a narrow phone that extra sliver is
          what pushed the row past the column and clipped the second card off
          the page. `width: SEAL` with the overflow allowed to show keeps the
          column honest and the pair whole. */}
      <button
        type="button"
        onClick={() => ctx.openReveal(ping.handle)}
        aria-label={t('pings.revealAgain')}
        style={{
          flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', padding: 0,
          width: SEAL, maxWidth: SEAL,
        }}
      >
        {yours && <Card C={C} card={yours} url={url} size={SEAL * 0.63} tint={C.you} glow={0.5} />}
        {theirs && (
          <span style={{ marginLeft: -SEAL * 0.26, flex: '0 0 auto' }}>
            <Card C={C} card={theirs} size={SEAL * 0.63} tint={C.them} glow={0.7} />
          </span>
        )}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginBottom: 6 }}>
          <StateDot C={C} state="mutual" size={9} />
          <Kicker C={C} color={C.star}>{t('pings.mutual')}</Kicker>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 15, letterSpacing: '0.02em', color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: ONSKY }}>
          @{ping.handle}
        </div>
        {theirs && theirs.words && (
          <p style={{ margin: '6px 0 0', fontFamily: FONT.serif, fontStyle: 'italic', fontSize: SIZE.body, lineHeight: 1.35, color: rgba(C.cream, 0.62) }}>
            “{theirs.words}”
          </p>
        )}
        <div style={{ marginTop: 8, display: 'flex', gap: SPACE.md, alignItems: 'baseline', flexWrap: 'wrap' }}>
          <RowLink C={C} lit onClick={() => ctx.openConversation(ping.handle)}>{t('pings.open')}</RowLink>
          <RowLink C={C} quiet onClick={() => ctx.openReveal(ping.handle)}>{t('pings.revealAgain')}</RowLink>
        </div>
      </div>
    </Row>
  )
}

function MutualCard({ C, ping, ctx }) {
  if (!ping.revealed) return <SealedMutual C={C} ping={ping} onOpen={() => ctx.openReveal(ping.handle)} />
  return <OpenMutual C={C} ping={ping} ctx={ctx} />
}

// Your community, seated at the TOP of the pings page — clearly its own place,
// never mixed into the slot rows. One glass banner: the seal, the name, how its
// sky stands, its hero stat when it has one, and an unmistakable way IN. The
// finder stays one tap away (search/add), and the sky's live beats — a meteor
// for a ping, a constellation for a match — keep playing in the backdrop right
// here, with the same quiet caption the community page uses.
export function PingsScreen({ C, ctx }) {
  const { t } = useI18n()
  const pings = ctx.pings || []
  const cap = ctx.slotsCap
  const mutual = pings.filter((p) => p.mutual)
  const active = pings.filter((p) => !p.mutual)
  // ── the ledger accounts for every slot the meter counts ──────────────────
  // `unaccounted` is the server's standing count minus the rows this device
  // actually holds. It is normally zero, because App restores the ledger on any
  // proven session. When it is not, those slots are DRAWN — a meter that says
  // two of two over a list showing one is the bug this screen used to have, and
  // it is worse than the missing row, because the number is the thing that
  // stops you placing a ping.
  const held = Math.max(0, Number(ctx.unaccounted) || 0)
  const standing = active.length + held
  const used = Math.min(standing, cap)
  const emptyCount = Math.max(0, cap - standing)
  const empty = pings.length === 0 && held === 0
  // every slot held (or however many the sandbox has raised the cap to) — the
  // last row becomes the door to the next one, same shape, lit.
  const atCap = !empty && standing >= cap
  return (
    <Shell>
      <ScreenHeader
        C={C}
        label={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.md }}>
            <Kicker C={C}>{t('pings.kicker')}</Kicker>
          </span>
        }
        right={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.sm }}>
            <Slots C={C} used={used} cap={cap} />
            <Mono C={C}>{t('pings.slotsUsed', { used, cap })}</Mono>
          </span>
        }
      />

      <div className="enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: SPACE.md, paddingTop: SPACE.sm }}>
        {/* ── the mutual, FIRST ─────────────────────────────────────────────
            It used to sit at the FOOT of this page: under the community banner,
            under the standing pings, under every open slot, under the door to
            the next one and under a sentence about renewing being free. Which
            meant the one thing in this entire product that a person comes back
            to find was the one thing they had to scroll for, and on a phone it
            was below the fold and cut in half by it.
            A match is resolved and does not belong among the slots. That was
            always the argument for giving it its own section; it was never an
            argument for putting that section last. Nothing on this page
            outranks it — not even the place. */}
        {mutual.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm }}>
              <StateDot C={C} state="mutual" size={9} />
              <Kicker C={C} color={rgba(C.star, 0.9)}>{t('pings.mutualKicker')} · {mutual.length}</Kicker>
            </div>
            <Rule C={C} />
            {mutual.map((p, i) => (
              <MutualCard key={'m' + (p.handle || i)} C={C} ping={p} ctx={ctx} />
            ))}
          </div>
        )}

        {/* the ledger: entries, divided by rules. Always exactly `cap` slots —
            standing pings, then open ones. A mutual is resolved and never sits
            among them. */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: SPACE.sm }}>
          {empty ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, padding: `${SPACE.lg}px 0` }}>
              <Title C={C}>{t('pings.emptyTitle')}</Title>
              <Small C={C} style={{ maxWidth: 320 }}>{t('pings.emptyBody')}</Small>
            </div>
          ) : (
            <>
              {active.map((p, i) => (
                <PingCard key={(p.handle || 'anon') + i} C={C} ping={p} ctx={ctx} />
              ))}
              {Array.from({ length: held }).map((_, i) => (
                <PingCard key={'h' + i} C={C} ping={UNNAMED} ctx={ctx} />
              ))}
              {Array.from({ length: emptyCount }).map((_, i) => (
                <EmptySlotCard key={'e' + i} C={C} onClick={ctx.placeAnother} />
              ))}
              {atCap && (
                <>
                  <NextSlotLine C={C} ctx={ctx} />
                  <EmptySlotCard key="door" C={C} onClick={ctx.placeAnother} paywall />
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="enter" style={{ animationDelay: '.12s', display: 'flex', flexDirection: 'column', gap: SPACE.md, paddingTop: 20 }}>
        <PrimaryButton C={C} onClick={ctx.placeAnother}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.md, justifyContent: 'center' }}>
            {empty ? t('pings.emptyCta') : t('pings.add')}
          </span>
        </PrimaryButton>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => ctx.go('door')} style={{ fontSize: SIZE.small }}>
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
// ── 8 · THE MATCH ────────────────────────────────────────────────────────────
// The mutual is announced and then it is gone: a flash with nothing to press on
// it, and then the status page with a sealed slot on it. The two cards are
// opened deliberately from there or they are not opened at all.
const FLASH_MS = 1350

export function MutualScreen({ C, ctx }) {
  const { t } = useI18n()
  const them = (ctx.match && ctx.match.them) || normHandle(ctx.them) || 'them'
  const [going, setGoing] = React.useState(false)
  const done = ctx.afterMutual
  React.useEffect(() => {
    const fade = setTimeout(() => setGoing(true), FLASH_MS - 380)
    const leave = setTimeout(() => done(), FLASH_MS)
    return () => {
      clearTimeout(fade)
      clearTimeout(leave)
    }
  }, [done])

  return (
    <Shell>
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', gap: SPACE.xl,
          opacity: going ? 0 : 1, transition: 'opacity .45s ease',
        }}
      >
        {/* the one place the brand permits brightness — the star, larger than anywhere */}
        <div className="enter"><StarMark C={C} size={128} /></div>
        <h1 className="enter" style={{ animationDelay: '.1s', margin: 0, fontFamily: FONT.serif, fontWeight: 400, fontSize: SIZE.hero, lineHeight: 1.05, color: C.cream }}>
          {t('match.title')}
        </h1>
        <p className="enter" style={{ animationDelay: '.18s', margin: 0, fontSize: SIZE.body, lineHeight: 1.7, color: C.muted, maxWidth: 320 }}>
          {t('match.sub', { them })}
        </p>
      </div>
    </Shell>
  )
}

// ── 8b · THE REVEAL ───────────────────────────────────────────────────────────
// The most important frame in the product, and almost nothing on it moves. The
// camera flies to the ping you actually placed; their light comes up around the
// limb of it, which is an eclipse and is the whole claim of the product in one
// image; then it turns over once, slowly (card/Spread.jsx). One object with two
// sides. Nothing arrives — the other side was always there.
//
// `index` is which of the ambient field's sealed stars this ping is. It is the
// SAME index the status page's "see it in the sky" flies to, because it is the
// same star and the same zoom; without it the reveal would have to invent a
// place to happen, which is what it used to do.
//
// The share sheet renders YOUR card only. There is no argument to share.js that
// carries theirs, which is the only way to be certain their words never end up
// in an image: they were written to exactly one reader.
export function RevealScreen({ C, ctx }) {
  const index = React.useMemo(
    () => (ctx.reveal ? ctx.pings.findIndex((p) => normHandle(p.handle || '') === ctx.reveal.handle) : -1),
    [ctx.reveal, ctx.pings],
  )
  const row = React.useMemo(
    () => (ctx.reveal ? ctx.pings.find((p) => normHandle(p.handle || '') === ctx.reveal.handle) : null),
    [ctx.reveal, ctx.pings],
  )
  // Landing here with nothing to reveal means the browser's back button walked
  // into a spread that is over. Go where they were going.
  const go = ctx.go
  React.useEffect(() => {
    if (!row) go('pings')
  }, [row, go])
  if (!row) return null
  const handle = normHandle(row.handle || '')
  const yours = row.card || { handle, words: '', bg: 'leaf', tone: 1, placed: row.time }
  const theirs = row.theirCard || { handle, words: '', bg: 'hide', tone: 0.12, placed: row.time }
  const yourUrl = row.photoId ? ctx.cardUrls[row.photoId] : null
  // Theirs, and this screen is the only place in the product it is ever drawn.
  // It exists at all because the pair is mutual: the read that produced it
  // (migration 0025) answers off a matched row and off nothing else.
  const theirUrl = row.theirPhotoId ? ctx.cardUrls[row.theirPhotoId] : null
  return (
    <Spread
      C={C}
      yours={yours}
      theirs={theirs}
      yourUrl={yourUrl}
      theirUrl={theirUrl}
      index={index}
      fieldRef={ctx.ambientGalaxyRef}
      onSay={() => ctx.openConversation(handle)}
      onShare={() => shareCard({ card: yours, photoUrl: yourUrl, mutual: true })}
      onBack={ctx.closeReveal}
    />
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
      <div className="sendoff-line" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: SPACE.md, paddingBottom: 'clamp(24px, 12vh, 90px)' }}>
        <div style={{ fontFamily: FONT.serif, fontSize: SIZE.title, color: C.cream }}>{t('sendoff.title')}</div>
        <div style={{ fontSize: SIZE.small, color: C.muted, fontFamily: FONT.mono, letterSpacing: '.5px' }}>
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


// ── the production paid door (docs/PRICING-REVENUE.md §3) ────────────────────
// Dormant unless VITE_STRIPE_ENABLED=1 (api/billing.js). When it's on, Screen 9
// carries a SECOND door under the free one: hold another ping for a one-time
// $2.99, or, if the plan is offered too, ten a month. Tapping one hands off to
// Stripe's own page; nothing about a card is typed here, and nothing is charged
// by this component. The free door above it never changes.
function HoldDoors({ C, ctx }) {
  const { t } = useI18n()
  const state = ctx.holdState || { phase: 'idle', error: '' }
  const opening = state.phase === 'opening'
  const errorLine = () => {
    switch (state.error) {
      case 'at_cap': return t('hold.errCap')
      case 'has_plan': return t('hold.errPlan')
      case 'unverified': return t('hold.errVerify')
      default: return t('hold.err')
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, alignItems: 'center' }}>
      <GhostButton
        C={C}
        onClick={opening ? undefined : () => ctx.hold('slot')}
        style={{ fontSize: SIZE.small }}
      >
        {opening ? t('hold.opening') : t('hold.slot', { price: t('paywall.price') })}
      </GhostButton>
      {ctx.planOn && !opening && (
        <GhostButton C={C} onClick={() => ctx.hold('steady')} style={{ fontSize: SIZE.small }}>
          {t('hold.plan', { price: t('paywall.subPrice') })}
        </GhostButton>
      )}
      {state.phase === 'error' ? (
        <Note C={C} align="center" tone="accent">{errorLine()}</Note>
      ) : (
        <Mono C={C} size={SIZE.micro} style={{ textAlign: 'center' }}>{t('hold.note')}</Mono>
      )}
    </div>
  )
}

export function FourthSlotScreen({ C, ctx }) {
  const { t } = useI18n()
  // The free door, plus the real Stripe door under it once that is turned on.
  // The sandbox's local preview of the checkout went with /demo (Q16); the
  // checkout itself is untouched, per Q3.
  return (
    <Shell>
      <ScreenHeader C={C} onBack={() => ctx.go('pings')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: SPACE.xl }}>
        {/* the slots, all held */}
        <SlotPips C={C} standing={ctx.slotsCap} cap={ctx.slotsCap} />
        <h1 className="enter" style={{ margin: 0, fontFamily: FONT.serif, fontWeight: 300, fontSize: SIZE.display, lineHeight: 0.98, letterSpacing: TRACK.title, color: C.cream }}>
          {t('fourth.title')}
        </h1>
        <p className="enter" style={{ animationDelay: '.08s', margin: 0, fontFamily: FONT.sans, fontWeight: 300, fontSize: SIZE.small, lineHeight: 1.65, color: C.muted, maxWidth: 320 }}>
          {t('fourth.body')}
        </p>
        {/* and the other way forward, with a date on it. A wall you can see the
            opening time of is scarcity; one you cannot is just a locked door,
            and this screen was the locked door. */}
        {ctx.nextSlot && (
          <p className="enter" style={{ animationDelay: '.14s', margin: 0, fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: TRACK.tick, color: rgba(C.star, 0.92), textShadow: ONSKY }}>
            {ctx.nextSlot.days === 0 ? t('fourth.opensSoon') : t('fourth.opens', { n: ctx.nextSlot.days })}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        <PrimaryButton C={C} onClick={() => ctx.go('pings')}>{t('fourth.cta')}</PrimaryButton>
        {ctx.billingOn ? (
          <HoldDoors C={C} ctx={ctx} />
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: SIZE.small }}>
              {t('fourth.back')}
            </GhostButton>
          </div>
        )}
      </div>
    </Shell>
  )
}

// ── COMING BACK FROM STRIPE (celestual.us/paid) ───────────────────────────────
// Stripe sends people here with the session id in the query. The webhook is what
// actually grants the slot (migration 0021); this screen asks the edge function
// to confirm the same session so a person who just paid sees it immediately
// rather than waiting on a delivery. The ask is idempotent, so both landing
// first is fine. `?c=1` means they backed out of the payment page: nothing was
// charged, and the free door is still right there.
export function PaidScreen({ C, ctx }) {
  const { t } = useI18n()
  const [phase, setPhase] = React.useState(ctx.paidReturn?.cancelled ? 'cancelled' : 'confirming')
  const [kind, setKind] = React.useState('slot')
  const asked = React.useRef(false)

  React.useEffect(() => {
    if (asked.current || phase !== 'confirming') return
    asked.current = true
    const session = ctx.paidReturn?.session || ''
    if (!session) {
      setPhase('slow')
      return
    }
    let live = true
    ctx.confirmPaid(session)
      .then((res) => {
        if (!live) return
        if (res?.ok && res.paid) {
          setKind(res.kind === 'steady' ? 'steady' : 'slot')
          setPhase('held')
        } else {
          setPhase('slow')
        }
      })
      .catch(() => live && setPhase('slow'))
    return () => {
      live = false
    }
  }, [phase, ctx])

  const title =
    phase === 'confirming' ? t('paid.confirming')
      : phase === 'cancelled' ? t('paid.cancelTitle')
        : phase === 'slow' ? t('paid.slowTitle')
          : kind === 'steady' ? t('paid.planTitle') : t('paid.title')
  const sub =
    phase === 'confirming' ? null
      : phase === 'cancelled' ? t('paid.cancelSub')
        : phase === 'slow' ? t('paid.slowSub')
          : kind === 'steady' ? t('paid.planSub') : t('paid.sub')

  return (
    <Shell>
      <ScreenHeader C={C} label={<Kicker C={C}>{t('paid.kicker')}</Kicker>} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: SPACE.xl }}>
        <div className={phase === 'held' ? 'enter floaty' : 'enter'}>
          <StarMark C={C} size={phase === 'held' ? 78 : 54} />
        </div>
        <Title C={C} as="h1" align="center" className="enter">{title}</Title>
        {sub && <Small C={C} align="center" className="enter" style={{ maxWidth: 300 }}>{sub}</Small>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        {phase === 'held' ? (
          <PrimaryButton C={C} onClick={() => ctx.placeAnother()}>{t('paid.place')}</PrimaryButton>
        ) : (
          <PrimaryButton C={C} onClick={() => ctx.go('pings')}>{t('paid.back')}</PrimaryButton>
        )}
        {phase === 'held' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GhostButton C={C} onClick={() => ctx.go('pings')} style={{ fontSize: SIZE.small }}>
              {t('paid.back')}
            </GhostButton>
          </div>
        )}
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
        style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: SPACE.sm, background: 'none', border: 'none', cursor: 'pointer', color: rgba(C.star, 0.9), fontFamily: FONT.sans, fontSize: SIZE.small }}
      >
        {t('accounts.add')}
      </button>
    )
  }
  return (
    <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
      <FieldLabel C={C} optional={t('accounts.optional')}>{t('accounts.label')}</FieldLabel>
      {ctx.altHandles.map((h) => (
        <div key={h} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm }}>
          <HandleChip C={C} handle={h} />
          <button
            onClick={() => ctx.removeAltHandle(h)}
            aria-label={t('accounts.remove')}
            style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'none', border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}
          >
            <Icon name="close" size={13} color="currentColor" />
          </button>
        </div>
      ))}
      {canAdd && (
        <div style={{ display: 'flex', gap: SPACE.sm, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field C={C} kind="handle" value={draft} onChange={setDraft} placeholder={t('accounts.placeholder')} onEnter={add} />
          </div>
          <OutlineButton C={C} onClick={add} style={{ flexShrink: 0 }}>{t('accounts.addBtn')}</OutlineButton>
        </div>
      )}
      {canAdd && <ResolvedHandle C={C} value={draft} style={{ padding: '0 2px' }} />}
      <Note C={C}>{t('accounts.note')}</Note>
    </div>
  )
}

// Communities are curated, so the account only SHOWS the ones you're in (join /
// leave lives on the community pages). A read-only summary + a way in.
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
  // PORTALLED TO <body>, and it has to be. The screen wrapper in App.jsx carries
  // `.fade`, whose keyframes end on `transform: translateY(0)` with fill-mode
  // `both` — so the transform never goes away, and a transformed ancestor is the
  // containing block for `position: fixed` descendants. `inset: 0` then resolves
  // to the WHOLE PAGE rather than the viewport: on a tall or scrolled screen the
  // sheet centres itself below the fold while its scrim still covers everything,
  // which is what makes this one hard to spot. Short screens hid it.
  return createPortal(
    <div
      onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 14px max(20px, env(safe-area-inset-bottom))', overflowY: 'auto' }}
    >
      <div className="scrim-in" aria-hidden style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.72) }} />
      <div
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('account.kicker')}
        tabIndex={-1}
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 410, margin: 'auto 0', background: rgba(C.ink2, 0.97), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '30px 26px 26px', display: 'flex', flexDirection: 'column', gap: SPACE.xxl, outline: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: SPACE.lg }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
              <Brandmark C={C} size={14} />
              <Kicker C={C}>{t('account.kicker')}</Kicker>
            </div>
            <div style={{ marginTop: 12, fontFamily: FONT.serif, fontSize: SIZE.display, lineHeight: 1.05, color: C.cream, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ color: C.star }}>@</span>{ctx.me || 'you'}
            </div>
            <div style={{ marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: SPACE.sm, fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: '.3px', color: ctx.verified ? rgba(C.star, 0.95) : C.muted }}>
              {ctx.verified ? t('account.verified') : t('account.localOnly')}
            </div>
          </div>
          <button onClick={close} aria-label={t('account.close')} style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'none', border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}>
            <Icon name="close" size={15} color="currentColor" />
          </button>
        </div>

        <Rule C={C} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
            <FieldLabel C={C}>{t('account.handleLabel')}</FieldLabel>
            <Field C={C} kind="handle" value={ctx.me} onChange={ctx.setMe} placeholder="your.handle" />
            <ResolvedHandle C={C} value={ctx.me} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
            <FieldLabel C={C} optional={t('account.emailOptional')}>{t('account.emailLabel')}</FieldLabel>
            <Field C={C} kind="email" value={ctx.email} onChange={ctx.setEmail} placeholder="you@email.com" />
          </div>
          <AccountsEditor C={C} ctx={ctx} />
        </div>

        <Rule C={C} />

        <Rule C={C} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.sm, color: standing ? C.cream : C.muted, fontFamily: FONT.mono, fontSize: SIZE.small }}>
              {standing > 0 && <Brandmark size={11} title="" />}{' '}
              {standing > 0 ? t('account.pingsLine', { n: standing }) : t('account.pingsNone')}
            </span>
            <GhostButton C={C} onClick={() => { close(); ctx.go('pings') }} style={{ padding: 0, fontSize: SIZE.small, color: C.star }}>
              {t('account.pingsOpen')}
            </GhostButton>
          </div>
          {/* the same reconciliation the ledger does, said here too: this number
              comes from the server, and if some of what it counts is not on this
              device the sheet says so rather than quietly overstating. */}
          {ctx.unaccounted > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md }}>
              <Mono C={C}>{t('account.pingsElsewhere', { n: ctx.unaccounted })}</Mono>
              <GhostButton
                C={C}
                onClick={ctx.restoreLedger}
                style={{ padding: 0, fontSize: SIZE.small }}
              >
                {ctx.ledgerState && ctx.ledgerState.phase === 'reading' ? t('pings.heldRestoring') : t('account.pingsRestore')}
              </GhostButton>
            </div>
          )}
        </div>

        <Rule C={C} />

        {!confirmDel ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.xl, flexWrap: 'wrap' }}>
              {ctx.verified && (
                <GhostButton C={C} onClick={ctx.signOut} style={{ padding: 0, fontSize: SIZE.small, color: C.cream }}>
                  {t('account.signOut')}
                </GhostButton>
              )}
              <GhostButton C={C} onClick={onDelete} style={{ padding: 0, fontSize: SIZE.small, color: rgba(C.muted, 0.9) }}>
                {t('account.delete')}
              </GhostButton>
            </div>
          </div>
        ) : (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
            <span style={{ fontSize: SIZE.small, lineHeight: 1.5, color: C.cream }}>{t('account.deleteConfirm')}</span>
            {/* The line that stops this being mistaken for the opt-out. Until
                0020 it WAS the opt-out, applied to your own @, and nobody
                tapping "delete everything" was asking to be barred for good. */}
            <span style={{ fontSize: SIZE.small, lineHeight: 1.5, color: C.muted }}>{t('account.deleteKeep')}</span>
            <div style={{ display: 'flex', gap: SPACE.xl, alignItems: 'center', flexWrap: 'wrap' }}>
              <GhostButton C={C} onClick={onDelete} style={{ padding: 0, fontSize: SIZE.small, color: C.star }}>
                {deleting ? t('account.deleting') : t('account.deleteYes')}
              </GhostButton>
              <GhostButton C={C} onClick={() => setConfirmDel(false)} style={{ padding: 0, fontSize: SIZE.small, color: C.muted }}>
                {t('account.cancel')}
              </GhostButton>
            </div>
            <span style={{ fontSize: SIZE.meta, lineHeight: 1.5, color: rgba(C.muted, 0.8) }}>
                {t('account.deleteOptOut')}{' '}
                <button
                  onClick={() => window.location.assign('/optout')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: C.muted, textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  {t('account.deleteOptOutLink')}
                </button>
            </span>
          </div>
        )}
      </div>
    </div>,
    document.body,
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
  const [phase, setPhase] = React.useState('starting') // starting | waiting | confirm | verified | expired | error
  const [token, setToken] = React.useState('')
  const [errCode, setErrCode] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  // The @ the DM actually authenticated, when it differs from the one typed — we
  // confirm before adopting it (migration 0012 adopts the DMing account; a stray
  // code from another account should never silently swap someone's identity).
  const [adopted, setAdopted] = React.useState('')
  // After a while stuck on "waiting", surface a self-serve way out (the DM can
  // be dropped by the relay; a fresh code re-runs the whole path).
  const [stuck, setStuck] = React.useState(false)
  const proofRef = React.useRef(null)
  const hashRef = React.useRef(null)
  const expiryRef = React.useRef(0)
  const startedAtRef = React.useRef(0)
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
      expiryRef.current = Date.now() + 30 * 60 * 1000
      setToken(String(Math.floor(100000 + Math.random() * 900000)))
      setPhase('waiting')
      return
    }
    try {
      const r = await startVerification(handle)
      proofRef.current = r.proof
      hashRef.current = r.proofHash
      expiryRef.current = Date.parse(r.expiresAt) || Date.now() + 10 * 60 * 1000
      startedAtRef.current = Date.now()
      savePending({ handle, token: r.token, proofHash: r.proofHash, proof: r.proof, expiresAt: r.expiresAt, startedAt: startedAtRef.current })
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
      startedAtRef.current = saved.startedAt || Date.now()
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
      const { status, handle: adoptedHandle } = await pollVerification(token, hashRef.current)
      if (status === 'verified') {
        stopPoll()
        clearPending()
        const proof = proofRef.current
        // The DM authenticated a real account (migration 0012). If that @ differs
        // from the one typed, pause on a confirm so a stray/guessed code from
        // another account can never silently swap identity; otherwise sail through.
        const a = adoptedHandle ? normHandle(adoptedHandle) : ''
        if (a && a !== normHandle(handle)) {
          setAdopted(a)
          setPhase('confirm')
        } else {
          setPhase('verified')
          doneRef.current = setTimeout(() => onVerified(proof, adoptedHandle), VERIFIED_HOLD_MS)
        }
      } else if (status === 'expired' || lapsed) {
        stopPoll()
        clearPending()
        setPhase('expired')
      }
      // There is no third branch any more. Until 0026 this is where the
      // twenty-second grace sat: past it the typed @ was admitted with no DM at
      // all, because the relay was dropping them. The relay works, so the only
      // thing that can finish a verification is the webhook saying who actually
      // sent the code — which is the only version of this that means anything.
      // A DM that genuinely never lands runs out the code's own clock and the
      // "get a fresh code" way out below, exactly like any other lapse.
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
  }, [phase, token, onVerified, demo, handle])

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

  // 'banned' is the suppressed-@ lockout (0018). It is the one error a fresh
  // code cannot fix, so it loses the retry button — offering one is what kept
  // people minting codes against a closed door.
  const errMsg =
    errCode === 'banned'
      ? t('verify.errBlocked')
      : errCode === 'rate_limited'
        ? t('verify.errRate')
        : errCode === 'busy'
          ? t('verify.errBusy')
          : t('verify.errGeneric')

  // PORTALLED TO <body>, and it has to be. The screen wrapper in App.jsx carries
  // `.fade`, whose keyframes end on `transform: translateY(0)` with fill-mode
  // `both` — so the transform never goes away, and a transformed ancestor is the
  // containing block for `position: fixed` descendants. `inset: 0` then resolves
  // to the WHOLE PAGE rather than the viewport: on a tall or scrolled screen the
  // sheet centres itself below the fold while its scrim still covers everything,
  // which is what makes this one hard to spot. Short screens hid it.
  return createPortal(
    <div
      onClick={dismiss}
      style={{ position: 'fixed', inset: 0, zIndex: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(20px, env(safe-area-inset-top)) 16px max(20px, env(safe-area-inset-bottom))', overflowY: 'auto' }}
    >
      <div className="scrim-in" aria-hidden style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.74) }} />
      <div
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('verify.title')}
        tabIndex={-1}
        className="readout-in"
        style={{ position: 'relative', width: '100%', maxWidth: 400, margin: 'auto', background: rgba(C.ink2, 0.98), border: `1px solid ${C.line}`, borderRadius: RADIUS.card, boxShadow: SHADOW.card, padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: SPACE.xl, outline: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.md }}>
          <span style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: '50%', background: rgba(C.star, 0.12), flexShrink: 0 }}>
            
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: SIZE.lead, color: C.cream, lineHeight: 1.1 }}>{t('verify.title')}</div>
            <div style={{ marginTop: 6 }}>
              <HandleChip C={C} handle={handle} />
            </div>
          </div>
          <button onClick={dismiss} aria-label={t('verify.cancel')} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: C.ink3, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}>
            <Icon name="close" size={14} color="currentColor" />
          </button>
        </div>

        {phase === 'confirm' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
            <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: SIZE.lead, color: C.cream }}>{t('verify.confirmTitle')}</div>
            <p style={{ margin: 0, fontSize: SIZE.small, lineHeight: 1.55, color: C.muted }}>{t('verify.confirmBody', { handle: adopted })}</p>
            <PrimaryButton C={C} onClick={() => { setPhase('verified'); doneRef.current = setTimeout(() => onVerified(proofRef.current, adopted), VERIFIED_HOLD_MS) }}>{t('verify.confirmYes', { handle: adopted })}</PrimaryButton>
            <GhostButton C={C} onClick={begin} style={{ fontSize: SIZE.small }}>{t('verify.confirmNo')}</GhostButton>
          </div>
        ) : phase === 'verified' ? (
          <div className="fade" role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.lg, padding: '26px 0 22px' }}>
            <span style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 66, height: 66 }}>
              <span aria-hidden className="v-ring" style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: `1.5px solid ${rgba(C.star, 0.6)}` }} />
              <span aria-hidden className="v-ring" style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: `1.5px solid ${rgba(C.star, 0.6)}`, animationDelay: '0.3s' }} />
              <span className="v-pop" style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 60, height: 60, borderRadius: '50%', background: rgba(C.ink3, 0.9), border: `1px solid ${rgba(C.star, 0.5)}`, boxShadow: LIGHT.spill(0.2) }}>
                <Icon name="check" size={30} color={C.star} stroke={2.4} />
              </span>
            </span>
            <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: SIZE.lead, color: C.cream }}>{t('verify.verified')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: '0.5px', color: rgba(C.star, 0.9) }}>
              <Sonar C={C} size={11} /> {t('verify.verifiedSub')}
            </div>
          </div>
        ) : phase === 'expired' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
            <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: SIZE.lead, color: C.cream }}>{t('verify.expiredTitle')}</div>
            <p style={{ margin: 0, fontSize: SIZE.small, lineHeight: 1.55, color: C.muted }}>{t('verify.expiredBody')}</p>
            <PrimaryButton C={C} onClick={begin}>{t('verify.regen')}</PrimaryButton>
          </div>
        ) : phase === 'error' ? (
          <div className="fade" style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
            <p style={{ margin: 0, fontSize: SIZE.body, lineHeight: 1.55, color: rgba(C.star, 0.95) }}>{errMsg}</p>
            {errCode === 'banned' ? (
              <PrimaryButton C={C} onClick={dismiss}>{t('verify.errBlockedAction')}</PrimaryButton>
            ) : (
              <PrimaryButton C={C} onClick={begin}>{t('verify.regen')}</PrimaryButton>
            )}
          </div>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: SIZE.small, lineHeight: 1.6, color: C.muted }}>{t('verify.sub')}</p>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.sm, padding: '16px 0', borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}>
              <Kicker C={C}>{t('verify.code')}</Kicker>
              {phase === 'starting' || !token ? (
                <span style={{ fontFamily: FONT.mono, fontSize: 38, letterSpacing: '10px', color: C.muted, paddingLeft: 10 }}>····</span>
              ) : (
                /* userSelect:'all' — one long-press/click selects the whole code,
                   so a blocked clipboard never strands anyone. */
                <span style={{ fontFamily: FONT.mono, fontSize: 31, fontWeight: 500, letterSpacing: '4px', color: C.star, paddingLeft: 4, textShadow: ONSKY, userSelect: 'all', WebkitUserSelect: 'all' }}>{dmCode(token)}</span>
              )}
            </div>

            <PrimaryButton C={C} disabled={phase === 'starting' || !token} onClick={copyAndOpen}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.md, justifyContent: 'center' }}>
                {copied ? t('verify.copied') : t('verify.copyOpen')}
              </span>
            </PrimaryButton>

            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
              {[t('verify.step1'), t('verify.step2', { ig: '@' + ig }), t('verify.step3')].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.md, color: C.muted, fontSize: SIZE.small, lineHeight: 1.5 }}>
                  <span style={{ display: 'grid', placeItems: 'center', width: 19, height: 19, borderRadius: '50%', flexShrink: 0, background: rgba(C.star, 0.12), color: C.star, fontFamily: FONT.mono, fontSize: SIZE.meta }}>{i + 1}</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>

            <div role="status" aria-live="polite" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACE.md, color: C.muted, fontSize: SIZE.small, fontFamily: FONT.mono }}>
              <Sonar C={C} size={12} /> {t('verify.waiting')}
            </div>

            {stuck && !demo && phase === 'waiting' && (
              <div className="fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, fontSize: SIZE.meta, color: C.muted }}>
                <span>{t('verify.stuckHint')}</span>
                <button
                  onClick={begin}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: C.star, fontSize: SIZE.meta, fontFamily: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
                >
                  {t('verify.stuckAction')}
                </button>
              </div>
            )}

            {demo && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: SIZE.meta, lineHeight: 1.5, color: rgba(C.star, 0.9) }}>{t('verify.demoNote')}</p>
            )}
            {!demo && inApp && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: SIZE.meta, lineHeight: 1.5, color: rgba(C.star, 0.9) }}>{t('verify.inApp')}</p>
            )}
            {!demo && !mobile && !inApp && (
              <p style={{ margin: 0, textAlign: 'center', fontSize: SIZE.meta, lineHeight: 1.5, color: C.muted }}>{t('verify.desktop')}</p>
            )}

            <p style={{ margin: 0, textAlign: 'center', fontSize: SIZE.meta, lineHeight: 1.5, color: C.muted }}>{t('verify.tosNote')}</p>
          </>
        )}
      </div>
    </div>,
    document.body,
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