import { Board, Phone, Light, Lockup } from '../kit.jsx'
import { useFaces } from '../parts/carousel.jsx'

// The call to write one: the composer as big as the story will hold it,
// mid letter, the cursor waiting where the next sentence starts, and the
// mechanic said once over it in plain words.
const W = 1080
const H = 1920
const NOTE = { name: 'noah', text: 'you said we’d see the cherry blossoms next year.' }

function Poster() {
  const ok = useFaces()
  return (
    <Board w={W} h={H} grain={0.08}>
      <Light x={540} y={990} size={1700} tint="amber" strength={0.75} />
      {ok ? (
        <>
          <h2 className="cw-line">send it privately.</h2>
          <p className="cw-sub">they only read it if they send you one.</p>
          <Phone w={800} x={540} y={986} tint="amber" seed="cw-noah" name={NOTE.name} text={NOTE.text} />
          <div className="cw-sign"><Lockup cell={2} /><span>celestual.us</span></div>
        </>
      ) : null}
    </Board>
  )
}

export default { id: 'ig-story-write', w: W, h: H, title: 'send it privately', format: 'instagram story 9:16', order: 31, Poster }
