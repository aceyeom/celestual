// ── settings ────────────────────────────────────────────────────────────────
//
// Everything about the product that used to be a constant in a migration, an
// environment variable in Vercel or a column edited in a SQL console, on one
// screen, with a sentence beside each thing saying what it does. Migration
// 0039: the desk writes a row, the product reads the row, and nothing has to
// be deployed for a change to take.
//
//   the release gate    whether placing a ping needs the DM proof on the server
//   the resolver        on or off, and the four caps that bound the apify bill
//   the campuses        which walls are open
//   the log             what the desk did, and when
//
// Two things are deliberately NOT here. The salt, which nothing may return.
// And the two client flags (VITE_IG_VERIFY_ENABLED, VITE_HANDLE_RESOLVE), which
// are built into the bundle: turning the resolver off HERE stops apify spend
// at once whatever the bundle says, and the sign in link on the access screen
// is what to use when the DM flow is in the way.
import { useCallback, useEffect, useState } from 'react'
import { deskSettings, deskSettingSet, deskCampusSet, deskCampusAdd, deskLog } from '../api/admin.js'
import { Toggle, Field, Btn, Arm, State, When, Empty, Note, Json, failWord } from './parts.jsx'

const CAPS = [
  ['cap_global', 'everybody, per day', 'the ceiling on the whole day. past it new handles draw nothing and cache hits still answer. this is the most the bill can be'],
  ['cap_user', 'a signed in person, per day', 'counted on the person, not their device, so signing in never halves an allowance'],
  ['cap_device', 'an anonymous device, per day', 'a cookie the resolver issues. the majority case'],
  ['cap_ip', 'an address, per day', 'the backstop. loose on purpose: a residence hall is one address'],
]

