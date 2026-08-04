// beta/screens.jsx — the seven pages and the specimen.
//
// ── the copy rule ────────────────────────────────────────────────────────────
// A screen explains itself or it is wrong. Every note under a control, every
// reassurance beside a button and every example under a field has been cut,
// because each one was a confession that the thing above it did not read.
// What is left on a page is: what happened, what it is called, and the one
// thing to do next.
//
// The composer is the clearest case. It carried a prompt, three example
// messages, a word count with the word "words" after it, a caption under the
// seal and a sentence beside the button — six pieces of text around one field.
// It now says "message for them", and the object beside it shows what that
// does, live, as you type.
//
// ── the structure rule ───────────────────────────────────────────────────────
// Nothing is centred; every page hangs off the spine on the left. One object
// per page: the send is a slip, the card is a seal, the status page is a
// ledger. The page admits it was printed.

import { useEffect, useState } from 'react'
import {
  C, TEXT, LINE, FONT, SIZE, R, S, LIGHT, MEASURE,
  GROUNDS, FACES, MAX_WORDS, wordCount, clampWords,
  rgba, normHandle, isValidHandle, stamp, daysLeft,
} from './tokens.js'
import { leatherSurface, paperSurface, chalkSurface, groundSurface, stitching } from './texture.js'
import {
  Column, Title, Body, Small, Label, Tick, Rule, useNarrow,
  Reticle, Wordmark, Panel, Leaf, Plate, Quiet, Ruled, Seal, Mark, Head, Slots, Swatches,
} from './ui.jsx'
import { Reveal } from './Reveal.jsx'

const GROUND_ITEMS = GROUNDS.map((g) => ({ id: g.id, name: g.name, surface: groundSurface(g, { scale: 60 }) }))

// ── 1 · the title page ───────────────────────────────────────────────────────
export function OpenScreen({ ctx }) {
  return (
    <Column>
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

      <div style={{ display: 'flex', alignItems: 'center', gap: S.xl, flexWrap: 'wrap' }}>
        <Plate onClick={() => ctx.go('send')}>find out</Plate>
        <Quiet onClick={() => ctx.go('pings')}>log in</Quiet>
      </div>

      <Tick style={{ display: 'block', marginTop: S.xxl }}>
        no profiles · no browsing · nothing happens unless it is mutual
      </Tick>
    </Column>
  )
}

// ── 2 · the send ─────────────────────────────────────────────────────────────
// A slip of paper with a line on it. The plate mark in the corner stays,
// because it is ornament rather than instruction: printed matter tells you it
// was printed, and it is two words, not a sentence about privacy.
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

      <Leaf className="leaf-in" style={{ marginTop: S.xl, padding: `${S.lg}px ${S.lg}px ${S.lg}px`, transform: 'rotate(-0.45deg)' }}>
        <Tick tone="ink" style={{ display: 'block', color: rgba(C.ink, 0.36), marginBottom: S.md }}>
          form 01
        </Tick>
        <Ruled label="their instagram" value={v} onChange={setV} onEnter={submit} placeholder="handle" autoFocus big />
      </Leaf>

      <div style={{ marginTop: S.xl }}>
        <Plate onClick={submit} disabled={!ok}>
          next
        </Plate>
      </div>
    </Column>
  )
}

