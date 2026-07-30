// trial.jsx — the Celestual Challenge page at /trial.
//
// A DOOR, NOT A DOSSIER. This page used to be the whole official doc typed out
// again: the weighted scoring table, the hard rules, the shot notes for both
// videos, the strategy essay, the prize, the agreement — several screens of
// reading before the one field that actually matters. All of it is in the doc,
// which is downloadable, signable, and one tap away. Reprinting it here made
// the page a second document to read rather than a place to decide.
//
// What survives is what a decision needs: what this is (three lines), a clock
// that is visibly running out, the two things you make and the one thing you
// win, four steps, and the field that hands you your link. The doc sits between
// the visuals and the steps for anyone who wants the detail, and it opens IN
// PLACE so reading it never costs the tab.
//
// This page runs WITHOUT the living galaxy behind it (App.jsx skips the canvas
// here). It keeps the palette and a still gradient, and drops the motion.
//
// It lives outside screens.jsx deliberately: an operational surface grafted
// onto the product, not part of the nine-screen story. The admin desk, once
// here too, now has its own file (components/admin.jsx) and its own look.
import * as React from 'react'
import { createPortal } from 'react-dom'
import { normHandle, isValidHandle } from '../api/celestual.js'
import { recruitStats, loadDash } from '../api/recruit.js'
import {
  startEmail, checkChoice, claimTrial, loginTrial, trialLink, normChoice,
  choiceProblem, loadTrialAccount, clearTrialAccount, trialEnabled,
} from '../api/trial.js'
import { useI18n } from '../i18n/index.js'
import {
  Brandmark, Kicker, Mono, GlassPanel, PrimaryButton, GhostButton, OutlineButton,
  Field, Note, ExitRow, Display, Title, Small, Icon, Countdown, useCountdown, useDialog,
  rgba, RADIUS, SPACE, FONT, SIZE,
} from './ui.jsx'
import { Shell } from './screens.jsx'
import { TRIAL, TRIAL_DOC, TRIAL_DEADLINE } from '../trialContent.js'

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
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

// ── the page's parts ─────────────────────────────────────────────────────────

// A section's name, said once, quietly, with a hairline under it. The page has
// three of these and no other headings.
function SectionTitle({ C, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
      <Kicker C={C}>{children}</Kicker>
      <span aria-hidden style={{ height: 1, width: 42, background: rgba(C.star, 0.4) }} />
    </div>
  )
}

// The page's main visual: three cards, and between them they answer the only
// two questions a competitor has before reading anything. What do I make? Two
// videos, side by side, because they are a pair. What do I get? One percent,
// on its own line, lit, because it is the reason anyone is reading.
function MakeCard({ C, n, kind, title, line }) {
  const prize = kind === 'prize'
  return (
    <div
      style={{
        flex: prize ? '1 1 100%' : '1 1 150px', minWidth: 0,
        display: 'flex', flexDirection: prize ? 'row' : 'column', alignItems: prize ? 'center' : 'stretch',
        gap: prize ? SPACE.lg : SPACE.sm,
        padding: prize ? `${SPACE.lg}px ${SPACE.xl}px` : `${SPACE.lg}px ${SPACE.lg}px ${SPACE.xl}px`,
        borderRadius: RADIUS.card,
        background: prize ? `linear-gradient(120deg, ${rgba(C.star, 0.16)}, ${rgba(C.ink2, 0.6)} 62%)` : rgba(C.ink2, 0.55),
        border: `1px solid ${prize ? rgba(C.star, 0.42) : C.line}`,
        boxShadow: prize ? `0 0 34px ${rgba(C.star, 0.12)}` : 'none',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          fontFamily: FONT.serif, fontStyle: 'italic', lineHeight: 1,
          fontSize: prize ? 46 : 32,
          color: prize ? C.star : rgba(C.cream, 0.45),
          textShadow: prize ? `0 0 26px ${rgba(C.star, 0.4)}` : 'none',
        }}
      >
        {n}
      </span>
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: SIZE.head, color: C.cream }}>{title}</span>
        <span style={{ fontSize: SIZE.small, lineHeight: 1.55, color: C.muted }}>{line}</span>
      </div>
    </div>
  )
}

