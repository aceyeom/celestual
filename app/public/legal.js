// ── the chip on the bar, for the three static legal pages ────────────────────
//
// These pages are served by a rewrite in vercel.json and never reach the app
// bundle, so they cannot mount main/TopBar.jsx. What they can do is carry the
// same two objects the bar carries everywhere else, and fill the second one in
// from what this browser already holds.
//
// The markup ships as the signed out chip. If there is a proved handle on this
// device, this turns it into the handle, pointing at the sky, which is exactly
// what parts.jsx `Me` renders on Main. If there is not, or if storage throws,
// or if this file never loads, the page keeps the chip it was served with.
//
// It reads one key and nothing else. The proof beside the handle in that
// record is a bearer secret and is never read here, never rendered, and never
// leaves the record.
;(function () {
  var el = document.getElementById('me')
  if (!el) return

  var handle = ''
  try {
    var held = JSON.parse(window.localStorage.getItem('celestual:auth') || 'null')
    if (held && held.verified && typeof held.handle === 'string') {
      handle = held.handle.replace(/^@+/, '').trim()
    }
  } catch (e) {
    // Private mode, or site data blocked. The chip stays as it was served.
  }
  if (!/^[a-z0-9._]{1,30}$/i.test(handle)) return

  el.textContent = '@' + handle
  el.setAttribute('href', '/sky')
  el.setAttribute('aria-label', 'your sky, @' + handle)
  el.setAttribute('title', 'your sky')
  el.className = 'me is-on'
})()
