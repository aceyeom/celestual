// One normalizer, used everywhere. A handle is stored and compared ONLY in its
// normalized form and displayed only with a leading '@' put back on at the
// last moment.
//
// Every bug this file exists to prevent is the same bug: two people typing the
// same person and not finding each other. '@Sofiaaa.Reyes', 'sofiaaa.reyes ',
// 'sofiaaa.reyes.' and '@ sofiaaa . reyes' are one person, and a wall that
// disagrees about that is a wall with nobody on it.

export function normHandle(raw) {
  return String(raw || '')
    .trim()
    .replace(/^@+/, '')       // an '@' typed into a field that already shows one
    .toLowerCase()
    .replace(/\s+/g, '')      // internal whitespace collapses to nothing
    .replace(/[^a-z0-9._]/g, '')
    .replace(/[._]+$/, '')    // trailing punctuation: a sentence, not a handle
    .slice(0, 30)
}

// Display form. The '@' is never stored, so it is never half-stored either.
export function atHandle(h) {
  const n = normHandle(h)
  return n ? `@${n}` : ''
}

// Instagram's own shape, which is the shape this wall is addressed in.
export function isValidHandle(h) {
  const n = normHandle(h)
  return n.length >= 3 && n.length <= 30 && /^[a-z0-9._]+$/.test(n)
}
