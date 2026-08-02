// beta/index.jsx — /beta, the star & card system.
//
// A parallel app, mounted instead of App.jsx when the path is /beta (see
// main.jsx). It shares the theme, the primitives and the sky engine with
// production and shares nothing else: no ping RPCs, no Supabase, no
// `celestual:v2` storage key, no identity flow. Nothing in here can change
// anything the live site does.
//
// The five screens are the plan's flow (§3), minus the parts it puts later in
// the build order:
//
//   sky      your cards, as stars. Tapping one flies to it and it resolves.
//   who      their @, echoed back before anything is committed to it.
//   compose  the card, composed in the layout it will keep.
//   sendoff  it appears once, whole, then shrinks and joins the sky.
//   placed   sealed. Their side shows nothing.
//   spread   the mutual: the binary, and both cards unsealing together.
//
// The response card (§3, "response — one card each") is deliberately not here.
// It is build-order #5 in the plan's own §6 — "the most build for the least
// reach" — and the reveal has to be right before the thing after the reveal is
// worth building.
import * as React from 'react'
import { makeColors } from '../theme.js'
import {
  rgba, SPACE, FONT, SIZE, TRACK, PrimaryButton, GhostButton, Field, Kicker, Small, Display, ScreenHeader,
} from '../components/ui.jsx'
import { Shell } from '../components/screens.jsx'
import { normHandle, isValidHandle } from '../api/celestual.js'
import { SENDOFF_SECONDS } from '../galaxy.js'
import { BetaSky, StarField, StarCard, fullSize } from './Sky.jsx'
import Composer from './Composer.jsx'
import Spread from './Spread.jsx'
import Card from './Disc.jsx'
import { makeCard, stamp } from './model.js'
import * as store from './store.js'
import { shareCard } from './share.js'
import { demoPhoto, SAMPLES } from './samples.js'

// ── the photographs, as URLs ─────────────────────────────────────────────────
// Blobs live in IndexedDB; the disc needs strings. This resolves the ones the
// current card list references and hands back a map, minting each URL once (the
// store caches them) so a resolve running at sixty frames a second is not
// minting sixty object URLs a second.
function usePhotoUrls(cards) {
  const [urls, setUrls] = React.useState({})
  React.useEffect(() => {
    let live = true
    const want = cards.map((c) => c.photoId).filter(Boolean)
    Promise.all(want.map((id) => store.photoUrl(id).then((u) => [id, u])))
      .then((pairs) => {
        if (!live) return
        const next = {}
        for (const [id, u] of pairs) if (u) next[id] = u
        setUrls((prev) => {
          // only commit when something actually changed, or this sets state on
          // every render of a list that has not moved
          const same = Object.keys(next).length === Object.keys(prev).length && Object.keys(next).every((k) => prev[k] === next[k])
          return same ? prev : next
        })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [cards])
  React.useEffect(() => () => store.releaseUrls(), [])
  return urls
}

// ── the send-off ─────────────────────────────────────────────────────────────
// The card appears once, whole, and then it shrinks and launches (§3.5). It is
// the resolve run backwards at speed: the disc contracts to a point, and the
// galaxy's own send-off flight takes that point into the disk. The two are
// pinned to the same origin, so there is no seam between the DOM gesture and
// the sky's.
function Launch({ C, card, url, geom }) {
  const [gone, setGone] = React.useState(false)
  React.useEffect(() => {
    const id = setTimeout(() => setGone(true), 60)
    return () => clearTimeout(id)
  }, [])
  const size = geom ? geom.size : fullSize()
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 8, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: (geom ? geom.cx : window.innerWidth / 2) - size / 2,
          top: (geom ? geom.cy : window.innerHeight * 0.4) - size / 2,
          width: size, height: size,
          transformOrigin: 'center',
          transform: gone ? 'scale(0.015)' : 'scale(1)',
          opacity: gone ? 0 : 1,
          filter: gone ? 'blur(6px)' : 'blur(0px)',
          transition: 'transform 1.05s cubic-bezier(.7,0,.25,1), opacity .95s ease .1s, filter .9s ease',
        }}
      >
        <Card C={C} card={card} url={url} size={size} glow={1.6} />
      </div>
    </div>
  )
}