// The four steps, on a rail. A numbered dot per step, a hairline running
// between them, the step's name in the interface voice and one line beneath.
function StepRail({ C, steps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {steps.map((s, i) => (
        <div key={s.head} style={{ display: 'flex', gap: SPACE.md, alignItems: 'stretch' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 24, height: 24, borderRadius: '50%', background: rgba(C.star, 0.13), border: `1px solid ${rgba(C.star, 0.32)}`, color: C.star, fontFamily: FONT.mono, fontSize: SIZE.micro }}>
              {i + 1}
            </span>
            {i < steps.length - 1 && <span aria-hidden style={{ flex: 1, width: 1, background: rgba(C.star, 0.2) }} />}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: i < steps.length - 1 ? SPACE.lg : 0 }}>
            <span style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: SIZE.body, color: C.cream }}>{s.head}</span>
            <span style={{ fontSize: SIZE.small, lineHeight: 1.5, color: C.muted }}>{s.body}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// The clock. The deadline used to be a sentence in the middle of the page; it
// is now the second thing you see and it is moving.
function DeadlineCard({ C }) {
  const { done } = useCountdown(TRIAL_DEADLINE)
  const { t } = useI18n()
  return (
    <div
      style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: SPACE.md, padding: `${SPACE.lg}px ${SPACE.xl}px`,
        borderRadius: RADIUS.card, border: `1px solid ${rgba(C.star, 0.24)}`,
        background: `linear-gradient(120deg, ${rgba(C.star, 0.07)}, ${rgba(C.ink2, 0.5)})`,
      }}
    >
      <Countdown C={C} iso={TRIAL_DEADLINE} closedLabel={t('trial.closed')} />
      <Kicker C={C} micro>{TRIAL.deadline}</Kicker>
      {done && <span style={{ width: '100%' }} />}
    </div>
  )
}

// ── the entry stats (the account view's numbers) ─────────────────────────────

function EntryStat({ C, value, label, lit }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: `${SPACE.md}px 0` }}>
      <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: SIZE.figure, color: lit ? C.star : C.cream }}>{value}</span>
      <Kicker C={C} micro>{label}</Kicker>
    </div>
  )
}

function WeekBars({ C, days }) {
  const max = Math.max(1, ...days.map((d) => Number(d.n || 0)))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 6, height: 34, padding: `0 ${SPACE.lg}px` }}>
      {days.map((d, i) => (
        <span
          key={i}
          title={`${d.day}: ${d.n}`}
          style={{ width: 14, height: Math.max(3, Math.round((Number(d.n || 0) / max) * 30)), borderRadius: 3, background: Number(d.n || 0) > 0 ? rgba(C.star, 0.75) : rgba(C.cream, 0.1) }}
        />
      ))}
    </div>
  )
}

// The four letters, shown as the link they become while you type them, with
// their state as a small mark on the right. There used to be a sentence under
// this field explaining what the letters were for; the preview says it.
function LinkPreview({ C, choice, state }) {
  const { t } = useI18n()
  const code = normChoice(choice)
  const ghost = !code
  const bad = state === 'taken' || state === 'reserved'
  const good = state === 'free'
  const mark = good
    ? { text: t('trial.choiceFree'), color: C.star }
    : state === 'taken'
      ? { text: t('trial.choiceTaken'), color: C.them }
      : state === 'reserved'
        ? { text: t('trial.choiceReserved'), color: C.them }
        : state === 'format'
          ? { text: t('trial.choiceFormat'), color: C.muted }
          : state === 'checking'
            ? { text: t('you.checking'), color: C.muted }
            : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: `${SPACE.xs}px ${SPACE.md}px`, padding: '0 2px' }}>
      <span style={{ fontFamily: FONT.mono, fontSize: SIZE.small, color: bad ? rgba(C.them, 0.85) : rgba(C.cream, 0.85) }}>
        celestual.us/
        <span style={{ fontWeight: 700, color: ghost ? rgba(C.cream, 0.3) : good ? C.star : 'inherit' }}>
          {code || 'abcd'}
        </span>
      </span>
      {mark && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: FONT.mono, fontSize: SIZE.meta, color: mark.color }}>
          {good && <span aria-hidden style={{ fontSize: 10 }}>✦</span>}
          {mark.text}
        </span>
      )}
    </div>
  )
}

