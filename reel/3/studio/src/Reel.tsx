// ── the third reel: two people, same thought ────────────────────────────────
//
// Two people each waiting for the other to say it first, so nobody does.
// Told in photographs laid on paper as prints, each cut in two along the
// line between the two people in it and pulled apart: apart while they
// wait, the notes they send held in the gap, whole again when it is mutual,
// one half gone to the paper when only one of them sent it.
//
//   0      the roses, cut between the reaching hand and the hand holding
//          them out. `maya's waiting for jun / to say it first.` `jun's
//          waiting for maya / to say it first.` `so nobody does.`
//   4.5    the dancers, cut under their joined hands. `they both write it.`
//          a card over each: `i like you`. `they both delete it.`
//   9.5    a jolt back; typed again. `on celestual, / you send it anyway.`
//          `send privately`; each card goes into its note, sealed, in the
//          gap. `they only read it / if the other sent one too.`
//  14.5    `sat · 9:00 pm`. The halves come together, the two notes meet,
//          the print is whole and warms. `it's mutual.`
//  18.2    the two in the sea, the whole frame. `you both find out.`
//  20.8    the roses again: one note in the gap; the reaching half goes to
//          the paper, and the note with it. `if only one of you / sends it,`
//          `nobody ever knows.`
//  24.2    `stop waiting / for them to / say it first.` the name.

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Audio, staticFile } from 'remotion'
import { TransitionSeries, linearTiming, springTiming } from '@remotion/transitions'
import { wipe } from '@remotion/transitions/wipe'
import { fade } from '@remotion/transitions/fade'
import { slide } from '@remotion/transitions/slide'
import { CameraMotionBlur } from '@remotion/motion-blur'
import './fonts'
import { CHALK, INK, PAPER, SANS, W, H } from './theme'
import { ToneDefs, SplitPrint, FullPhoto, PHOTOS, type Rect } from './parts/Print'
import { Line } from './parts/Line'
import { Paper, Grain, Vignette, Card, typed, blink, Envelope, Ring, Label, Chip, Lockup } from './parts/Bits'

export type Hook = 'a' | 'b'
export const DUR = { hook: 150, dance: 420, sea: 80, nobody: 100, end: 110 }
export const T = { wipe: 14, fade: 10, slide: 14 }
export const TOTAL = DUR.hook + DUR.dance + DUR.sea + DUR.nobody + DUR.end - T.wipe - T.fade - T.slide

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const ramp = (f: number, a: number, b: number) => clamp((f - a) / (b - a))
const ease = (k: number) => k * k * (3 - 2 * k)