export default function BetaApp() {
  const C = React.useMemo(() => makeColors(), [])
  const [state, setState] = React.useState(() => store.load())
  const cards = state.cards
  const urls = usePhotoUrls(cards)

  const [screen, setScreen] = React.useState(() => (store.load().cards.length ? 'sky' : 'open'))
  const [them, setThem] = React.useState('')
  const [error, setError] = React.useState('')
  const [open, setOpen] = React.useState(null) // { index } while a card is resolved
  const [launch, setLaunch] = React.useState(null) // { card, url, geom } during the send-off
  const [galaxyMode, setGalaxyMode] = React.useState('idle')
  const [origin, setOrigin] = React.useState(null)
  const [spread, setSpread] = React.useState(null) // { yours, theirs }
  const field = React.useRef(null)
  const timers = React.useRef([])

  React.useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }

  const commit = React.useCallback((next) => {
    setState(next)
    store.save(next)
  }, [])

  // ── seeding ────────────────────────────────────────────────────────────────
  // Three cards on a first visit, so the sky has something in it and the claim
  // in §2 (that these images composite into one work) can actually be looked at.
  //
  // Deliberately NOT cancelled on unmount. StrictMode runs an effect, tears it
  // down and runs it again on the same instance, so a `live` flag here would be
  // flipped false by the first teardown while the first run's async work was
  // still drawing frames — and the second run, blocked by the ref guard, would
  // never start another. The seed would silently never arrive, which is exactly
  // what happened. The write is idempotent and the guard is a ref, so letting
  // it finish is both correct and the simpler thing.
  const seeded = React.useRef(false)
  React.useEffect(() => {
    if (seeded.current || cards.length) return
    seeded.current = true
    ;(async () => {
      const shot = await demoPhoto()
      const made = []
      for (let i = 0; i < SAMPLES.length; i++) {
        const { photo, ...rest } = SAMPLES[i]
        const card = makeCard(rest)
        // the one photographed card, if the image is installed; otherwise it
        // keeps its plate and the sky is a card short of a photograph, not a
        // card short
        if (photo && shot) {
          card.photoId = card.id
          card.tone = shot.tone
          await store.putPhoto(card.id, shot.blob)
        }
        card.placed = Date.now() - (i + 1) * 86400000 * 3
        made.push(card)
      }
      commit({ cards: made, me: '' })
      setScreen('sky')
    })()
  }, [cards.length, commit])

  // ── the flow ───────────────────────────────────────────────────────────────
  const startPing = () => {
    setThem('')
    setError('')
    setScreen('who')
  }

  const confirmHandle = () => {
    if (!isValidHandle(them)) {
      // A typo here is otherwise a permanent, silent, un-diagnosable dead end
      // (§4, identity & matching): the ping resolves to nobody and nothing in
      // the product can ever say so. So the @ is echoed back and confirmed on
      // screen before anything is committed to it.
      setError('that is not an instagram handle.')
      return
    }
    setError('')
    setScreen('compose')
  }

  const place = React.useCallback(
    async ({ words, bg, face, pos, blob, tone }) => {
      const card = makeCard({ handle: normHandle(them), words, bg, face, pos, tone })
      let url = null
      if (blob) {
        card.photoId = card.id
        await store.putPhoto(card.id, blob)
        url = await store.photoUrl(card.id)
      }
      const next = { ...state, cards: [...state.cards, card] }
      commit(next)

      // where the disc is, so the shrink and the galaxy's flight share a point
      const size = Math.min(320, Math.round(Math.min(window.innerWidth * 0.8, window.innerHeight * 0.4)))
      const cx = window.innerWidth / 2
      const cy = window.innerHeight * 0.38
      setLaunch({ card, url, geom: { cx, cy, size } })
      setOrigin({ x: cx / window.innerWidth, y: cy / window.innerHeight })
      setGalaxyMode('sendoff')
      setScreen('sendoff')

      // The flight reports its own arrival; the timer is only the deadline, for
      // a backgrounded tab or a lost GPU context. Same reasoning as App.jsx.
      const done = () => {
        setGalaxyMode('idle')
        setLaunch(null)
        setScreen('placed')
      }
      const f = field.current
      if (f) f.onSendoffDone = done
      later(() => {
        if (f) f.onSendoffDone = null
        done()
      }, SENDOFF_SECONDS * 1000 + 3000)
      later(() => setLaunch(null), 1600)
    },
    [them, state, commit],
  )

  // ── the approach ───────────────────────────────────────────────────────────
  const openCard = React.useCallback((i) => {
    const f = field.current
    if (!f || !f.focusStar) return
    f.focusStar(i, { hold: true })
    setOpen({ index: i })
  }, [])

  const closeCard = React.useCallback(() => {
    const f = field.current
    if (f && f.clearFocus) f.clearFocus()
    setOpen(null)
  }, [])

  // ── the mutual ─────────────────────────────────────────────────────────────
  // There is no server here, so a match cannot arrive on its own. It is
  // triggered from the card's own screen, and what plays afterwards is exactly
  // what would play if one had.
  const runMutual = React.useCallback(
    (card) => {
      // their half. In production this arrives from the server at the instant
      // both sides exist and never one moment before.
      const theirs = {
        id: `${card.id}-r`,
        handle: card.handle,
        words: 'i thought about messaging you a hundred times',
        bg: 'rose',
        face: 'serif',
        tone: 0,
        placed: Date.now(),
      }
      const next = {
        ...state,
        cards: state.cards.map((c) => (c.id === card.id ? { ...c, mutual: true } : c)),
      }
      commit(next)
      closeCard()
      setSpread({ yours: { ...card, mutual: true }, theirs })
      setGalaxyMode('match')
      setScreen('spread')
    },
    [state, commit, closeCard],
  )

  const leaveSpread = React.useCallback(() => {
    setGalaxyMode('idle')
    setSpread(null)
    setScreen('sky')
  }, [])

  const say = React.useCallback((handle) => {
    const h = normHandle(handle)
    if (!h) return
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')
    const url = mobile ? `https://ig.me/m/${h}` : `https://www.instagram.com/m/${h}`
    try {
      const w = window.open(url, '_blank', 'noopener,noreferrer')
      if (!w) window.location.href = url
    } catch {
      window.location.href = url
    }
  }, [])

  const openCardData = open ? cards[open.index] : null
  const skyDim = screen === 'sky' || screen === 'open' ? 1 : screen === 'spread' ? 1 : 0.5

  return (
    <div className="celestual-app">
      <BetaSky C={C} cards={cards} mode={galaxyMode} dim={skyDim} origin={origin} fieldRef={field} />

      {/* taps reach the sky only where the sky is the screen */}
      {screen === 'sky' && !open && <StarField fieldRef={field} onPick={openCard} />}

      {open && (
        <StarCard
          C={C}
          card={openCardData}
          url={openCardData && urls[openCardData.photoId]}
          index={open.index}
          open={!!open}
          fieldRef={field}
          onClose={closeCard}
        />
      )}

      {launch && <Launch C={C} card={launch.card} url={launch.url} geom={launch.geom} />}

      {/* the card's one action, resting under it once it has resolved */}
      {open && openCardData && !openCardData.mutual && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'max(28px, env(safe-area-inset-bottom))', zIndex: 6, display: 'flex', justifyContent: 'center' }}>
          <GhostButton C={C} onClick={() => runMutual(openCardData)} style={{ fontSize: SIZE.meta }}>
            beta: they enter you back
          </GhostButton>
        </div>
      )}

      {/* During an approach the foreground melts away COMPLETELY, so the sky is
          the whole screen. The entrance animation has to be suppressed to do
          it: `.fade` uses fill-mode `both`, which pins opacity at 1 after the
          keyframes finish and silently wins against the inline value. App.jsx
          hit exactly this and left the note; this is the same trap. */}
      <div
        key={screen}
        className="fade"
        style={{
          position: 'relative', zIndex: 4,
          animation: open ? 'none' : undefined,
          opacity: open ? 0 : 1,
          pointerEvents: open ? 'none' : 'auto',
          transition: 'opacity .5s ease',
        }}
      >
        {screen === 'open' && <OpenScreen C={C} onStart={startPing} />}

        {screen === 'sky' && (
          <SkyScreen C={C} cards={cards} urls={urls} onStart={startPing} onPick={openCard} />
        )}

        {screen === 'who' && (
          <WhoScreen C={C} value={them} onChange={setThem} error={error} onNext={confirmHandle} onBack={() => setScreen(cards.length ? 'sky' : 'open')} />
        )}

        {screen === 'compose' && (
          <Shell>
            {/* no label: the card's own rim already carries the @, and a
                header repeating it is the same fact stated twice on one screen */}
            <ScreenHeader C={C} onBack={() => setScreen('who')} />
            <div style={{ flex: 1, display: 'flex', paddingTop: SPACE.xl }}>
              <Composer C={C} handle={normHandle(them)} onPlace={place} onBack={() => setScreen('who')} />
            </div>
          </Shell>
        )}

        {screen === 'sendoff' && (
          <Shell>
            <div style={{ flex: 1 }} />
            <div className="sendoff-line" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: SPACE.md, paddingBottom: 'clamp(24px, 12vh, 90px)' }}>
              <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: SIZE.title, color: C.cream }}>sending it into the dark.</div>
              <div style={{ fontSize: SIZE.small, color: C.muted, fontFamily: FONT.mono, letterSpacing: '.5px' }}>nobody is told anything.</div>
            </div>
            <div style={{ flex: 1 }} />
          </Shell>
        )}

        {screen === 'placed' && <PlacedScreen C={C} handle={normHandle(them)} onDone={() => setScreen('sky')} />}
      </div>

      {screen === 'spread' && spread && (
        <div style={{ position: 'relative', zIndex: 4 }}>
          <Spread
            C={C}
            yours={spread.yours}
            theirs={spread.theirs}
            yourUrl={urls[spread.yours.photoId]}
            fieldRef={field}
            onSay={() => say(spread.yours.handle)}
            onShare={() => shareCard({ card: spread.yours, photoUrl: urls[spread.yours.photoId], mutual: true })}
            onBack={leaveSpread}
          />
        </div>
      )}
    </div>
  )
}

