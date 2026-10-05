import { Slide, strip } from '../parts/carousel.jsx'

function Poster() {
  return <Slide i={0} items={strip()} />
}

export default { id: 'ig-carousel-01', w: 1080, h: 1350, title: 'how it works, 1 of 5', format: 'instagram carousel 4:5', order: 21, Poster }
