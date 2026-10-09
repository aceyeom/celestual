// The three helpers `app/src/wall/scenes/rig.js` takes from `kit.js`, as
// kit.js writes them, so the page can carry the rig without the rest of the
// wall's drawing kit.
export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
export const lerp = (a, b, k) => a + (b - a) * k
export const sm5 = (k) => { const x = clamp(k); return x * x * x * (x * (6 * x - 15) + 10) }