// ── the screens ──────────────────────────────────────────────────────────────

function OpenScreen({ C, onStart }) {
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl }}>
        <Kicker C={C} micro>beta</Kicker>
        <Display C={C}>
          you still think about them.
          <br />
          <span style={{ color: C.star }}>say one small thing.</span>
        </Display>
        <Small C={C} color={C.muted}>sealed until you both enter each other.</Small>
      </div>
      <PrimaryButton C={C} onClick={onStart}>place a ping</PrimaryButton>
    </Shell>
  )
}

// The hub. The sky IS the page: the cards are out there as stars and the list
// under them is a way in, not a duplicate of the sky. Tapping either flies.
function SkyScreen({ C, cards, urls, onStart, onPick }) {
  return (
    <Shell>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
        <Kicker C={C} micro>
          {cards.length} {cards.length === 1 ? 'card' : 'cards'} · sealed
        </Kicker>
        <div style={{ display: 'flex', gap: SPACE.md, overflowX: 'auto', paddingBottom: SPACE.sm }}>
          {cards.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(i)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
              aria-label={`open the card for @${c.handle}`}
            >
              <Card C={C} card={c} url={urls[c.photoId]} size={68} glow={0.7} />
            </button>
          ))}
        </div>
        <PrimaryButton C={C} onClick={onStart}>place a ping</PrimaryButton>
      </div>
    </Shell>
  )
}

