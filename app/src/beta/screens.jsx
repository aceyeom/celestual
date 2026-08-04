// beta/screens.jsx — the seven pages and the specimen.
//
// The minimum set that lets the whole brand be judged: the title page, the
// send, the card, the flight, the truth, the status page, the reveal. Plus the
// plate, which is the specimen sheet the system itself can be read off.
//
// What is deliberately different from the production screens, structurally,
// before a single colour is considered:
//
//   NOTHING IS CENTRED. Every page hangs off the spine on the left. A centred
//   stack of a headline, a subhead and a full-width button is the shape of
//   every landing page ever generated, and no palette survives it.
//
//   ONE OBJECT PER PAGE. The send is a slip. The card is a seal. The status
//   page is a ledger. Each page has a thing on it that you could pick up,
//   rather than three cards in a row explaining features.
//
//   THE PAGE ADMITS WHAT IT IS. Form numbers, plate marks, a set line at the
//   foot. Printed matter tells you it was printed, and that is most of why it
//   feels like it was made by somebody.

import { useEffect, useState } from 'react'
import {
  C, TEXT, LINE, FONT, SIZE, TRACK, R, S, LIGHT, MEASURE,
  GROUNDS, FACES, MAX_WORDS, wordCount, clampWords,
  rgba, normHandle, isValidHandle, stamp, daysLeft,
} from './tokens.js'
import { leatherSurface, paperSurface, chalkSurface, groundSurface, stitching } from './texture.js'
import {
  Column, Title, Lead, Body, Small, Label, Tick, Rule, useNarrow,
  Reticle, Wordmark, Panel, Leaf, Plate, Quiet, Ruled, Seal, Mark, Head, Slots, Swatches,
} from './ui.jsx'

// The three grounds, as pickable materials.
const GROUND_ITEMS = GROUNDS.map((g) => ({ id: g.id, name: g.name, surface: groundSurface(g, { scale: 60 }) }))

// ── 1 · the title page ───────────────────────────────────────────────────────
export function OpenScreen({ ctx }) {
  return (
    <Column>
      <div style={{ marginBottom: S.xl }}>
        <Label>the double blind</Label>
      </div>

      <h1 style={{ margin: 0 }}>
        <span
          style={{
            display: 'block',
            fontFamily: FONT.serif,
            fontWeight: 300,
            fontSize: SIZE.colophon,
            lineHeight: 0.92,
            letterSpacing: '-0.02em',
            color: C.ivory,
          }}
        >
          someone is
          <br />
          on your mind.
        </span>
        <span
          style={{
            display: 'block',
            marginTop: 10,
            fontFamily: FONT.serif,
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: SIZE.colophon,
            lineHeight: 0.94,
            letterSpacing: '-0.018em',
            color: C.caramel,
          }}
        >
          are you on theirs?
        </span>
      </h1>

      <Rule style={{ margin: `${S.xl}px 0 ${S.lg}px`, width: 132 }} />

      <Body quiet style={{ maxWidth: 428 }}>
        enter their @. they are never told, and they never can be. if they enter
        yours, you both find out in the same second. if they never do, nothing
        happened.
      </Body>

      <div style={{ display: 'flex', alignItems: 'center', gap: S.xl, marginTop: S.xl, flexWrap: 'wrap' }}>
        <Plate onClick={() => ctx.go('send')}>find out</Plate>
        <Quiet onClick={() => ctx.go('pings')}>i have been here before</Quiet>
      </div>

      {/* one string, not three chips with separators between them: a separator
          that is its own element orphans at the start of a wrapped line */}
      <div style={{ marginTop: S.xxl, maxWidth: 420 }}>
        <Tick style={{ lineHeight: 1.9 }}>no profiles · no browsing · three pings, sixty days each</Tick>
      </div>
    </Column>
  )
}