export default function Settings({ password, overview, onChanged, onLock }) {
  const [data, setData] = useState(null)
  const [caps, setCaps] = useState({})
  const [saving, setSaving] = useState('')
  const [said, setSaid] = useState('')
  const [log, setLog] = useState(null)
  const [campus, setCampus] = useState({ slug: '', name: '', domain: '' })

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([deskSettings(password), deskLog(password, { limit: 60 })])
    if (s?.error === 'password' || l?.error === 'password') { onLock && onLock(); return }
    if (s && s.ok) {
      setData(s)
      setCaps({
        cap_global: String(s.settings.cap_global), cap_user: String(s.settings.cap_user),
        cap_device: String(s.settings.cap_device), cap_ip: String(s.settings.cap_ip),
      })
    }
    setLog(l && l.ok ? l : { rows: [], error: l?.error || 'network' })
  }, [password, onLock])

  useEffect(() => { load() }, [load])

  const set = useCallback(async (key, value) => {
    if (saving) return
    setSaving(key)
    setSaid('')
    const r = await deskSettingSet(password, key, value)
    setSaving('')
    if (!r?.ok) {
      setSaid(r?.error === 'bad_value' ? 'that is not a number the cap can take' : failWord(r))
      if (r?.error === 'password') onLock && onLock()
      return
    }
    await load()
    onChanged && onChanged()
  }, [password, saving, load, onChanged, onLock])

  const setCampusOpen = useCallback(async (slug, open) => {
    if (saving) return
    setSaving(`campus:${slug}`)
    setSaid('')
    const r = await deskCampusSet(password, slug, open)
    setSaving('')
    if (!r?.ok) { setSaid(failWord(r)); if (r?.error === 'password') onLock && onLock(); return }
    onChanged && onChanged()
    await load()
  }, [password, saving, load, onChanged, onLock])

  const addCampus = useCallback(async () => {
    if (saving) return
    setSaving('campus:add')
    setSaid('')
    const r = await deskCampusAdd(password, campus)
    setSaving('')
    if (!r?.ok) {
      setSaid(r?.error === 'exists' ? 'that slug is taken'
        : r?.error === 'bad_input' ? 'a slug like reed, a name, and a domain ending in .edu'
          : failWord(r))
      if (r?.error === 'password') onLock && onLock()
      return
    }
    setCampus({ slug: '', name: '', domain: '' })
    onChanged && onChanged()
    await load()
  }, [password, saving, campus, load, onChanged, onLock])

  const s = data?.settings || {}
  const campuses = overview?.campuses || []

  return (
    <>
      <div className="ad-head">
        <h1>settings</h1>
        <span className="ad-head-note">a change here takes at once. nothing is deployed.</span>
      </div>

      {said ? <p className="ad-head-note" style={{ margin: '0 0 12px', color: 'var(--ad-stop)' }}>{said}</p> : null}

      {!data ? <Empty>reading</Empty> : (
        <>
          {/* ── the two switches ── */}
          <div className="ad-head is-sub" style={{ marginTop: 6 }}><h2>the switches</h2></div>
          <div className="ad-rows">
            <div className="ad-row">
              <div className="ad-row-l">
                <div className="ad-row-t">the release gate</div>
                <Note>
                  on, the server refuses a ping that does not carry a live instagram DM proof, whatever the
                  app says. off, the app still asks for the DM but the server would take a ping without one.
                  keep it on once real people are on the product.
                </Note>
              </div>
              <Toggle
                on={s.require_ig_verification === 'true'}
                busy={saving === 'require_ig_verification'}
                onChange={(v) => set('require_ig_verification', v ? 'true' : 'false')}
                words={['on. a proof is required', 'off. not required']}
              />
            </div>
            <div className="ad-row">
              <div className="ad-row-l">
                <div className="ad-row-t">the resolver</div>
                <Note>
                  the face and name under a typed handle. off, no new handle reaches apify and no money is
                  spent; handles already in the cache still show. every ping still goes through either way.
                </Note>
              </div>
              <Toggle
                on={s.resolver_enabled !== 'false'}
                busy={saving === 'resolver_enabled'}
                onChange={(v) => set('resolver_enabled', v ? 'true' : 'false')}
                words={['on. new handles are looked up', 'off. only the cache answers']}
              />
            </div>
          </div>

          {/* ── the caps ── */}
          <div className="ad-head is-sub">
            <h2>the apify caps</h2>
            <span className="ad-head-note">rolling twenty four hours. only a call that reached apify counts; a cache hit is free.</span>
          </div>
          <div className="ad-rows">
            {CAPS.map(([key, word, why]) => (
              <div className="ad-row" key={key}>
                <div className="ad-row-l">
                  <div className="ad-row-t">{word}</div>
                  <Note>{why}</Note>
                </div>
                <div className="ad-row-r">
                  <Field
                    label="" value={caps[key] ?? ''} onChange={(v) => setCaps((c) => ({ ...c, [key]: v.replace(/[^0-9]/g, '') }))}
                    id={`cap-${key}`} hint={data.defaults[key] !== s[key] ? `default ${data.defaults[key]}` : 'the default'}
                  />
                  <Btn
                    tone="key"
                    disabled={saving === key || String(caps[key]) === String(s[key]) || !caps[key]}
                    onClick={() => set(key, caps[key])}
                  >
                    {saving === key ? 'saving' : 'save'}
                  </Btn>
                </div>
              </div>
            ))}
          </div>

          {/* ── the campuses ── */}
          <div className="ad-head is-sub">
            <h2>the walls</h2>
            <span className="ad-head-note">a closed wall refuses letters, reports and the waitlist. the index stays readable.</span>
          </div>
          {campuses.length ? (
            <div className="ad-scroll">
              <table className="ad-table">
                <thead>
                  <tr><th className="is-wide">campus</th><th>address</th><th className="is-num">letters live</th><th className="is-num">waiting</th><th>state</th><th /></tr>
                </thead>
                <tbody>
                  {campuses.map((c) => (
                    <tr key={c.slug}>
                      <td className="is-wide"><span className="ad-id">{c.name}</span> <span className="ad-id is-dim">{c.slug}</span></td>
                      <td><span className="ad-id is-dim">{c.edu_domain}</span></td>
                      <td className="is-num">{c.letters}</td>
                      <td className="is-num">{c.waitlist}</td>
                      <td><State tone={c.is_open ? 'is-live' : 'is-off'}>{c.is_open ? 'open' : 'closed'}</State></td>
                      <td className="is-act">
                        {c.is_open
                          ? <Arm armed={`close the ${c.name} wall`} busy={saving === `campus:${c.slug}`} onAct={() => setCampusOpen(c.slug, false)}>close it</Arm>
                          : <Arm tone="go" armed={`open the ${c.name} wall`} busy={saving === `campus:${c.slug}`} onAct={() => setCampusOpen(c.slug, true)}>open it</Arm>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty>no campus yet.</Empty>}
          <div className="ad-form">
            <Field label="slug" value={campus.slug} onChange={(v) => setCampus((c) => ({ ...c, slug: v }))} placeholder="reed" id="campus-slug" />
            <Field label="name" value={campus.name} onChange={(v) => setCampus((c) => ({ ...c, name: v }))} placeholder="Reed" id="campus-name" mono={false} />
            <Field label="address domain" value={campus.domain} onChange={(v) => setCampus((c) => ({ ...c, domain: v }))} placeholder="reed.edu" id="campus-domain" />
            <Btn tone="key" disabled={!campus.slug || !campus.name || !campus.domain || saving === 'campus:add'} onClick={addCampus}>add it, closed</Btn>
          </div>
          <Note>
            a new campus is a row here and one line in the app: the wall's gate names the domain it takes
            (app/src/wall/auth.js). until that line ships, a second campus is a wall nobody can join.
          </Note>

          {/* ── the log ── */}
          <div className="ad-head is-sub">
            <h2>what the desk did</h2>
            <span className="ad-head-note">every change made from here, newest first. one password, so it says what, not who.</span>
          </div>
          {!log ? <Empty>reading</Empty> : log.error ? <Empty>the log could not be read.</Empty> : log.rows.length === 0 ? (
            <Empty>nothing has been changed from the desk yet.</Empty>
          ) : (
            <div className="ad-scroll">
              <table className="ad-table">
                <thead><tr><th>when</th><th>what</th><th className="is-wide">to</th><th>detail</th></tr></thead>
                <tbody>
                  {log.rows.map((l) => (
                    <tr key={l.id}>
                      <td><When at={l.at} exact /></td>
                      <td><State tone="is-off">{l.action.replace(/^desk_/, '').replace(/_/g, ' ')}</State></td>
                      <td className="is-wide">{l.target ? <span className="ad-id is-dim">{l.target}</span> : ''}</td>
                      <td>{l.detail && Object.keys(l.detail).length ? <Json value={l.detail} /> : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  )
}
