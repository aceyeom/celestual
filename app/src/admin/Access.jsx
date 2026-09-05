// ── access ──────────────────────────────────────────────────────────────────
//
// The doors the team can open without the product's own proofs. Migration
// 0039's sign in link, and the six handle actions the old layer has always
// had, on one screen, with the situations they are for written beside them.
//
// ── the sign in link ────────────────────────────────────────────────────────
// One address that signs whichever browser opens it in as a handle, a campus
// address, or both. It works once and it lasts an hour. What it is for:
//
//   seeing the product as a person   open it yourself, on a phone, as any
//                                    handle, and walk the whole flow with no
//                                    DM in the way
//   a person whose code never came   mint one for their handle and send it to
//                                    them. their browser holds the same thirty
//                                    day proof the DM would have left
//   testing the wall                 a campus address that is not a real
//                                    inbox, so the gate opens on this browser
//
// What it is NOT: a way to stamp somebody verified from here. The link mints a
// proof the way the mailed link does, and the browser binds the handle through
// the one function allowed to (celestual_user_bind_handle). The record says
// the desk minted it, so the verification screen can tell it from a DM.
import { useCallback, useState } from 'react'
import { deskSignin } from '../api/admin.js'
import { Field, Btn, CopyBtn, Note, failWord } from './parts.jsx'

export default function Access({ password, go, onLock }) {
  const [form, setForm] = useState({ handle: '', eduEmail: '', email: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [said, setSaid] = useState('')
  const [link, setLink] = useState(null)

  const mint = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setSaid('')
    setLink(null)
    const r = await deskSignin(password, form)
    setBusy(false)
    if (!r?.ok) {
      setSaid(
        r?.error === 'banned' ? 'that handle is refused. lift the block first, on purpose.'
          : r?.error === 'email' ? 'the campus address has to end in .edu'
            : r?.error === 'invalid' ? 'a handle, a campus address, or both'
              : r?.error === 'conflict_edu' ? 'that browser row already holds a different campus. the merge stopped and asked; see the desk.'
                : failWord(r),
      )
      if (r?.error === 'password') onLock && onLock()
      return
    }
    const hash = [r.login_token ? `t=${r.login_token}` : '', r.session_token ? `s=${r.session_token}` : '']
      .filter(Boolean).join('&')
    setLink({
      url: `${window.location.origin}/signin#${hash}`,
      handle: r.handle,
      edu: r.edu_email,
      expires: r.expires_at,
    })
  }, [password, form, busy, onLock])

  const f = (k) => (v) => setForm((x) => ({ ...x, [k]: v }))

  return (
    <>
      <div className="ad-head">
        <h1>access</h1>
        <span className="ad-head-note">sign a browser in without the DM or the code, and the six things you can do to a handle.</span>
      </div>

      <div className="ad-head is-sub" style={{ marginTop: 6 }}>
        <h2>a sign in link</h2>
        <span className="ad-head-note">works once, for an hour, for whichever browser opens it.</span>
      </div>

      <div className="ad-panel">
        <div className="ad-form">
          <Field label="instagram handle" value={form.handle} onChange={f('handle')} placeholder="theirhandle" prefix="@" id="si-handle" hint="signs the browser in on main, as this @" />
          <Field label="campus address" value={form.eduEmail} onChange={f('eduEmail')} placeholder="somebody@berkeley.edu" id="si-edu" hint="opens the wall on that browser. need not be a real inbox" />
          <Field label="plain email" value={form.email} onChange={f('email')} placeholder="optional" id="si-email" hint="a note on the row. nothing is sent to it" />
          <Field label="why" value={form.note} onChange={f('note')} placeholder="testing the flow on my phone" id="si-note" mono={false} hint="kept in the log" />
        </div>
        <div className="ad-btns" style={{ justifyContent: 'flex-start', marginTop: 12 }}>
          <Btn tone="key" disabled={busy || (!form.handle.trim() && !form.eduEmail.trim())} onClick={mint}>
            {busy ? 'minting' : 'make the link'}
          </Btn>
        </div>
        {said ? <p className="ad-head-note" style={{ margin: '12px 0 0', color: 'var(--ad-stop)' }}>{said}</p> : null}

        {link ? (
          <div className="ad-link">
            <div className="wl-label" style={{ marginBottom: 6 }}>
              the link{link.handle ? <> · <span className="wl-h">@{link.handle}</span></> : null}{link.edu ? <> · <span className="wl-h">{link.edu}</span></> : null}
            </div>
            <code className="ad-link-url">{link.url}</code>
            <div className="ad-btns" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
              <CopyBtn text={link.url} tone="key">copy the link</CopyBtn>
              <a className="ad-btn" href={link.url} target="_blank" rel="noreferrer noopener">open it in a new tab</a>
            </div>
            <Note>
              it is spent the moment it is opened, and it lapses in an hour. a browser that opens it holds
              the proof for thirty days; sign out on that device to drop it. the link is a credential: send
              it the way you would send a password.
            </Note>
          </div>
        ) : null}
      </div>

      <div className="ad-head is-sub">
        <h2>when to use which</h2>
      </div>
      <div className="ad-guide">
        <div className="ad-guide-row">
          <div className="ad-guide-t">somebody's DM code never worked</div>
          <Note>
            look their handle up on the verification screen first: a stuck code, a refused handle and a
            ManyChat relay that never answered look different there. if nothing is wrong on our side, mint
            them a link with their handle and send it. they are in as that @, for thirty days.
          </Note>
          <div className="ad-btns" style={{ justifyContent: 'flex-start' }}><Btn onClick={() => go('handles')}>the verification records</Btn></div>
        </div>
        <div className="ad-guide-row">
          <div className="ad-guide-t">you want to walk the product as a person</div>
          <Note>
            mint a link with any handle you own, open it on your phone, and place a ping from the sky
            exactly as a person would. pair it with a campus address to walk the wall too. to be two people
            at once, use two browsers or a private window.
          </Note>
        </div>
        <div className="ad-guide-row">
          <div className="ad-guide-t">a handle should never be entered again</div>
          <Note>
            that is the opt out, and the person can do it themselves at /optout with one DM. from here,
            "erase and refuse" on the verification screen does the same and bars the handle from verifying
            back in; "lift the block" reverses it.
          </Note>
          <div className="ad-btns" style={{ justifyContent: 'flex-start' }}><Btn onClick={() => go('handles')}>the verification records</Btn></div>
        </div>
        <div className="ad-guide-row">
          <div className="ad-guide-t">a person wants everything deleted</div>
          <Note>
            "erase everything they have" on the verification screen: every ping placed and received, the
            proofs, the identity row, their letters. they can come back tomorrow with a fresh DM. it does
            not refuse the handle; that is the other button.
          </Note>
        </div>
      </div>
    </>
  )
}