// ── 2 · the send ─────────────────────────────────────────────────────────────
// One slip of paper, laid on the case at half a degree, with a printed caption
// and a line to write on. The form number in the corner is not a joke: printed
// matter carries its own plate mark, and it is the detail that makes the object
// read as issued rather than rendered.
export function SendScreen({ ctx }) {
  const [v, setV] = useState(ctx.them || '')
  const ok = isValidHandle(v) && normHandle(v) !== normHandle(ctx.me)
  const submit = () => {
    if (!ok) return
    ctx.setThem(normHandle(v))
    ctx.go('write')
  }
  return (
    <Column>
      <Head kicker="the send" onBack={() => ctx.go('open')} right={<Slots used={ctx.standing} cap={3} />} />

      <Title style={{ maxWidth: 420 }}>
        who is
        <br />
        <em style={{ fontStyle: 'italic', color: C.caramel }}>on your mind?</em>
      </Title>

      <Leaf className="leaf-in" style={{ marginTop: S.xl, padding: `${S.lg}px ${S.lg}px ${S.md}px`, transform: 'rotate(-0.45deg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: S.md }}>
          <Tick tone="ink" style={{ color: rgba(C.ink, 0.4) }}>form 01</Tick>
          <Tick tone="ink" style={{ color: rgba(C.ink, 0.4) }}>double blind</Tick>
        </div>
        <Ruled
          label="their instagram"
          value={v}
          onChange={setV}
          onEnter={submit}
          placeholder="handle"
          autoFocus
          big
        />
        <p
          style={{
            fontFamily: FONT.sans,
            fontWeight: 300,
            fontSize: 12.5,
            lineHeight: 1.62,
            color: rgba(C.ink, 0.56),
            marginTop: S.md,
            maxWidth: 340,
          }}
        >
          no alert. no trace. the server keeps this as a hash, so there is
          nothing to leak and nothing to subpoena.
        </p>
      </Leaf>

      {ctx.error && (
        <Small style={{ marginTop: S.md, color: C.wheat }}>{ctx.error}</Small>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: S.xl, marginTop: S.xl, flexWrap: 'wrap' }}>
        <Plate onClick={submit} disabled={!ok}>
          write the card
        </Plate>
        <Tick>{ctx.standing} of 3 slots held</Tick>
      </div>
    </Column>
  )
}

// ── 3 · the card ─────────────────────────────────────────────────────────────
// The one place the product asks a person to make something, so it is the one
// place with more than a single control. Three materials, three hands, twenty
// words. Everything else about the composition is derived, exactly as it is in
// production: nobody is asked to choose an alignment or a size.
const SEEDS = [
  'you always took the window seat',
  'you laughed a beat late, every time',
  'we said we would be roommates',
]

export function WriteScreen({ ctx }) {
  const [words, setWords] = useState('')
  const [ground, setGround] = useState('leaf')
  const [face, setFace] = useState('hand')
  const narrow = useNarrow()
  const n = wordCount(words)
  const over = n > MAX_WORDS
  const ready = n > 0 && !over

  const card = { handle: ctx.them, words: clampWords(words), ground, face, placed: Date.now() }

  return (
    <Column wide>
      <Head kicker="the card" onBack={() => ctx.go('send')} right={<Tick>for @{ctx.them}</Tick>} />

      <div style={{ display: 'flex', gap: S.xxl, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* the seal, as it will be struck */}
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: S.md }}>
          <Seal key={ground} card={card} size={narrow ? 190 : 252} className="seal-set" />
          <Tick>the seal, as they will see it</Tick>
        </div>

        {/* the writing */}
        <div style={{ flex: '1 1 300px', minWidth: 280, maxWidth: MEASURE }}>
          <Leaf style={{ padding: S.lg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: S.md }}>
              <Label tone="ink" style={{ color: rgba(C.ink, 0.5) }}>the message</Label>
              <Tick tone="ink" style={{ color: over ? '#8A2B12' : rgba(C.ink, 0.45) }}>
                {n} / {MAX_WORDS} words
              </Tick>
            </div>
            <textarea
              className="ph-ink"
              value={words}
              onChange={(e) => setWords(e.target.value)}
              rows={4}
              placeholder="the small thing you still remember"
              spellCheck={false}
              style={{
                width: '100%',
                border: 0,
                outline: 'none',
                resize: 'none',
                background: `repeating-linear-gradient(180deg, transparent 0 27px, ${rgba(C.ink, 0.13)} 27px 28px)`,
                fontFamily: FONT.serif,
                fontStyle: 'italic',
                fontWeight: 400,
                fontSize: 21,
                lineHeight: '28px',
                color: C.ink,
                caretColor: C.ink,
                padding: 0,
              }}
            />
            <div style={{ marginTop: S.md, display: 'flex', flexWrap: 'wrap', gap: S.sm }}>
              {SEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setWords(s)}
                  style={{
                    fontFamily: FONT.sans,
                    fontWeight: 300,
                    fontSize: 11.5,
                    color: rgba(C.ink, 0.62),
                    padding: '5px 9px',
                    borderRadius: 1,
                    border: `1px solid ${rgba(C.ink, 0.16)}`,
                    background: rgba(C.ink, 0.03),
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </Leaf>

          <div style={{ marginTop: S.xl }}>
            <Label style={{ marginBottom: S.md }}>the ground</Label>
            <Swatches items={GROUND_ITEMS} value={ground} onChange={setGround} size={52} />
          </div>

          <div style={{ marginTop: S.xl }}>
            <Label style={{ marginBottom: S.md }}>the hand</Label>
            <div style={{ display: 'flex', gap: S.md, flexWrap: 'wrap' }}>
              {FACES.map((f) => {
                const on = f.id === face
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFace(f.id)}
                    style={{
                      padding: '11px 15px',
                      borderRadius: R.press,
                      border: `1px solid ${on ? rgba(C.caramel, 0.75) : rgba(C.ivory, 0.14)}`,
                      background: on ? rgba(C.caramel, 0.09) : 'transparent',
                      color: on ? C.ivory : TEXT.quiet,
                      textAlign: 'left',
                      transition: 'border-color .16s linear, background .16s linear',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        fontFamily: f.family,
                        fontStyle: f.style,
                        fontWeight: f.weight,
                        fontSize: 17,
                        letterSpacing: f.track,
                        textTransform: f.transform,
                        lineHeight: 1.1,
                      }}
                    >
                      still here
                    </span>
                    <span
                      style={{
                        display: 'block',
                        marginTop: 6,
                        fontFamily: FONT.sans,
                        fontSize: 9.5,
                        letterSpacing: TRACK.label,
                        textTransform: 'uppercase',
                        color: on ? C.caramel : TEXT.faint,
                      }}
                    >
                      {f.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: S.xl, marginTop: S.xl, flexWrap: 'wrap' }}>
            <Plate onClick={() => ctx.place(card)} disabled={!ready}>
              seal it
            </Plate>
            <Small style={{ maxWidth: 260 }}>
              sealed the way the ping is. it opens only if they enter you back.
            </Small>
          </div>
        </div>
      </div>
    </Column>
  )
}

// ── 4 · the flight ───────────────────────────────────────────────────────────
// Almost nothing on screen, because the screen is not the point: the chart is
// doing the work behind it. One line, set once, and it does not move.
export function FlightScreen() {
  return (
    <Column>
      <div style={{ opacity: 0.9 }}>
        <Label>placing</Label>
        <Lead style={{ marginTop: S.md, fontSize: 26 }}>it is going out into the field.</Lead>
      </div>
    </Column>
  )
}

// ── 5 · the truth ────────────────────────────────────────────────────────────
// The recruiter screen. The moment a ping lands, the person is told exactly
// what is true and nothing more, which is the whole legal and ethical margin
// this product lives inside.
export function PlacedScreen({ ctx }) {
  const p = ctx.last
  if (!p) return <Column><Body>nothing placed.</Body></Column>
  const standing = p.state === 'standing'
  return (
    <Column>
      <Head kicker="placed" right={<Tick>{stamp(p.placed)}</Tick>} />

      <Title style={{ maxWidth: 460 }}>
        {standing ? (
          <>
            your ping is <em style={{ fontStyle: 'italic', color: C.caramel }}>standing.</em>
          </>
        ) : (
          <>
            <em style={{ fontStyle: 'italic' }}>@{p.handle}</em> is not here yet.
          </>
        )}
      </Title>

      <Body quiet style={{ marginTop: S.lg, maxWidth: 440 }}>
        {standing
          ? 'they are reachable on celestual. the second they enter you back, you both know. until then nothing about you is visible to them or to anyone.'
          : 'your ping is held, unseen, until they arrive. they will never know it was you who was waiting, because the server does not know either.'}
      </Body>

      <Panel style={{ marginTop: S.xl, padding: S.lg, maxWidth: 440 }}>
        <div style={{ display: 'flex', gap: S.lg, alignItems: 'center' }}>
          <Seal card={p.card} size={82} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: S.sm }}>
              <Mark state={p.state} />
              <Label tone="read">{standing ? 'standing' : 'waiting'}</Label>
            </div>
            <div style={{ marginTop: 7, fontFamily: FONT.mono, fontSize: 15, color: C.ivory, letterSpacing: '0.02em' }}>
              @{p.handle}
            </div>
            <Tick style={{ display: 'block', marginTop: 6 }}>{daysLeft(p.expires)} days, then it lapses</Tick>
          </div>
        </div>
      </Panel>

      <div style={{ display: 'flex', alignItems: 'center', gap: S.xl, marginTop: S.xl, flexWrap: 'wrap' }}>
        <Plate onClick={() => ctx.go('pings')}>your pings</Plate>
        <Quiet onClick={() => ctx.go('send')}>place another</Quiet>
      </div>
    </Column>
  )
}

// ── 6 · the ledger ───────────────────────────────────────────────────────────
// The status page, and it is a ledger: ruled entries, one to a line, each with
// its seal in the margin the way a bound book carries a tipped-in plate. The
// empty slot is a real empty slot, cut into the leather, so three is a fact you
// can see rather than a number you are told.
function Entry({ p, ctx }) {
  const [strain, setStrain] = useState(false)
  const mutual = p.state === 'mutual'
  useEffect(() => {
    if (!mutual || p.opened) return
    const id = setInterval(() => {
      setStrain(true)
      setTimeout(() => setStrain(false), 900)
    }, 5200)
    return () => clearInterval(id)
  }, [mutual, p.opened])

  const days = daysLeft(p.expires)
  return (
    <div
      style={{
        display: 'flex',
        gap: S.lg,
        alignItems: 'center',
        padding: `${S.lg}px 0`,
        borderBottom: `1px solid ${LINE.faint}`,
      }}
    >
      <div className={strain ? 'strain' : ''} style={{ flex: '0 0 auto' }}>
        <Seal card={p.card} size={88} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: S.sm, marginBottom: 6 }}>
          <Mark state={p.state} />
          <Label tone={mutual ? 'lit' : 'quiet'}>{mutual ? 'mutual' : p.state === 'standing' ? 'standing' : 'not here yet'}</Label>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 15, color: C.ivory, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          @{p.handle}
        </div>
        <div style={{ marginTop: 7, display: 'flex', gap: S.md, alignItems: 'center', flexWrap: 'wrap' }}>
          {mutual ? (
            <Tick tone="lit">you entered each other</Tick>
          ) : (
            <>
              <Tick>{days <= 0 ? 'lapses today' : `${days} days left`}</Tick>
              <button type="button" onClick={() => ctx.renew(p.handle)} style={{ fontFamily: FONT.sans, fontSize: 11.5, letterSpacing: '0.04em', color: TEXT.quiet, borderBottom: `1px solid ${rgba(C.ivory, 0.2)}`, paddingBottom: 1 }}>
                renew
              </button>
              <button type="button" onClick={() => ctx.letGo(p.handle)} style={{ fontFamily: FONT.sans, fontSize: 11.5, letterSpacing: '0.04em', color: TEXT.faint, borderBottom: `1px solid ${rgba(C.ivory, 0.12)}`, paddingBottom: 1 }}>
                let it go
              </button>
            </>
          )}
        </div>
      </div>

      {mutual && (
        <Plate tone="leather" onClick={() => ctx.open(p.handle)} style={{ flex: '0 0 auto', padding: '13px 20px' }}>
          {p.opened ? 'see it again' : 'open it'}
        </Plate>
      )}
    </div>
  )
}