// ── the doc, read in place ───────────────────────────────────────────────────
// The doc used to open in a new tab. That is the worst moment to send someone
// away: they are mid-decision, on a phone, and a downloaded .docx or a PDF
// viewer that fights mobile Safari is where the decision quietly ends. The
// sheet loads the doc's own HTML edition in an iframe — same document, same
// words, reflowed for a phone — and keeps the PDF and .docx one tap away for
// anyone who wants to print or sign.
//
// PORTALLED TO <body>, and it has to be. The screen wrapper in App.jsx carries
// `.fade`, whose keyframes end on `transform: translateY(0)` with fill-mode
// `both` — so the transform never goes away, and a transformed ancestor is the
// containing block for `position: fixed` descendants. On a short screen nobody
// notices; on THIS page, which is several viewports tall, `inset: 0` resolved
// to the whole page and the sheet centred itself a thousand pixels below the
// fold. The scrim still looked right, which is what makes it a nasty one.
function DocSheet({ C, onClose }) {
  const { t } = useI18n()
  const ref = useDialog(onClose)
  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'max(14px, env(safe-area-inset-top)) 12px max(14px, env(safe-area-inset-bottom))' }}
    >
      <div aria-hidden className="scrim-in" style={{ position: 'fixed', inset: 0, background: rgba(C.ink, 0.8), backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)' }} />
      <div
        onClick={(e) => e.stopPropagation()}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={TRIAL.doc.title}
        tabIndex={-1}
        className="readout-in"
        style={{
          position: 'relative', width: '100%', maxWidth: 780, height: '100%', maxHeight: 900,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          background: C.ink2, border: `1px solid ${C.line}`, borderRadius: RADIUS.card, outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.md}px ${SPACE.lg}px`, borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
          <Kicker C={C} style={{ flex: 1, minWidth: 0 }}>{TRIAL.doc.title}</Kicker>
          <a
            href={TRIAL_DOC.pdf}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: FONT.mono, fontSize: SIZE.meta, color: C.muted, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            {t('trial.docPdf')}
          </a>
          <a
            href={TRIAL_DOC.docx}
            download
            style={{ fontFamily: FONT.mono, fontSize: SIZE.meta, color: C.muted, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            {t('trial.docDocx')}
          </a>
          <button
            onClick={onClose}
            aria-label={t('trial.docClose')}
            style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: C.ink3, border: `1px solid ${C.line}`, cursor: 'pointer', display: 'grid', placeItems: 'center', color: C.muted }}
          >
            <Icon name="close" size={13} color="currentColor" />
          </button>
        </div>
        <iframe
          src={TRIAL_DOC.html}
          title={TRIAL.doc.title}
          style={{ flex: 1, width: '100%', border: 'none', background: '#fff' }}
        />
      </div>
    </div>,
    document.body,
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// THE TRIAL PAGE — celestual.us/trial
// ═════════════════════════════════════════════════════════════════════════════

export function TrialScreen({ C, ctx }) {
  const { t } = useI18n()
  const enabled = trialEnabled()

  // ── the entry state ──
  // form | code | account. `mode` remembers whether the code phase belongs to a
  // fresh registration or a returning login.
  const saved = React.useMemo(() => loadTrialAccount(), [])
  const [phase, setPhase] = React.useState(saved ? 'account' : 'form')
  const [mode, setMode] = React.useState('register')
  const [name, setName] = React.useState(saved?.name || '')
  const [handle, setHandle] = React.useState(saved?.handle || '')
  const [email, setEmail] = React.useState('')
  const [choice, setChoice] = React.useState('')
  const [agree, setAgree] = React.useState(false)
  const [avail, setAvail] = React.useState(null) // null | 'checking' | 'free' | 'taken' | 'reserved' | 'format'
  const [emailToken, setEmailToken] = React.useState('')
  const [digits, setDigits] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState('')
  const [account, setAccount] = React.useState(saved) // { code, handle, name }
  const [welcomeBack, setWelcomeBack] = React.useState(false)
  const [stats, setStats] = React.useState(null)
  const [copied, setCopied] = React.useState(false)
  // the doc, read without leaving the page
  const [docOpen, setDocOpen] = React.useState(false)
  const copyTimer = React.useRef(null)
  React.useEffect(() => () => copyTimer.current && clearTimeout(copyTimer.current), [])

  // Live availability for the four letters, softly debounced.
  React.useEffect(() => {
    const c = normChoice(choice)
    if (c.length < 4) {
      setAvail(null)
      return undefined
    }
    const p = choiceProblem(c)
    if (p) {
      setAvail(p)
      return undefined
    }
    if (!enabled) {
      setAvail('free')
      return undefined
    }
    let live = true
    setAvail('checking')
    const id = setTimeout(async () => {
      const r = await checkChoice(c)
      if (!live) return
      if (!r?.ok) setAvail(null)
      else setAvail(r.available ? 'free' : r.reason === 'reserved' ? 'reserved' : r.reason === 'format' ? 'format' : 'taken')
    }, 400)
    return () => {
      live = false
      clearTimeout(id)
    }
  }, [choice, enabled])

  // The entry's numbers, refreshed while the account view is up (same key-gated
  // stats RPC the old program used).
  React.useEffect(() => {
    if (phase !== 'account' || !account?.code) return undefined
    const dash = loadDash()
    if (!dash || dash.code !== account.code) return undefined
    let live = true
    const pull = async () => {
      const s = await recruitStats({ code: dash.code, key: dash.key })
      if (live && s.ok) setStats(s)
    }
    pull()
    const id = setInterval(pull, 30000)
    return () => {
      live = false
      clearInterval(id)
    }
  }, [phase, account])

  const errFor = (slug) =>
    ({
      email: t('trial.errEmail'),
      rate: t('trial.errRate'),
      send: t('trial.errSend'),
      code: t('trial.errCode'),
      expired: t('trial.errExpired'),
      name: t('trial.errName'),
      code_taken: t('trial.errCodeTaken'),
      code_reserved: t('trial.choiceReserved'),
      code_format: t('trial.choiceFormat'),
      handle_taken: t('trial.errHandleTaken'),
      banned: t('trial.errBanned'),
      unknown: t('trial.errUnknown'),
      network: t('trial.errGeneric'),
    })[slug] || t('trial.errGeneric')

  const begin = async (which) => {
    if (busy) return
    setErr('')
    if (which === 'register') {
      if (name.trim().length < 2) return setErr(t('trial.errName'))
      if (!isValidHandle(handle)) return setErr(t('trial.errHandle'))
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr(t('trial.errEmail'))
      if (choiceProblem(choice)) return setErr(t('trial.choiceFormat'))
      if (avail === 'taken') return setErr(t('trial.errCodeTaken'))
      if (avail === 'reserved') return setErr(t('trial.choiceReserved'))
      if (!agree) return setErr(t('trial.errAgree'))
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setErr(t('trial.errEmail'))
    }
    setBusy(true)
    const r = await startEmail(email)
    setBusy(false)
    if (!r?.ok) return setErr(errFor(r?.error))
    setMode(which)
    setEmailToken(r.token)
    setDigits('')
    setPhase('code')
  }

  const confirm = async () => {
    if (busy || digits.replace(/\D/g, '').length !== 6) return
    setErr('')
    setBusy(true)
    const r =
      mode === 'register'
        ? await claimTrial({ token: emailToken, code: digits, name, handle: normHandle(handle), choice })
        : await loginTrial({ token: emailToken, code: digits })
    setBusy(false)
    if (!r?.ok) return setErr(errFor(r?.error))
    const acct = { code: r.code, handle: r.handle || normHandle(handle), name: r.name || name.trim() }
    setAccount(acct)
    setWelcomeBack(!!r.existing || mode === 'login')
    setStats(null)
    setPhase('account')
  }

  const share = async () => {
    const link = trialLink(account?.code || '')
    try {
      if (navigator.share) {
        await navigator.share({ url: link })
        return
      }
    } catch {
      /* dismissed — fall through */
    }
    const ok = await copyText(link)
    if (ok) {
      setCopied(true)
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2200)
    }
  }

  const switchAccount = () => {
    clearTrialAccount()
    setAccount(null)
    setStats(null)
    setWelcomeBack(false)
    setEmail('')
    setDigits('')
    setPhase('form')
    setMode('register')
  }

  // ── the entry panel (form / code / account), rendered inside the page ──
  const entry = (
    <GlassPanel C={C} style={{ padding: SPACE.xl, display: 'flex', flexDirection: 'column', gap: SPACE.lg }} id="enter">
      {phase === 'account' && account ? (
        <>
          <Kicker C={C}>{t('trial.accountKicker')}</Kicker>
          <Title C={C}>{t('trial.accountTitle')}</Title>
          {welcomeBack && <Note C={C} tone="quiet">{t('trial.welcomeBack')}</Note>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
            <Kicker C={C} micro>{t('trial.linkLabel')}</Kicker>
            <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 'clamp(16px, 5vw, 21px)', color: C.cream, wordBreak: 'break-all', userSelect: 'all', WebkitUserSelect: 'all' }}>
              {trialLink(account.code).replace(/^https?:\/\//, '')}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: SPACE.sm }}>
              <Kicker C={C} micro>{t('trial.codeWord')}</Kicker>
              <span style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: SIZE.lead, letterSpacing: '3px', color: C.star }}>{account.code}</span>
            </div>
          </div>
          <PrimaryButton C={C} onClick={share}>{copied ? t('trial.copied') : t('trial.share')}</PrimaryButton>
          <div style={{ borderTop: `1px solid ${C.line}` }}>
            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <EntryStat C={C} value={(stats ? Number(stats.visits || 0) : 0).toLocaleString()} label={t('trial.statVisits')} />
              <span aria-hidden style={{ width: 1, alignSelf: 'stretch', margin: `${SPACE.md}px 0`, background: C.line }} />
              <EntryStat C={C} value={(stats ? Number(stats.signups || 0) : 0).toLocaleString()} label={t('trial.statSignups')} lit={!!stats && Number(stats.signups || 0) > 0} />
            </div>
            {stats && Array.isArray(stats.days) && stats.days.length > 0 && (
              <>
                <WeekBars C={C} days={stats.days} />
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: SPACE.sm }}>
                  <Kicker C={C} micro>{t('trial.week')}</Kicker>
                </div>
              </>
            )}
          </div>
          <Note C={C} tone="quiet">{t('trial.sendReminder')}</Note>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GhostButton C={C} onClick={switchAccount} style={{ fontSize: SIZE.meta }}>{t('trial.signout')}</GhostButton>
          </div>
        </>
      ) : phase === 'code' ? (
        <>
          <Kicker C={C}>{mode === 'login' ? t('trial.loginKicker') : t('trial.registerKicker')}</Kicker>
          <Title C={C}>{t('trial.codeTitle')}</Title>
          <Small C={C}>{t('trial.codeSent', { email: email.trim().toLowerCase() })}</Small>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
            <Kicker C={C} micro>{t('trial.codeLabel')}</Kicker>
            <Field C={C} kind="text" value={digits} onChange={(v) => setDigits(v.replace(/\D/g, '').slice(0, 6))} placeholder="000000" onEnter={confirm} emphasis />
          </div>
          {err && <Note C={C} tone="accent">{err}</Note>}
          <PrimaryButton C={C} disabled={busy || digits.replace(/\D/g, '').length !== 6} onClick={confirm}>
            {busy ? t('trial.confirming') : mode === 'login' ? t('trial.login') : t('trial.confirm')}
          </PrimaryButton>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <GhostButton C={C} onClick={() => { setPhase('form'); setErr('') }} style={{ fontSize: SIZE.meta }}>{t('trial.back')}</GhostButton>
            <GhostButton C={C} onClick={() => begin(mode)} style={{ fontSize: SIZE.meta }}>{t('trial.resend')}</GhostButton>
          </div>
        </>
      ) : (
        <>
          <Kicker C={C}>{t('trial.enterKicker')}</Kicker>
          <Title C={C}>{t('trial.enterTitle')}</Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
            <Kicker C={C} micro>{t('trial.nameLabel')}</Kicker>
            <Field C={C} kind="text" value={name} onChange={setName} placeholder={t('trial.namePlaceholder')} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
            <Kicker C={C} micro>{t('trial.handleLabel')}</Kicker>
            <Field C={C} kind="handle" value={handle} onChange={setHandle} placeholder={t('you.handle')} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
            <Kicker C={C} micro>{t('trial.emailLabel')}</Kicker>
            <Field C={C} kind="email" value={email} onChange={setEmail} placeholder={t('trial.emailPlaceholder')} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
            <Kicker C={C} micro>{t('trial.choiceLabel')}</Kicker>
            <Field C={C} kind="text" value={choice} onChange={(v) => setChoice(normChoice(v))} placeholder="abcd" />
            <LinkPreview C={C} choice={choice} state={avail} />
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.md, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3, accentColor: C.star, width: 16, height: 16 }} />
            <span style={{ fontSize: SIZE.small, lineHeight: 1.5, color: C.muted }}>{t('trial.agree')}</span>
          </label>
          {err && <Note C={C} tone="accent">{err}</Note>}
          <PrimaryButton C={C} disabled={busy} onClick={() => begin('register')}>
            {busy ? t('trial.sending') : t('trial.register')}
          </PrimaryButton>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm }}>
            <Mono C={C}>{t('trial.loginKicker')}</Mono>
            <GhostButton C={C} onClick={() => begin('login')} style={{ padding: 0, fontSize: SIZE.meta }}>{t('trial.login')}</GhostButton>
          </div>
        </>
      )}
    </GlassPanel>
  )

  return (
    <Shell>
      <div className="enter" style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
        <div className="floaty"><Brandmark C={C} size={30} /></div>
      </div>

      <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xxl, paddingTop: SPACE.xxl }}>
        {/* what this is, in three lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <Kicker C={C}>{TRIAL.kicker}</Kicker>
          <Display C={C}>
            {TRIAL.title1}<br /><span style={{ color: C.star }}>{TRIAL.title2}</span>
          </Display>
          <Small C={C} style={{ lineHeight: 1.65 }}>{TRIAL.intro}</Small>
        </div>

        {/* the clock */}
        <DeadlineCard C={C} />

        {/* the two videos and the one percent: the page's main visual */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.md }}>
          {TRIAL.makes.map((m) => (
            <MakeCard key={m.title} C={C} n={m.n} kind={m.kind} title={m.title} line={m.line} />
          ))}
        </div>

        {/* everything else is in the doc, and the doc opens here */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <OutlineButton C={C} onClick={() => setDocOpen(true)}>{t('trial.docView')}</OutlineButton>
          <div style={{ display: 'flex', justifyContent: 'center', gap: SPACE.lg }}>
            <a href={TRIAL_DOC.pdf} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: '.5px', color: C.muted, textDecorationColor: rgba(C.muted, 0.5), textUnderlineOffset: 3 }}>
              {t('trial.docPdf')}
            </a>
            <a href={TRIAL_DOC.docx} download style={{ fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: '.5px', color: C.muted, textDecorationColor: rgba(C.muted, 0.5), textUnderlineOffset: 3 }}>
              {t('trial.docDownload')}
            </a>
          </div>
        </div>

        {/* four steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
          <SectionTitle C={C}>{t('trial.stepsLabel')}</SectionTitle>
          <StepRail C={C} steps={TRIAL.steps} />
        </div>

        {/* and the field that hands you your link */}
        {entry}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.md, textAlign: 'center' }}>
          <Small C={C} align="center" style={{ lineHeight: 1.6 }}>{TRIAL.everyone}</Small>
          <Mono C={C}>{TRIAL.contact}</Mono>
        </div>
      </div>

      <ExitRow C={C} style={{ paddingTop: SPACE.xl }}>
        <GhostButton C={C} onClick={() => { window.location.href = '/' }}>{t('trial.toApp')}</GhostButton>
      </ExitRow>

      {docOpen && <DocSheet C={C} onClose={() => setDocOpen(false)} />}
    </Shell>
  )
}

// The admin desk used to live here. It now has its own file — components/admin.jsx —
// because it stopped sharing anything with this one: no palette, no ui.jsx, no
// type scale. An operations console and a competition poster want opposite
// things from a design, and keeping them in one file kept pulling the console
// back toward the product's voice.
