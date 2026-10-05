import { Board, Phone, StoryPhone, Lockup, Light, Plaster } from '../kit.jsx'

function Poster() {
  return (
    <Board w={1080} h={1350}>
      <Light x={300} y={600} size={1200} tint="green" />
      <Phone w={460} x={300} y={600} tint="green" seed="david" name="david" counter="216/1" text="my little alcoholic. the bartender at fifth ave asked about you." />
      <Plaster x={300} y={330} len={140} rot={-8} />
      <StoryPhone w={420} x={800} y={600} tint="rose" story="intro" />
      <Phone w={420} x={540} y={1100} tint="teal" seed="x2" mode="letter" name="Sofia" stamp="10/05/26" hearts={12} replies={3} text="you gave me your umbrella outside wheeler and walked home in it." />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 40, textAlign: 'center' }}><Lockup cell={3} /></div>
    </Board>
  )
}

export default { id: '_test', w: 1080, h: 1350, title: 'test', format: 'instagram 4:5', order: 999, Poster }
