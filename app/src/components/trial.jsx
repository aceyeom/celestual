// trial.jsx — the Celestual Challenge page at /trial.
//
// The competition's whole front door: the official doc distilled to a screen
// (trialContent.js), the doc itself readable IN PLACE (a viewer sheet, not a
// tab that navigates people away mid-decision), and the self-serve entry —
// verify an email, sign, choose the four letters that become a root-level
// tracking link (celestual.us/<code>). A competitor coming back sees their
// entry: the link, the code, the numbers.
//
// This page runs WITHOUT the living galaxy behind it (App.jsx skips the canvas
// here). The sky is the product's feeling; this page's job is to be read, at
// length, by someone deciding whether to spend a week on us. It keeps the
// palette and a still gradient, and drops the motion.
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
  Field, Note, ExitRow, Display, Title, Small, Serif, Icon, useDialog,
  rgba, RADIUS, SPACE, FONT, SIZE,
} from './ui.jsx'
import { Shell } from './screens.jsx'
import { TRIAL, TRIAL_DOC } from '../trialContent.js'

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

const fmtDay = (x) => {
  if (!x) return ''
  try {
    return new Date(x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase()
  } catch {
    return ''
  }
}

// ── the brief's little building blocks ───────────────────────────────────────

function NumLine({ C, n, head, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.md }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1, background: rgba(C.star, 0.12), color: C.star, fontFamily: FONT.mono, fontSize: SIZE.meta }}>
        {n}
      </span>
      <span style={{ fontSize: SIZE.small, lineHeight: 1.6, color: C.muted }}>
        {head && <span style={{ color: C.cream, fontWeight: 600 }}>{head} </span>}
        {children}
      </span>
    </div>
  )
}

function DotLine({ C, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.md }}>
      <span aria-hidden style={{ color: rgba(C.star, 0.8), fontFamily: FONT.serif, fontSize: 13, lineHeight: '20px', flexShrink: 0 }}>✦</span>
      <span style={{ fontSize: SIZE.small, lineHeight: 1.6, color: C.muted }}>{children}</span>
    </div>
  )
}

function SectionTitle({ C, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, paddingTop: SPACE.md }}>
      <Kicker C={C}>{children}</Kicker>
      <span aria-hidden style={{ height: 1, width: 42, background: rgba(C.star, 0.4) }} />
    </div>
  )
}

