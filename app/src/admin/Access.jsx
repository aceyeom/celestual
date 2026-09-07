// ── access ──────────────────────────────────────────────────────────────────
//
// The doors the team can open without the product's own proofs. Two of them,
// on one screen, with the situations they are for written beside them.
//
// ── the pass list (migration 0043) ──────────────────────────────────────────
// Who is let through as if they had passed. An address on it gets the wall's
// code mailed to that inbox, whatever its domain, and opens the wall once the
// code checks out; the team does not have campus addresses, and neither do
// most of the people the product is shown to before launch. A handle on it
// skips the DM: the verification is written the moment it is started and the
// browser holds the same thirty day proof a DM would have left. The list is
// the whole of it. Take a row off and the next attempt is asked for the real
// thing.
//
// ── the sign in link (migration 0039) ───────────────────────────────────────
// One address that signs whichever browser opens it in as a handle, a campus
// address, or both. It works once and it lasts an hour: for a person whose
// code never came, or to walk the product as somebody on a phone.
//
// Neither door stamps somebody verified from here. The pass writes the same
// verification row the DM leaves, marked pass, and the link mints a proof the
// way the mailed link does; the browser binds the handle through the one
// function allowed to (celestual_user_bind_handle).
import { useCallback, useEffect, useState } from 'react'
import { deskSignin, deskPasses, deskPassAdd, deskPassRemove } from '../api/admin.js'
import { Field, Btn, Arm, CopyBtn, Note, Empty, When, State, failWord } from './parts.jsx'

export default function Access({ password, go, onLock }) {
  // ── the pass list ──
  const [passes, setPasses] = useState(null)
  const [pass, setPass] = useState({ value: '', note: '' })
  const [passBusy, setPassBusy] = useState('')
  const [passSaid, setPassSaid] = useState('')

  const loadPasses = useCallback(async () => {
    const r = await deskPasses(password)
    if (r?.error === 'password') { onLock && onLock(); return }
    setPasses(r && r.ok ? r.rows : { error: r?.error || 'network' })
  }, [password, onLock])

  useEffect(() => { loadPasses() }, [loadPasses])

  const givePass = useCallback(async () => {
    if (passBusy || !pass.value.trim()) return
    setPassBusy('add')
    setPassSaid('')
    const r = await deskPassAdd(password, pass)
    setPassBusy('')
    if (!r?.ok) {
      setPassSaid(
        r?.error === 'exists' ? 'that one is already on the list'
          : r?.error === 'bad_input' ? 'an address, or a handle'
            : failWord(r),
      )
      if (r?.error === 'password') onLock && onLock()
      return
    }
    setPass({ value: '', note: '' })
    await loadPasses()
  }, [password, pass, passBusy, loadPasses, onLock])

  const takePass = useCallback(async (id) => {
    if (passBusy) return
    setPassBusy(id)
    setPassSaid('')
    const r = await deskPassRemove(password, id)
    setPassBusy('')
    if (!r?.ok) {
      setPassSaid(failWord(r))
      if (r?.error === 'password') onLock && onLock()
      return
    }
    await loadPasses()
  }, [password, passBusy, loadPasses, onLock])

  // ── the sign in link ──
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
          : r?.error === 'email' ? 'the campus address has to end in .edu, or be on the pass list'
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
        <span className="ad-head-note">who gets through without the campus code's domain rule or the DM, and a link that signs one browser in.</span>
      </div>

      {/* ── the pass list ── */}
      <div className="ad-head is-sub" style={{ marginTop: 6 }}>
        <h2>the pass list</h2>
        <span className="ad-head-note">an address here gets the wall's code at that inbox, whatever the domain. a handle here skips the DM.</span>
      </div>

      <div className="ad-panel">
        <div className="ad-form">
          <Field label="email or handle" value={pass.value} onChange={(v) => { setPass((p) => ({ ...p, value: v })); setPassSaid('') }}
            placeholder="ayeom28@gmail.com" id="pass-value" hint="the address the code goes to, or the @ that is let in" />
          <Field label="why" value={pass.note} onChange={(v) => setPass((p) => ({ ...p, note: v }))}
            placeholder="the team" id="pass-note" mono={false} hint="kept beside the row" />
          <Btn tone="key" disabled={passBusy === 'add' || !pass.value.trim()} onClick={givePass}>
            {passBusy === 'add' ? 'adding' : 'give a pass'}
          </Btn>
        </div>
        {passSaid ? <p className="ad-head-note" style={{ margin: '12px 0 0', color: 'var(--ad-stop)' }}>{passSaid}</p> : null}
      </div>

      {!passes ? <Empty>reading</Empty>
        : passes.error ? <Empty>the list could not be read.</Empty>
          : passes.length === 0 ? <Empty>nobody has a pass. everybody is asked for the real thing.</Empty>
            : (
              <div className="ad-scroll">
                <table className="ad-table">
                  <thead>
                    <tr><th className="is-wide">who</th><th>gets</th><th>why</th><th>added</th><th /></tr>
                  </thead>
                  <tbody>
                    {passes.map((p) => (
                      <tr key={p.id}>
                        <td className="is-wide"><span className="ad-id is-key">{p.kind === 'handle' ? `@${p.value}` : p.value}</span></td>
                        <td><State tone="is-live">{p.kind === 'handle' ? 'no DM' : 'the code, any domain'}</State></td>
                        <td>{p.note ? <span className="ad-id is-dim">{p.note}</span> : ''}</td>
                        <td><When at={p.created_at} /></td>
                        <td className="is-act">
                          <Arm armed={`take ${p.kind === 'handle' ? `@${p.value}` : p.value} off`} busy={passBusy === p.id} onAct={() => takePass(p.id)}>
                            take it off
                          </Arm>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

      {/* ── the sign in link ── */}
      <div className="ad-head is-sub">
        <h2>a sign in link</h2>
        <span className="ad-head-note">works once, for an hour, for whichever browser opens it.</span>
      </div>

      <div className="ad-panel">
        <div className="ad-form">
          <Field label="instagram handle" value={form.handle} onChange={f('handle')} placeholder="theirhandle" prefix="@" id="si-handle" hint="signs the browser in on main, as this @" />
          <Field label="campus address" value={form.eduEmail} onChange={f('eduEmail')} placeholder="somebody@berkeley.edu" id="si-edu" hint="opens the wall on that browser. a .edu, or an address on the pass list" />
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
          <div className="ad-guide-t">you do not have a campus address</div>
          <Note>
            put your own address on the pass list. the wall's gate takes a full address typed with its @,
            mails the code to it, and opens on that browser once the code is typed back. a handle on the
            list is let in the moment it is typed, with no DM, on every device.
          </Note>
        </div>
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
