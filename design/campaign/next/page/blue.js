// ── blue noise, made here ─────────────────────────────────────────────────
// A void and cluster threshold map (Ulichney, 1993), the way Christoph
// Peters' CC0 generator makes one: a Gaussian of sigma 1.5 on a torus, a
// tenth of the cells set at random from a fixed seed and relaxed until no
// cell moves, ranked by taking away the tightest clusters, then by filling
// the largest voids. Values are 0 to 255, each used equally often. Made once
// at build time (`node blue.js 128` prints it in base64), never at run time.

export function blueNoise(N = 128, seed = 20261008) {
  const n = N * N
  const R = 6
  const sig = 1.5
  const K = []
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) K.push([dx, dy, Math.exp(-(dx * dx + dy * dy) / (2 * sig * sig))])
  let s = seed >>> 0
  const rand = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
  const on = new Uint8Array(n)
  const E = new Float64Array(n)
  const put = (i, sign) => {
    const x = i % N
    const y = (i / N) | 0
    for (const [dx, dy, w] of K) E[((y + dy + N) % N) * N + ((x + dx + N) % N)] += sign * w
  }
  const ones = Math.floor(n / 10)
  let placed = 0
  while (placed < ones) { const i = Math.floor(rand() * n); if (!on[i]) { on[i] = 1; put(i, 1); placed++ } }
  const tightest = () => { let b = -1; let v = -Infinity; for (let i = 0; i < n; i++) if (on[i] && E[i] > v) { v = E[i]; b = i } return b }
  const largestVoid = () => { let b = -1; let v = Infinity; for (let i = 0; i < n; i++) if (!on[i] && E[i] < v) { v = E[i]; b = i } return b }
  // relax: move the tightest cluster's cell to the largest void until it is where it started
  for (let guard = 0; guard < n; guard++) {
    const c = tightest()
    on[c] = 0; put(c, -1)
    const v = largestVoid()
    on[v] = 1; put(v, 1)
    if (v === c) break
  }
  const rank = new Int32Array(n).fill(-1)
  const proto = on.slice()
  const protoE = E.slice()
  // phase 1: rank the prototype's cells by taking away the tightest
  let r = ones - 1
  while (r >= 0) { const c = tightest(); on[c] = 0; put(c, -1); rank[c] = r--; }
  // phase 2 and 3: from the prototype, fill the largest voids
  on.set(proto); E.set(protoE)
  r = ones
  while (r < n) { const v = largestVoid(); on[v] = 1; put(v, 1); rank[v] = r++ }
  const out = new Uint8Array(n)
  for (let i = 0; i < n; i++) out[i] = Math.min(255, Math.floor(((rank[i] + 0.5) / n) * 256))
  return out
}

// `node blue.js 128` prints the map in base64; `--module` writes it to
// round-blue.js for the page as well
if (typeof process !== 'undefined' && process.argv && import.meta.url === `file://${process.argv[1]}`) {
  const N = +(process.argv[2] || 128)
  const t = Date.now()
  const b64 = Buffer.from(blueNoise(N)).toString('base64')
  if (process.argv.includes('--module')) {
    const { writeFileSync } = await import('node:fs')
    writeFileSync(new URL('./round-blue.js', import.meta.url), `// Written by blue.js (${N} by ${N}); do not edit by hand.\nexport const BLUE_N = ${N}\nexport const BLUE_B64 = '${b64}'\nexport const blueBytes = () => Uint8Array.from(atob(BLUE_B64), (c) => c.charCodeAt(0))\n`)
  }
  process.stdout.write(b64)
  process.stderr.write(`\nblue noise ${N} by ${N} in ${Date.now() - t} ms\n`)
}