function WhoScreen({ C, value, onChange, error, onNext, onBack }) {
  const clean = normHandle(value)
  return (
    <Shell>
      <ScreenHeader C={C} onBack={onBack} label="who" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl }}>
        <Display C={C}>who are you thinking about?</Display>
        <Field C={C} kind="handle" value={value} onChange={onChange} placeholder="their instagram" autoFocus onEnter={onNext} />
        {/* The echo, and the button under it is the question. It is the only
            defence against a typo that would otherwise leave a card standing
            forever, addressed to nobody. */}
        {clean && !error && (
          <div style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: SIZE.title, color: C.star, letterSpacing: '.5px' }}>
            @{clean}
          </div>
        )}
        {error && <Small C={C} align="center" color={C.star}>{error}</Small>}
      </div>
      <PrimaryButton C={C} disabled={!clean} onClick={onNext}>yes, that is them</PrimaryButton>
    </Shell>
  )
}

function PlacedScreen({ C, handle, onDone }) {
  return (
    <Shell>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACE.xl, textAlign: 'center', alignItems: 'center' }}>
        <Display C={C} align="center">it’s in the sky.</Display>
        <Small C={C} align="center" color={C.muted}>
          @{handle} is told nothing. if they enter you, you both find out in the same second.
        </Small>
        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.micro, letterSpacing: TRACK.micro, textTransform: 'uppercase', color: rgba(C.muted, 0.8) }}>
          {stamp(Date.now())} · sealed
        </span>
      </div>
      <PrimaryButton C={C} onClick={onDone}>your sky</PrimaryButton>
    </Shell>
  )
}