// ── 3 · the card ─────────────────────────────────────────────────────────────
// One field, and beside it the thing the field makes. The materials and the
// hands are shown rather than described: each swatch is the real surface at the
// real texture, and each hand is the words "still here" set in it.
export function WriteScreen({ ctx }) {
  const [words, setWords] = useState('')
  const [ground, setGround] = useState('leaf')
  const [face, setFace] = useState('hand')
  const narrow = useNarrow()
  const n = wordCount(words)
  const ready = n > 0 && n <= MAX_WORDS

  const card = { handle: ctx.them, words: clampWords(words), ground, face, placed: Date.now() }

  return (
    <Column wide>
      <Head kicker="the card" onBack={() => ctx.go('send')} right={<Tick>for @{ctx.them}</Tick>} />

      <div style={{ display: 'flex', gap: S.xxl, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* the seal, and it is the thing that launches: the send-off measures
            this element and the star leaves from exactly where it stood */}
        <div data-sendoff-field style={{ flex: '0 0 auto' }}>
          <Seal key={ground} card={card} size={narrow ? 190 : 252} className="seal-set" />
        </div>

        <div style={{ flex: '1 1 300px', minWidth: 280, maxWidth: MEASURE }}>
          <Leaf style={{ padding: S.lg }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: S.md }}>
              <Label tone="ink" style={{ color: rgba(C.ink, 0.5) }}>message for them</Label>
              <Tick tone="ink" style={{ color: n > MAX_WORDS ? '#8A2B12' : rgba(C.ink, 0.4) }}>
                {n}/{MAX_WORDS}
              </Tick>
            </div>
            <textarea
              className="ph-ink"
              value={words}
              onChange={(e) => setWords(e.target.value)}
              rows={4}
              spellCheck={false}
              autoFocus
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
          </Leaf>

          <div style={{ marginTop: S.xl }}>
            <Swatches items={GROUND_ITEMS} value={ground} onChange={setGround} size={52} />
          </div>

          <div style={{ marginTop: S.lg, display: 'flex', gap: S.md, flexWrap: 'wrap' }}>
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
                </button>
              )
            })}
          </div>

          <div style={{ marginTop: S.xl }}>
            <Plate onClick={() => ctx.place(card)} disabled={!ready}>
              seal it
            </Plate>
          </div>
        </div>
      </div>
    </Column>
  )
}

// ── 4 · the flight ───────────────────────────────────────────────────────────
// Nothing on screen. The star has just launched and the camera is riding it
// into the disk; a page of type over that is a page nobody reads.
export function FlightScreen() {
  return <div style={{ minHeight: '100dvh' }} />
}

// ── 5 · the truth ────────────────────────────────────────────────────────────
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

      <Body quiet style={{ marginTop: S.lg, maxWidth: 400 }}>
        {standing
          ? 'the second they enter you back, you both know.'
          : 'it is held, unseen, until they arrive.'}
      </Body>

      <Panel style={{ marginTop: S.xl, padding: S.lg, maxWidth: 400 }}>
        <button
          type="button"
          onClick={() => ctx.locate(p.handle)}
          style={{ display: 'flex', gap: S.lg, alignItems: 'center', textAlign: 'left', width: '100%' }}
        >
          <Seal card={p.card} size={82} />
          <span>
            <span style={{ display: 'block', fontFamily: FONT.mono, fontSize: 15, color: C.ivory, letterSpacing: '0.02em' }}>
              @{p.handle}
            </span>
            <Tick style={{ display: 'block', marginTop: 6 }}>{daysLeft(p.expires)} days</Tick>
          </span>
        </button>
      </Panel>

      <div style={{ display: 'flex', alignItems: 'center', gap: S.xl, marginTop: S.xl, flexWrap: 'wrap' }}>
        <Plate onClick={() => ctx.go('pings')}>your pings</Plate>
        <Quiet onClick={() => ctx.go('send')}>place another</Quiet>
      </div>
    </Column>
  )
}

