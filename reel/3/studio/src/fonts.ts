import { continueRender, delayRender, staticFile } from 'remotion'

// the brand's faces, from the app's own files, before the first frame
const faces: [string, string, FontFaceDescriptors][] = [
  ['Newsreader', 'fonts/newsreader-normal-200-800-latin.woff2', { weight: '200 800', style: 'normal' }],
  ['Newsreader', 'fonts/newsreader-italic-200-800-latin.woff2', { weight: '200 800', style: 'italic' }],
  ['Inter Tight', 'fonts/inter-tight-normal-100-900-latin.woff2', { weight: '100 900', style: 'normal' }],
]
const handle = delayRender('the faces')
Promise.all(faces.map(([family, file, d]) => new FontFace(family, `url(${staticFile(file)})`, d).load()))
  .then((loaded) => { loaded.forEach((f) => document.fonts.add(f)); continueRender(handle) })
  .catch((e) => { console.error(e); continueRender(handle) })
