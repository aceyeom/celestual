import { Board, Phone, Light, Lockup } from '../kit.jsx'
import { useFaces } from '../parts/carousel.jsx'

// The call to write one: the composer as big as the story will hold it
// under the line, the letter whole and the cursor after it, and the
// mechanic said once over it in plain words. Everything stands on one
// column, the phone's own width: the line, the words under it, the glass
// and the signature all start on its left edge and end inside its right.
const W = 1080
const H = 1920
// the column: the phone, 700 wide, in the middle
const PW = 700
const L = (W - PW) / 2
// set as its writer would have broken it, a phrase to a line, so the two
// years end two lines together and the turn has a line of its own
const NOTE = { name: 'noah', text: 'you said we’d see\nthe cherry blossoms\nnext year.\nit’s next year.' }

function Poster() {
  const ok = useFaces()
  return (
    <Board w={W} h={H} grain={0.08}>
      <Light x={540} y={1070} size={1700} tint="amber" strength={0.72} />
      {ok ? (
        <>
          <h2 className="cw-line" style={{ left: L - 7 }}>send it<br />privately.</h2>
          <p className="cw-sub" style={{ left: L }}>they only read it if they send you one.</p>
          <Phone
            w={PW} x={540} y={1062} tint="amber" seed="cw-noah-3444" tilt={[1.1, 0.9, 0]}
            name={NOTE.name} text={NOTE.text} className="cw-phone"
          />
          <div className="cw-sign" style={{ left: L, width: PW }}><Lockup cell={2} /><span className="cw-url">celestual.us</span></div>
        </>
      ) : null}
    </Board>
  )
}

export default { id: 'ig-story-write', w: W, h: H, title: 'send it privately', format: 'instagram story 9:16', order: 31, Poster }