// ── 6 · the ledger ───────────────────────────────────────────────────────────
// Ruled entries, one to a line, each with its seal in the margin. Tapping a
// seal flies the camera to that ping's star and stays there, which is the whole
// reason the seal is in the margin and not an icon.
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
    <div style={{ display: 'flex', gap: S.lg, alignItems: 'center', padding: `${S.lg}px 0`, borderBottom: `1px solid ${LINE.faint}` }}>
      <button
        type="button"
        onClick={() => ctx.locate(p.handle)}
        aria-label={`see @${p.handle} in the sky`}
        className={strain ? 'strain' : ''}
        style={{ flex: '0 0 auto', borderRadius: '50%' }}
      >
        <Seal card={p.card} size={88} />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: S.sm, marginBottom: 6 }}>
          <Mark state={p.state} />
          <Label tone={mutual ? 'lit' : 'quiet'}>{mutual ? 'mutual' : p.state === 'standing' ? 'standing' : 'not here yet'}</Label>
        </div>
        <div style={{ fontFamily: FONT.mono, fontSize: 15, color: C.ivory, letterSpacing: '0.02em', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          @{p.handle}
        </div>
        {!mutual && (
          <div style={{ marginTop: 7, display: 'flex', gap: S.md, alignItems: 'center', flexWrap: 'wrap' }}>
            <Tick>{days <= 0 ? 'lapses today' : `${days} days`}</Tick>
            <button
              type="button"
              onClick={() => ctx.renew(p.handle)}
              style={{ fontFamily: FONT.sans, fontSize: 11.5, letterSpacing: '0.04em', color: TEXT.quiet, borderBottom: `1px solid ${rgba(C.ivory, 0.2)}`, paddingBottom: 1 }}
            >
              renew
            </button>
            <button
              type="button"
              onClick={() => ctx.letGo(p.handle)}
              style={{ fontFamily: FONT.sans, fontSize: 11.5, letterSpacing: '0.04em', color: TEXT.faint, borderBottom: `1px solid ${rgba(C.ivory, 0.12)}`, paddingBottom: 1 }}
            >
              let it go
            </button>
          </div>
        )}
      </div>

      {mutual && (
        <Plate tone="leather" onClick={() => ctx.open(p.handle)} style={{ flex: '0 0 auto', padding: '13px 20px' }}>
          {p.opened ? 'again' : 'open it'}
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
      style={{ display: 'flex', alignItems: 'center', gap: S.lg, width: '100%', textAlign: 'left', padding: `${S.lg}px 0`, borderBottom: `1px solid ${LINE.faint}` }}
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
      <Label>open slot</Label>
    </button>
  )
}

export function PingsScreen({ ctx }) {
  const cap = 3
  const empty = Math.max(0, cap - ctx.pings.length)
  return (
    <Column>
      <Head kicker="your pings" onBack={() => ctx.go('open')} right={<Slots used={ctx.pings.length} cap={cap} />} />

      {ctx.pings.length === 0 && <Title style={{ marginBottom: S.lg }}>nothing is standing.</Title>}

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
// The dive into your own ping, their light around its limb, and one half turn.
// The object says what happened; the page says the shortest true sentence it
// has and then gets out of the way.
export function RevealScreen({ ctx }) {
  const p = ctx.revealed
  if (!p) return <Column><Body>nothing to open.</Body></Column>
  return (
    <Reveal yours={p.card} theirs={p.theirCard} index={ctx.revealIndex} fieldRef={ctx.skyRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: S.xl, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Plate onClick={() => ctx.openConversation(p.handle)}>go say it</Plate>
        <Quiet onClick={ctx.closeReveal}>your sky</Quiet>
      </div>
    </Reveal>
  )
}

// ── the plate (the specimen sheet) ───────────────────────────────────────────
// Not a product screen. The sheet a press pulls to check the plate before a
// run, so the system can be judged as a system rather than inferred from six
// screens. It is the one page in the beta allowed to be wordy.
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
    <Column wide spine={false} style={{ justifyContent: 'flex-start' }}>
      <div style={{ marginBottom: S.xxl }}>
        <Wordmark size={17} sub="specimen sheet · the bindery edition" />
        <Body quiet style={{ marginTop: S.lg, maxWidth: 470 }}>
          one hue, three materials, three faces. hierarchy is carried by value
          and texture. nothing in this brand glows.
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
            ['pebbled hide', leatherSurface(C.hide), 'the case, panels'],
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
            <Small style={{ marginTop: 6 }}>saddle stitch, slanted, with the thread shadow under it.</Small>
          </div>
        </div>
      </Spec>

      <Spec title="the three hands" note="cormorant garamond · jost · courier prime">
        <div style={{ display: 'grid', gap: S.lg }}>
          <div style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontWeight: 300, fontSize: 42, lineHeight: 1.05, color: C.ivory }}>
            you still think about them.
          </div>
          <div style={{ fontFamily: FONT.sans, fontWeight: 300, fontSize: 17, lineHeight: 1.6, color: TEXT.quiet, maxWidth: 460 }}>
            every mechanic in the product is set in this: buttons, captions, body
            copy, the labels stamped across a plate.
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 13, letterSpacing: '0.08em', color: TEXT.quiet }}>
            60 days · placed {stamp(Date.now())} · 2 of 3
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