// ── 0: the roses, apart ─────────────────────────────────────────────────────
const ROSES: Rect = { x: 130, y: 660, w: 820, h: 746 }
const ROSE_SEAM: [number, number] = [0.17, 0.6]
function Hook({ hook }: { hook: Hook }) {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const gap = 120 + 70 * spring({ frame: f - 100, fps, config: { damping: 30, stiffness: 40 } }) + 10 * spring({ frame: f, fps, config: { damping: 20 } })
  // the one each line is about lit, the other a little down
  const a = hook === 'a'
  const leftDim = a ? interpolate(f, [50, 58, 98, 106], [1, 0.62, 0.62, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1
  const rightDim = a ? interpolate(f, [0, 1, 48, 56], [0.62, 0.62, 0.62, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1
  return (
    <AbsoluteFill>
      <Paper />
      <SplitPrint photo={PHOTOS.roses} rect={ROSES} seam={ROSE_SEAM} gap={gap} frame={f} zoom={1.02 + f * 0.0002} tilt={1.4} left={{ bright: leftDim }} right={{ bright: rightDim }} />
      <Label x={ROSES.x + 36 - gap / 2} y={ROSES.y + ROSES.h - 64} text="maya" />
      <Label x={ROSES.x + ROSES.w - 36 + gap / 2} y={ROSES.y + ROSES.h - 64} text="jun" align="right" />
      {a ? (
        <>
          <Line lines={['maya’s waiting for jun', 'to say it *first.*']} from={-16} out={50} y={290} size={96} stagger={1.2} />
          <Line lines={['jun’s waiting for maya', 'to say it *first.*']} from={56} out={98} y={290} size={96} />
        </>
      ) : (
        <Line lines={['you’re both waiting', 'for the other one', 'to say it *first.*']} from={-16} out={98} y={236} size={96} stagger={1.2} />
      )}
      <Line lines={['*so nobody does.*']} from={104} y={340} size={124} />
    </AbsoluteFill>
  )
}

// ── 4.5: the dancers, apart; written, deleted, sent; whole ──────────────────
const DANCE: Rect = { x: 150, y: 600, w: 780, h: 1040 }
const DANCE_SEAM: [number, number] = [0.6, 0.6]
const SEAM_X = DANCE.x + DANCE.w * DANCE_SEAM[0]
const ENV_Y = [DANCE.y + 0.4 * DANCE.h, DANCE.y + 0.53 * DANCE.h]
const D = { type1: 24, del: 96, jolt: 150, type2: 164, label: 156, press: [196, 200], fold: [204, 224], draw: [210, 232], chip: 298, merge: 318, meet: 336, warm: [334, 362], said: 344 }
const SAY = 'i like you'
function Dance() {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  // the gap: open, a jolt back as the two start again, and at nine closed,
  // turning square as it closes
  const close = spring({ frame: f - D.merge, fps, config: { damping: 16, stiffness: 90, mass: 0.9 } })
  const gap = 140 * (1 - close)
  const jolt = f >= D.jolt && f < D.jolt + 24 ? Math.sin(((f - D.jolt) / 24) * Math.PI) * -70 * (1 - (f - D.jolt) / 24) : 0
  // the two cards: in, a letter at a time, held, deleted; again; sent
  const cardIn = spring({ frame: f - 12, fps, config: { damping: 16 } })
  const text = f < D.jolt ? typed(SAY, f, D.type1, 3, D.del, 2) : typed(SAY, f, D.type2, 2)
  const hover = f > 58 && f < 92 ? 0.35 + 0.35 * Math.sin((f - 58) / 3) : 0
  const label = f < D.label ? 'send' : 'send privately'
  const press = (i: number) => spring({ frame: f - D.press[i], fps, config: { damping: 12, stiffness: 300 } }) * (1 - ramp(f, D.press[i] + 6, D.press[i] + 12))
  const fold = ease(ramp(f, D.fold[0], D.fold[1]))
  const cardX = [DANCE.x + 0.3 * DANCE.w - gap / 2, Math.min(DANCE.x + 0.8 * DANCE.w + gap / 2, W - 72 - 160)]
  const cardY = 650
  // the notes in the gap, drawn as the cards go into them, and at nine
  // drawn to each other, and gone in a ring of light as they meet
  const draw = ease(ramp(f, D.draw[0], D.draw[1]))
  const fill = ramp(f, D.draw[1], D.draw[1] + 8)
  const meet = ease(ramp(f, D.merge, D.meet))
  const envY = [interpolate(meet, [0, 1], [ENV_Y[0], 1110]), interpolate(meet, [0, 1], [ENV_Y[1], 1110])]
  const envO = 1 - ramp(f, D.meet, D.meet + 3)
  const warm = ease(ramp(f, D.warm[0], D.warm[1]))
  const chip = spring({ frame: f - D.chip, fps, config: { damping: 14 } }) * (1 - ramp(f, D.said - 4, D.said + 6))
  const zoom = 1 + 0.05 * ease(ramp(f, D.said, 420))
  const stage = (
    <AbsoluteFill style={{ transform: `translateX(${jolt}px)` }}>
      <Paper />
      <SplitPrint
        photo={PHOTOS.dance} rect={DANCE} seam={DANCE_SEAM} gap={gap} frame={f} zoom={zoom} tilt={1.2 * (1 - close)}
        left={{ tone: 'ice', toneTo: 'warm', mix: warm }} right={{ tone: 'rose', toneTo: 'warm', mix: warm }}
      />
      <Label x={DANCE.x + 32 - gap / 2} y={DANCE.y + DANCE.h - 70} text="maya" opacity={1 - warm} />
      <Label x={DANCE.x + DANCE.w - 32 + gap / 2} y={DANCE.y + DANCE.h - 70} text="jun" align="right" opacity={1 - warm} />
      {[0, 1].map((i) => (
        <Card
          key={i} x={interpolate(fold, [0, 1], [cardX[i], SEAM_X])} y={interpolate(fold, [0, 1], [cardY, ENV_Y[i] - 60])} w={320}
          to={i ? 'maya' : 'jun'} text={text} cursor={blink(f) || (f > D.type1 && f < 60)} label={label}
          press={Math.max(press(i), i ? hover * 0.6 : hover)} scale={cardIn * (1 - 0.86 * fold)} opacity={1 - ramp(f, D.fold[1] - 6, D.fold[1])} rot={i ? 2 : -2}
        />
      ))}
      {f >= D.draw[0] && f < D.meet + 4 ? [0, 1].map((i) => (
        <Envelope key={i} x={SEAM_X - jolt * 0} y={envY[i]} size={92} draw={draw} fill={fill} opacity={envO} glow={meet} />
      )) : null}
      <Ring x={SEAM_X} y={1110} k={ramp(f, D.meet, D.meet + 26)} r={340} />
      <Ring x={SEAM_X} y={1110} k={ramp(f, D.meet + 5, D.meet + 34)} r={480} />
      <Chip x={540} y={530} text="sat · 9:00 pm" k={chip} />
      <Line lines={['they both', '*write* it.']} from={8} out={92} y={260} size={110} />
      <Line lines={['they both', '*delete* it.']} from={98} out={148} y={260} size={110} />
      <Line lines={['on celestual,', 'you send it *anyway.*']} from={160} out={246} y={270} size={96} />
      <Line lines={['they only read it', 'if the other sent one *too.*']} from={250} out={292} y={300} size={76} />
      <Line lines={['it’s', '*mutual.*']} from={D.said} y={170} size={190} />
    </AbsoluteFill>
  )
  // the jolt and the closing seen as a shutter sees them
  const moving = (f >= D.jolt && f < D.jolt + 24) || (f >= D.merge && f < D.merge + 26)
  return moving ? <CameraMotionBlur shutterAngle={200} samples={8}>{stage}</CameraMotionBlur> : stage
}

// ── 18.2: the two of them, the whole frame ──────────────────────────────────
function Sea() {
  const f = useCurrentFrame()
  return (
    <AbsoluteFill style={{ background: INK }}>
      <FullPhoto photo={PHOTOS.sea} rect={{ x: 0, y: 0, w: W, h: H }} zoom={1.02 + 0.06 * ease(ramp(f, 0, DUR.sea))} focus={[0.53, 0.55]} frame={f} look={{ tone: 'warm' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(10,8,6,0.55) 0%, rgba(10,8,6,0) 34%)' }} />
      <Line lines={['you both', '*find out.*']} from={6} y={260} size={132} color={CHALK} />
    </AbsoluteFill>
  )
}

// ── 20.8: one note, and nobody knows ────────────────────────────────────────
function Nobody() {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const gap = 110 + 20 * spring({ frame: f, fps, config: { damping: 30 } })
  const go = ease(ramp(f, 38, 74))
  const gone = ease(ramp(f, 58, 84))
  const sx = ROSES.x + ROSES.w * ((ROSE_SEAM[0] + ROSE_SEAM[1]) / 2) + 24
  return (
    <AbsoluteFill>
      <Paper />
      <SplitPrint photo={PHOTOS.roses} rect={ROSES} seam={ROSE_SEAM} gap={gap} frame={f + 300} zoom={1.05} tilt={1.4} left={{ opacity: 1 - go, blur: 10 * go, bright: 1 + 0.4 * go }} />
      <Label x={ROSES.x + 36 - gap / 2} y={ROSES.y + ROSES.h - 64} text="maya" opacity={1 - go} />
      <Label x={ROSES.x + ROSES.w - 36 + gap / 2} y={ROSES.y + ROSES.h - 64} text="jun" align="right" />
      <div style={{ filter: `blur(${12 * gone}px)`, transform: `translateY(${-30 * gone}px) scale(${1 + 0.25 * gone})` }}>
        <Envelope x={sx} y={ROSES.y + 0.45 * ROSES.h} size={92} draw={1} fill={1} opacity={1 - gone} />
      </div>
      <Line lines={['if only one of you', 'sends it,']} from={4} out={52} y={300} size={92} />
      <Line lines={['*nobody*', '*ever knows.*']} from={58} y={250} size={150} />
    </AbsoluteFill>
  )
}

// ── 24.2: the line, and the name ────────────────────────────────────────────
function End() {
  const f = useCurrentFrame()
  const { fps } = useVideoConfig()
  const name = spring({ frame: f - 46, fps, config: { damping: 20 } })
  const url = spring({ frame: f - 58, fps, config: { damping: 20 } })
  return (
    <AbsoluteFill>
      <Paper />
      <Line lines={['stop waiting', 'for them to', 'say it *first.*']} from={8} y={430} size={118} align="center" x={72} />
      <Lockup x={540} y={1140 + 20 * (1 - name)} cell={6} opacity={name} />
      <div style={{ position: 'absolute', left: 0, width: W, top: 1380 + 14 * (1 - url), textAlign: 'center', opacity: url, fontFamily: SANS, fontSize: 32, fontWeight: 500, letterSpacing: '0.06em', color: INK }}>celestual.us</div>
    </AbsoluteFill>
  )
}

export function Reel({ hook = 'a' }: { hook?: Hook }) {
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <ToneDefs />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={DUR.hook}><Hook hook={hook} /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: 'from-left' })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T.wipe })} />
        <TransitionSeries.Sequence durationInFrames={DUR.dance}><Dance /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T.fade })} />
        <TransitionSeries.Sequence durationInFrames={DUR.sea}><Sea /></TransitionSeries.Sequence>
        <TransitionSeries.Sequence durationInFrames={DUR.nobody}><Nobody /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: 'from-bottom' })} timing={springTiming({ config: { damping: 200 }, durationInFrames: T.slide })} />
        <TransitionSeries.Sequence durationInFrames={DUR.end}><End /></TransitionSeries.Sequence>
      </TransitionSeries>
      <Vignette />
      <Grain />
      <Audio src={staticFile('sound.wav')} />
    </AbsoluteFill>
  )
}