function ScoreRow({ C, cat, weight, what }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: `${SPACE.md}px 0`, borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.md }}>
        <span style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: SIZE.body, color: C.cream }}>{cat}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.meta, color: C.star }}>{weight}</span>
      </div>
      <div aria-hidden style={{ height: 3, borderRadius: 2, background: rgba(C.cream, 0.07), overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${weight}%`, borderRadius: 2, background: `linear-gradient(90deg, ${rgba(C.star, 0.9)}, ${rgba(C.them, 0.7)})` }} />
      </div>
      <span style={{ fontSize: SIZE.small, lineHeight: 1.55, color: C.muted }}>{what}</span>
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

// One of the poster's three numbers — a figure in the emotional register, its
// unit whispered beneath. The tiles are the page's first read.
function StatTile({ C, v, l }) {
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '16px 8px 13px', borderRadius: RADIUS.inner, border: `1px solid ${C.line}`, background: rgba(C.ink2, 0.55) }}>
      <span style={{ fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 30, lineHeight: 1, color: C.star, textShadow: `0 0 22px ${rgba(C.star, 0.35)}` }}>{v}</span>
      <Kicker C={C} micro>{l}</Kicker>
    </div>
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

  const availLine =
    avail === 'checking' ? (
      <Mono C={C}>{t('you.checking')}</Mono>
    ) : avail === 'free' ? (
      <Mono C={C} color={C.star}>{t('trial.choiceFree')}</Mono>
    ) : avail === 'taken' ? (
      <Mono C={C} color={C.them}>{t('trial.choiceTaken')}</Mono>
    ) : avail === 'reserved' ? (
      <Mono C={C} color={C.them}>{t('trial.choiceReserved')}</Mono>
    ) : avail === 'format' ? (
      <Mono C={C}>{t('trial.choiceFormat')}</Mono>
    ) : (
      <Mono C={C}>{t('trial.choiceNote', { code: normChoice(choice) || 'abcd' })}</Mono>
    )

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
            {availLine}
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

      <div className="enter" style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xl, paddingTop: SPACE.xxl }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <Kicker C={C}>{TRIAL.kicker}</Kicker>
          <Display C={C}>
            {TRIAL.title1}<br /><span style={{ color: C.star }}>{TRIAL.title2}</span>
          </Display>
          <Small C={C} style={{ lineHeight: 1.65 }}>{TRIAL.intro}</Small>
        </div>

        {/* the three numbers that are the pitch */}
        <div style={{ display: 'flex', gap: SPACE.md }}>
          {TRIAL.stats.map((s) => (
            <StatTile key={s.l} C={C} v={s.v} l={s.l} />
          ))}
        </div>

        {/* the doc — the whole detail lives there; the page is the poster.
            It opens IN PLACE (see DocSheet) so reading it never costs the tab. */}
        <GlassPanel C={C} style={{ padding: SPACE.xl, display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <Kicker C={C}>{TRIAL.doc.title}</Kicker>
          <Small C={C}>{TRIAL.doc.sub}</Small>
          <OutlineButton C={C} onClick={() => setDocOpen(true)}>{t('trial.docView')}</OutlineButton>
          <div style={{ display: 'flex', justifyContent: 'center', gap: SPACE.lg }}>
            <a href={TRIAL_DOC.pdf} target="_blank" rel="noopener noreferrer" style={{ fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: '.5px', color: C.muted, textDecorationColor: rgba(C.muted, 0.5), textUnderlineOffset: 3 }}>
              {t('trial.docPdf')}
            </a>
            <a href={TRIAL_DOC.docx} download style={{ fontFamily: FONT.mono, fontSize: SIZE.meta, letterSpacing: '.5px', color: C.muted, textDecorationColor: rgba(C.muted, 0.5), textUnderlineOffset: 3 }}>
              {t('trial.docDownload')}
            </a>
          </div>
        </GlassPanel>

        <SectionTitle C={C}>how it runs</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          {TRIAL.steps.map((s, i) => (
            <NumLine key={i} C={C} n={i + 1} head={s.head}>{s.body}</NumLine>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Mono C={C}>{TRIAL.deadline}</Mono>
        </div>

        {/* the two videos, side by side where the screen allows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: SPACE.md }}>
          {TRIAL.videos.map((v) => (
            <GlassPanel key={v.title} C={C} inset style={{ padding: SPACE.lg, display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
              <Kicker C={C} micro>{v.title}</Kicker>
              <Small C={C} style={{ color: C.cream }}>{v.sub}</Small>
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
                {v.pts.map((p, i) => (
                  <DotLine key={i} C={C}>{p}</DotLine>
                ))}
              </div>
            </GlassPanel>
          ))}
        </div>

        <SectionTitle C={C}>how we score it</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {TRIAL.scoring.map((r) => (
            <ScoreRow key={r.cat} C={C} cat={r.cat} weight={r.weight} what={r.what} />
          ))}
        </div>
        <Mono C={C}>{TRIAL.scoringNote}</Mono>
        <Note C={C} tone="accent">{TRIAL.zeroRule}</Note>

        <SectionTitle C={C}>hard rules</SectionTitle>
        <GlassPanel C={C} inset style={{ padding: SPACE.lg, display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          {TRIAL.hardRules.map((r, i) => (
            <DotLine key={i} C={C}>{r}</DotLine>
          ))}
          <Mono C={C} style={{ paddingTop: SPACE.xs }}>{TRIAL.hardNote}</Mono>
        </GlassPanel>

        <SectionTitle C={C}>what you win</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <Serif C={C} size={SIZE.title} style={{ color: C.star }}>{TRIAL.win.headline}</Serif>
          <Small C={C}>{TRIAL.win.sub}</Small>
          <Small C={C}>{TRIAL.win.everyone}</Small>
        </div>

        {/* the product, in its own one line */}
        <div style={{ padding: `${SPACE.lg}px 0`, borderTop: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}`, textAlign: 'center' }}>
          <Serif C={C} size={SIZE.lead} style={{ color: rgba(C.cream, 0.92) }}>{TRIAL.mechanic}</Serif>
        </div>

        {/* the doc's strategy note — the one paragraph that changes how a
            competitor spends the week, so it earns a place on the page */}
        <GlassPanel C={C} inset style={{ padding: SPACE.xl, display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <Kicker C={C}>{TRIAL.understand.title}</Kicker>
          <Small C={C} style={{ lineHeight: 1.7 }}>{TRIAL.understand.body}</Small>
        </GlassPanel>

        {entry}

        <div style={{ display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
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