function EmptySlot({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: S.lg,
        width: '100%',
        textAlign: 'left',
        padding: `${S.lg}px 0`,
        borderBottom: `1px solid ${LINE.faint}`,
      }}
    >
      <span
        style={{
          flex: '0 0 auto',
          width: 88,
          height: 88,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px dashed ${rgba(C.ivory, 0.18)}`,
          boxShadow: LIGHT.well,
        }}
      >
        <Reticle size={24} a={0.34} />
      </span>
      <span>
        <Label>open slot</Label>
        <span style={{ display: 'block', marginTop: 7, fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 19, color: rgba(C.ivory, 0.62) }}>
          there is room for one more.
        </span>
      </span>
    </button>
  )
}

export function PingsScreen({ ctx }) {
  const cap = 3
  const empty = Math.max(0, cap - ctx.pings.length)
  return (
    <Column>
      <Head kicker="your pings" onBack={() => ctx.go('open')} right={<Slots used={ctx.pings.length} cap={cap} />} />

      {ctx.pings.length === 0 && (
        <div style={{ marginBottom: S.lg }}>
          <Title>nothing is standing.</Title>
          <Body quiet style={{ marginTop: S.md, maxWidth: 400 }}>
            three slots, sixty days each. renewal is free and it is one tap.
          </Body>
        </div>
      )}

      <div>
        {ctx.pings.map((p) => (
          <Entry key={p.handle} p={p} ctx={ctx} />
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <EmptySlot key={`e${i}`} onClick={() => ctx.go('send')} />
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: S.xl, marginTop: S.xl, flexWrap: 'wrap' }}>
        <Plate onClick={() => ctx.go('send')} disabled={empty === 0}>
          place a ping
        </Plate>
        {ctx.canSimulate && (
          <button
            type="button"
            onClick={ctx.simulate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 11px',
              borderRadius: R.press,
              border: `1px dashed ${rgba(C.ivory, 0.22)}`,
              color: TEXT.faint,
              fontFamily: FONT.mono,
              fontSize: 10.5,
              letterSpacing: '0.08em',
            }}
          >
            beta · they enter you back
          </button>
        )}
      </div>
    </Column>
  )
}

// ── 7 · the reveal ───────────────────────────────────────────────────────────
// The one ritual. Two seals, struck at the same moment, joined by a hairline.
// No confetti, no burst, no sound. The whole ceremony is that both of them are
// suddenly face up, and the product says the shortest true sentence it has.
export function RevealScreen({ ctx }) {
  const p = ctx.pings.find((x) => x.handle === ctx.revealing)
  const narrow = useNarrow()
  const seal = narrow ? 168 : 218
  const [lift, setLift] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setLift(true), 620)
    return () => clearTimeout(id)
  }, [])
  if (!p) return <Column><Body>nothing to open.</Body></Column>

  return (
    <Column wide style={{ justifyContent: 'center' }}>
      <div style={{ textAlign: 'left' }}>
        <Label tone="lit">mutual</Label>
        <h1
          style={{
            margin: `${S.md}px 0 0`,
            fontFamily: FONT.serif,
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 'clamp(34px, 8vw, 58px)',
            lineHeight: 0.98,
            color: C.ivory,
          }}
        >
          you both did.
        </h1>
        <Body quiet style={{ marginTop: S.md, maxWidth: 380 }}>
          you entered @{p.handle}. @{p.handle} entered you. neither of you moved
          second.
        </Body>
      </div>

      <div
        style={{
          marginTop: S.xxl,
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(18px, 5vw, 54px)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Seal
            card={p.card}
            size={seal}
            className="seal-set"
            style={{ transform: lift ? 'rotate(-2deg)' : 'rotate(-7deg)', transition: 'transform 1.1s cubic-bezier(.16,.84,.28,1)' }}
          />
          <Tick style={{ display: 'block', marginTop: S.md }}>yours</Tick>
        </div>

        <div aria-hidden style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>
          <svg width="52" height="12" viewBox="0 0 52 12">
            <line x1="0" y1="6" x2="52" y2="6" stroke={rgba(C.caramel, 0.5)} strokeWidth="1" strokeDasharray="3 4" />
            <circle cx="26" cy="6" r="2.4" fill={C.caramel} />
          </svg>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Seal
            card={p.theirCard}
            size={seal}
            className="seal-set"
            style={{ transform: lift ? 'rotate(2.4deg)' : 'rotate(8deg)', transition: 'transform 1.1s cubic-bezier(.16,.84,.28,1) .12s' }}
          />
          <Tick style={{ display: 'block', marginTop: S.md }}>theirs</Tick>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: S.xl, marginTop: S.xxl, flexWrap: 'wrap' }}>
        <Plate onClick={() => ctx.openConversation(p.handle)}>go say it</Plate>
        <Quiet onClick={() => ctx.go('pings')}>close the book</Quiet>
      </div>
    </Column>
  )
}

// ── the plate (the specimen sheet) ───────────────────────────────────────────
// Not a product screen. This is the sheet a press pulls to check the plate
// before a run: every colour, every material, every face, every part, on one
// page, so the system can be judged as a system rather than inferred from five
// screens. It exists because the whole point of the beta route is assessment.
function Spec({ title, note, children }) {
  return (
    <section style={{ marginBottom: S.xxl }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: S.md, marginBottom: S.sm }}>
        <Label tone="read">{title}</Label>
        {note && <Tick>{note}</Tick>}
      </div>
      <Rule style={{ marginBottom: S.lg }} />
      {children}
    </section>
  )
}

const CHIPS = [
  ['void', C.void, 'the closed case'],
  ['cocoa', C.cocoa, 'the ground'],
  ['hide', C.hide, 'a raised panel'],
  ['cognac', C.cognac, 'tooled edges'],
  ['saddle', C.saddle, 'light chocolate'],
  ['caramel', C.caramel, 'the one light'],
  ['wheat', C.wheat, 'the palest brown'],
  ['ivory', C.ivory, 'paper, and reading'],
  ['chalk', C.chalk, 'the chalk card'],
  ['ink', C.ink, 'ink, on paper'],
]

export function PlateScreen({ ctx }) {
  const sample = { handle: 'specimen', words: 'you always took the window seat', ground: 'leaf', face: 'hand', placed: Date.now() }
  return (
    <Column wide spine={false} style={{ justifyContent: 'flex-start', paddingTop: 96 }}>
      <div style={{ marginBottom: S.xxl }}>
        <Wordmark size={17} sub="specimen sheet · the bindery edition" />
        <Body quiet style={{ marginTop: S.lg, maxWidth: 480 }}>
          one hue, three materials, three faces. hierarchy is carried by value
          and texture. there is no second colour anywhere in this brand, and no
          object in it glows.
        </Body>
      </div>

      <Spec title="the case" note="one hue, ten values">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: S.md }}>
          {CHIPS.map(([name, hex, role]) => (
            <div key={name} style={{ width: 128 }}>
              <div style={{ height: 56, background: hex, borderRadius: R.press, border: `1px solid ${rgba(C.ivory, 0.1)}` }} />
              <div style={{ marginTop: 8 }}>
                <Label tone="read">{name}</Label>
                <Tick style={{ display: 'block', marginTop: 3 }}>{hex}</Tick>
                <Small style={{ fontSize: 11, marginTop: 3 }}>{role}</Small>
              </div>
            </div>
          ))}
        </div>
      </Spec>

      <Spec title="the materials" note="drawn per pixel, never a stock image">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: S.lg }}>
          {[
            ['pebbled hide', leatherSurface(C.hide), 'the case, panels, the dock'],
            ['laid paper', paperSurface(C.ivory), 'slips, cards, the first ground'],
            ['chalk card', chalkSurface(C.chalk), 'the second ground'],
          ].map(([name, surface, role]) => (
            <div key={name} style={{ width: 208 }}>
              <div style={{ height: 132, borderRadius: R.press, ...surface, boxShadow: LIGHT.rest }} />
              <div style={{ marginTop: 10 }}>
                <Label tone="read">{name}</Label>
                <Small style={{ fontSize: 11.5, marginTop: 4 }}>{role}</Small>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: S.lg, ...leatherSurface(C.hide), borderRadius: R.panel, padding: S.lg, position: 'relative', boxShadow: LIGHT.rest }}>
          <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: R.panel, ...stitching() }} />
          <div style={{ position: 'relative' }}>
            <Label tone="read">the stitch</Label>
            <Small style={{ marginTop: 6 }}>saddle stitch, slanted, with the thread shadow under it. it is the detail that says a hand made the object.</Small>
          </div>
        </div>
      </Spec>

      <Spec title="the three hands" note="cormorant garamond · jost · courier prime">
        <div style={{ display: 'grid', gap: S.lg }}>
          <div>
            <Tick>the voice</Tick>
            <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 300, fontSize: 42, lineHeight: 1.05, color: C.ivory, marginTop: 6 }}>
              you still think about them.
            </div>
          </div>
          <div>
            <Tick>the hand</Tick>
            <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 17, lineHeight: 1.6, color: TEXT.quiet, marginTop: 6, maxWidth: 460 }}>
              every mechanic in the product is set in this: buttons, captions,
              body copy, the labels stamped across a plate.
            </div>
          </div>
          <div>
            <Tick>the stamp</Tick>
            <div style={{ fontFamily: FONT.mono, fontSize: 13, letterSpacing: '0.08em', color: TEXT.quiet, marginTop: 6 }}>
              60 days left · placed {stamp(Date.now())} · 2 of 3
            </div>
          </div>
        </div>
      </Spec>

      <Spec title="the parts" note="two corners in the whole product">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: S.xl, alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: S.md }}>
            <Plate onClick={() => {}}>the plate</Plate>
            <Plate tone="leather" onClick={() => {}}>pressed leather</Plate>
            <Plate onClick={() => {}} disabled>
              not yet
            </Plate>
            <Quiet onClick={() => {}}>the quiet exit</Quiet>
          </div>
          <div style={{ width: 260 }}>
            <Leaf>
              <Ruled label="a ruled line" value="specimen" onChange={() => {}} />
            </Leaf>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: S.lg }}>
            {['standing', 'waiting', 'mutual'].map((s) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: S.sm }}>
                <Mark state={s} />
                <Label tone="read">{s}</Label>
              </div>
            ))}
            <Slots used={2} cap={3} />
          </div>
        </div>
      </Spec>

      <Spec title="the seal" note="the card a ping carries, on all three grounds">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: S.xl }}>
          {GROUNDS.map((g) => (
            <div key={g.id} style={{ textAlign: 'center' }}>
              <Seal card={{ ...sample, ground: g.id }} size={186} />
              <Tick style={{ display: 'block', marginTop: S.md }}>{g.name}</Tick>
            </div>
          ))}
        </div>
      </Spec>

      <div style={{ paddingBottom: S.xxl }}>
        <Plate onClick={() => ctx.go('open')}>back to the title page</Plate>
      </div>
    </Column>
  )
}
