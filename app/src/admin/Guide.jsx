// ── the guide ───────────────────────────────────────────────────────────────
//
// The desk, explained to somebody who has never seen it: what the product is
// in four sentences, what each screen is for, and what to do when the eight
// things that actually happen happen. Written so a new person on the team can
// take a message from a user and know which screen to open, without anybody
// having to be asked.
import { Note, Btn } from './parts.jsx'

const SCREENS = [
  ['the desk', 'overview', 'what is waiting on you, the numbers that matter, and the graph. open here every day.'],
  ['people', 'people', 'one row per person: the handle they proved, the campus address, the letters they wrote. search by any of them.'],
  ['verification', 'handles', 'the instagram DM records. codes started and never finished, who was admitted by hand, and the six things you can do to a handle.'],
  ['pings', 'pings', 'the product itself: what is standing, what went mutual, what is about to lapse. never who a standing ping is on.'],
  ['the wall', 'wall', 'every letter and its state. held letters wait here for a person to read them.'],
  ['reports', 'reports', 'letters somebody flagged. the letter is already down; you decide whether it goes back up.'],
  ['waiting', 'waitlist', 'names people looked for on the wall and did not find, and which flyer brought them.'],
  ['the resolver', 'cache', 'the face and name under a typed handle, the apify switch, and who has spent what against the caps.'],
  ['access', 'access', 'sign a browser in as a handle or a campus with no DM. for testing, and for a person whose code never came.'],
  ['settings', 'settings', 'the release gate, the resolver switch, the four caps, the walls, and the log of what the desk did.'],
]

const WHEN = [
  {
    t: 'a person says their code did not work',
    say: 'open verification and look their handle up. "mid attempt, and stuck" means the DM never reached us or the code lapsed: clear their stuck codes and ask them once more. if they are refused, somebody banned the handle on purpose. if nothing is wrong, mint them a sign in link on access.',
    to: ['handles', 'access'],
  },
  {
    t: 'a letter on the wall was reported',
    say: 'it came down the moment the report was filed, so nobody is looking at it. read it on reports when you have a minute. uphold and it stays down; dismiss and it goes back up. if the person it is about has asked, shut the name.',
    to: ['reports'],
  },
  {
    t: 'somebody wants their name off the wall',
    say: 'if they can prove the handle, the wall lets them take letters down themselves. if they wrote in instead, shut the name from any report on it, or find a letter to it on the wall screen and take it down, one at a time.',
    to: ['reports', 'wall'],
  },
  {
    t: 'somebody wants their @ to never be entered again',
    say: 'send them to /optout: one DM and it is done, and it erases every ping both ways. if they cannot DM, "erase and refuse" on verification does the same from here. "lift the block" undoes it.',
    to: ['handles'],
  },
  {
    t: 'the apify bill is climbing',
    say: 'the resolver screen says who is spending. one device at its cap is a person typing a lot; hundreds of calls in a day is somebody scripting. turn the resolver off there and the bill stops at once; lower the daily ceiling on settings if it should never get that high again.',
    to: ['cache', 'settings'],
  },
  {
    t: 'the card under the field never shows up for somebody',
    say: 'either the resolver is off, or their device, their address or the day is at its cap. the resolver screen shows all three. a cache hit always shows whatever the caps say.',
    to: ['cache'],
  },
  {
    t: 'you want to try the product as a real person would',
    say: 'mint a sign in link on access with a handle you own and open it on your phone. add a campus address to the same link to walk the wall. nothing about a DM is needed.',
    to: ['access'],
  },
  {
    t: 'the wall should open, or close',
    say: 'settings, the walls. closed, nobody can write, report or join the waitlist; the names already on it stay readable.',
    to: ['settings'],
  },
  {
    t: 'a merge stopped and asked',
    say: 'two rows both proved something that cannot be on one person: two different handles or two different campuses. nothing was moved. the desk shows the pair; look at both on people, decide which is the person, and close the question. there is no button that merges them, on purpose.',
    to: ['overview', 'people'],
  },
]

export default function Guide({ go }) {
  const word = (id) => SCREENS.find((s) => s[1] === id)?.[0] || id
  return (
    <>
      <div className="ad-head">
        <h1>the guide</h1>
        <span className="ad-head-note">for whoever is holding this desk today.</span>
      </div>

      <div className="ad-head is-sub" style={{ marginTop: 6 }}><h2>the product, in four sentences</h2></div>
      <Note>
        a person places a ping on somebody's instagram handle. that somebody is never told. if, and only
        if, they independently place one back, both find out at the same moment. nothing else is ever
        revealed to anybody, and the server keeps who was entered only as a salted one way hash.
      </Note>
      <Note>
        beside it, the wall: short anonymous letters, each to one handle, on a campus. the names are
        public; reading and writing need a campus address; every letter is screened before it appears;
        the person a letter is about can take it down; the author is never named unless asked and willing.
      </Note>

      <div className="ad-head is-sub"><h2>the screens</h2></div>
      <div className="ad-rows">
        {SCREENS.map(([w, id, say]) => (
          <div className="ad-row" key={id}>
            <div className="ad-row-l">
              <div className="ad-row-t">{w}</div>
              <Note>{say}</Note>
            </div>
            <Btn onClick={() => go(id)}>open</Btn>
          </div>
        ))}
      </div>

      <div className="ad-head is-sub"><h2>when something happens</h2></div>
      <div className="ad-guide">
        {WHEN.map((w) => (
          <div className="ad-guide-row" key={w.t}>
            <div className="ad-guide-t">{w.t}</div>
            <Note>{w.say}</Note>
            <div className="ad-btns" style={{ justifyContent: 'flex-start' }}>
              {w.to.map((id) => <Btn key={id} onClick={() => go(id)}>{word(id)}</Btn>)}
            </div>
          </div>
        ))}
      </div>

      <div className="ad-head is-sub"><h2>what the desk cannot do</h2></div>
      <Note>
        it cannot read who a standing ping is on. it cannot stamp a handle verified without a proof: the
        sign in link mints a proof and the browser does the rest through the one function allowed to. it
        cannot merge two people. and it cannot show the salt. those four are not missing; they are the
        product.
      </Note>
    </>
  )
}
