// ── words laid into lines, on a canvas ──────────────────────────────────────
//
// The two pictures the wall draws of itself set their words the way the
// screen sets them (share.js, a letter; keepshare.js, the mutual's
// keepsake): wrapped at spaces to a width, through a word longer than the
// line, and a line too long for its place cut with an ellipsis. Both ask
// nothing of a canvas but `measureText`, so they were share.js's own until
// the review of 28 September moved them here, where nothing else is
// imported: the mutual's picture is laid out with them in
// scripts/check-stories.mjs too, in node, with a measure that stands in for
// the face, to hold that two notes of any shape fit the feed's crop.

// words wrapped to a width, the way the screen wraps them: at spaces, and
// through a word that is longer than the line. `widthAt` is a width, or the
// width of line i, since the lines beside a picture are shorter
export function wrap(g, text, widthAt) {
  const wAt = typeof widthAt === 'function' ? widthAt : () => widthAt
  const out = []
  for (const para of String(text).split('\n')) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (g.measureText(next).width <= wAt(out.length)) { line = next; continue }
      if (line) out.push(line)
      if (g.measureText(word).width <= wAt(out.length)) { line = word; continue }
      let chunk = ''
      for (const ch of word) {
        if (g.measureText(chunk + ch).width > wAt(out.length)) { out.push(chunk); chunk = ch } else chunk += ch
      }
      line = chunk
    }
    out.push(line)
  }
  return out
}

// a line cut to a width with an ellipsis, as the status rows cut theirs
export function fit(g, text, max) {
  if (g.measureText(text).width <= max) return text
  let t = Array.from(text)
  while (t.length > 1 && g.measureText(`${t.join('')}…`).width > max) t = t.slice(0, -1)
  return `${t.join('')}…`
}
