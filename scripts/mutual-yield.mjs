// ── the hour, simulated ──────────────────────────────────────────────────────
//
// docs/MASTER-PLAN.md §03 rests on one number, and this is where it comes from:
// how many mutual pairs a room actually produces, and how much of the room
// walks away with nothing.
//
// The model. `n` people in a room. Each writes `m` letters aimed at somebody
// else in the room. `r` is the real chance that the person you wrote about
// independently wrote about you — the assortative rate, which sits well above
// the random baseline of m/(n-1) because people write about people they are
// actually drawn to. r is the one number nobody can know in advance, which is
// why the table is a sweep over it rather than a single answer.
//
// Two things come out, and the second matters as much as the first:
//
//   pairs    how many mutual reveals fire at the hour.       the ceiling
//   blank    the share of the room that received no letter.  the floor
//
// Under chance alone (r = 0) the expected pair count collapses to m²/2, which
// is independent of n: a bigger room does not help, and only writing more
// letters does. That is the whole argument for three at the door rather than
// one.
//
//   node scripts/mutual-yield.mjs                 the table in the plan
//   node scripts/mutual-yield.mjs 300 3 0.08      one cell, one room

const TRIALS = 4000

// One room, one night. Returns [mutual pairs, share who got nothing].
function night(n, m, r, rand) {
  const wrote = Array.from({ length: n }, () => new Set())

  for (let i = 0; i < n; i++) {
    while (wrote[i].size < m) {
      const j = Math.floor(rand() * n)
      if (j !== i) wrote[i].add(j)
    }
  }

  // The assortative overlay: each letter has an `r` chance the target had
  // independently written back. Capped a little above m so one very popular
  // person cannot write the whole room.
  for (let i = 0; i < n; i++) {
    for (const j of [...wrote[i]]) {
      if (rand() < r && wrote[j].size < m + 2) wrote[j].add(i)
    }
  }

  let pairs = 0
  const got = new Array(n).fill(0)
  for (let i = 0; i < n; i++) {
    for (const j of wrote[i]) {
      got[j]++
      if (j > i && wrote[j].has(i)) pairs++
    }
  }
  return [pairs, got.filter((g) => g === 0).length / n]
}

function sweep(n, m, r) {
  // Seeded, so the table in the plan is the table this prints.
  let s = (n * 7919 + m * 104729 + Math.round(r * 1e6) * 15485863) >>> 0
  const rand = () => (((s = (s * 1664525 + 1013904223) >>> 0) >>> 8) / 16777216)

  let pairs = 0
  let blank = 0
  for (let t = 0; t < TRIALS; t++) {
    const [p, b] = night(n, m, r, rand)
    pairs += p
    blank += b
  }
  return { pairs: pairs / TRIALS, blank: blank / TRIALS }
}

const [aN, aM, aR] = process.argv.slice(2)

if (aN) {
  const n = +aN
  const m = +aM
  const r = +aR
  const { pairs, blank } = sweep(n, m, r)
  console.log(
    `room ${n} · ${m} letters each · r=${r} → ` +
      `${pairs.toFixed(1)} mutual pairs, ${(blank * 100).toFixed(1)}% got nothing`,
  )
} else {
  const n = 200
  const RS = [0, 0.05, 0.08, 0.12]
  console.log(`\n  a room of ${n}, ${TRIALS} nights each\n`)
  console.log(
    '  letters  ' +
      RS.map((r) => (r === 0 ? '   chance' : `  r=${r.toFixed(2)}`)).join('') +
      '   got nothing',
  )
  for (const m of [1, 2, 3]) {
    const cells = RS.map((r) => sweep(n, m, r))
    console.log(
      `  ${String(m).padStart(7)}  ` +
        cells.map((c) => c.pairs.toFixed(1).padStart(9)).join('') +
        `   ${(cells[0].blank * 100).toFixed(0)}–${(cells[3].blank * 100).toFixed(0)}%`,
    )
  }
  console.log(
    '\n  one letter each, at chance, is half a couple in the whole room,\n' +
      '  and a third of the floor holding a phone that does nothing.\n',
  )
}
