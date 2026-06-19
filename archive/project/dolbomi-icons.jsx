// dolbomi-icons.jsx — professional icon system for DOLBOMI.
// A curated, consistent-weight stroke set (Lucide/Phosphor-grade) used everywhere.
// One source of truth: window.Icon(name, {size, color, stroke, fill}) + window.ICONS registry.
(function () {

// All icons drawn on a 24×24 grid, 1.75 default stroke, round caps/joins.
// Paths are authored as functions of the stroke-prop object `p` so they stay crisp.
const D = {
  // ── navigation ───────────────────────────────────────────────
  home:      (p) => <><path d="M3 10.5 12 3l9 7.5" {...p} /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" {...p} /><path d="M9.5 21v-6h5v6" {...p} /></>,
  target:    (p) => <><circle cx="12" cy="12" r="8.5" {...p} /><circle cx="12" cy="12" r="4.5" {...p} /><circle cx="12" cy="12" r="0.6" {...p} fill={p.stroke} /></>,
  palm:      (p) => <><path d="M12 21v-8" {...p} /><path d="M12 13c0-3 2.3-5 5-5 .8 0 1.6.2 2 .5-.6 2.5-2.7 4.5-5.5 4.5" {...p} /><path d="M12 13c0-3-2.3-5-5-5-.8 0-1.6.2-2 .5.6 2.5 2.7 4.5 5.5 4.5" {...p} /><path d="M12 13c0-2.6 1.2-4.8 3-6-1.2-.5-2.3-.6-3-.4-.7-.2-1.8-.1-3 .4 1.8 1.2 3 3.4 3 6Z" {...p} /></>,
  shieldGift:(p) => <><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" {...p} /><path d="M9.5 11.5h5M12 11.5V16M10.2 9.4c-.9 0-1.4-.6-1.4-1.2 0-.7.6-1.1 1.2-1.1 1 0 1.6 1.1 2 2.3.4-1.2 1-2.3 2-2.3.6 0 1.2.4 1.2 1.1 0 .6-.5 1.2-1.4 1.2" {...p} /></>,
  user:      (p) => <><circle cx="12" cy="8" r="3.6" {...p} /><path d="M5.5 20a6.5 6.5 0 0 1 13 0" {...p} /></>,

  // ── the six stats ────────────────────────────────────────────
  body:      (p) => <><path d="M4 9v6M7 7.5v9M20 9v6M17 7.5v9M7 12h10" {...p} /></>,            // dumbbell
  mind:      (p) => <><path d="M9 19a3 3 0 0 1-1-5.8 3 3 0 0 1 1.5-3.7A2.8 2.8 0 0 1 12 5.5a2.8 2.8 0 0 1 2.5 4 3 3 0 0 1 1.5 3.7A3 3 0 0 1 15 19" {...p} /><path d="M12 5.5V19" {...p} /></>,  // brain
  money:     (p) => <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M8.5 8.5 12 14l3.5-5.5M9 12.5h6M9 14.8h6" {...p} /></>,  // ₩ coin
  craft:     (p) => <><circle cx="12" cy="9" r="4.5" {...p} /><path d="M9.2 12.8 8 21l4-2.2L16 21l-1.2-8.2" {...p} /></>,  // medal/cert
  people:    (p) => <><circle cx="9" cy="9" r="3" {...p} /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" {...p} /><path d="M16 6.3a3 3 0 0 1 0 5.4M17.5 14.2a5.3 5.3 0 0 1 3 4.8" {...p} /></>,  // users
  edge:      (p) => <><path d="M12 3c1.4 3-1.2 4.3-1.2 6.8A3 3 0 0 0 12 12.5c1.1-.8 1.2-2.2 1-3 1.7 1.2 3 3.2 3 5.4A4 4 0 0 1 8 15c0-3.6 2.5-5 4-9Z" {...p} /></>,  // flame

  // ── actions / chrome ─────────────────────────────────────────
  chevR:     (p) => <path d="M9.5 5.5 16 12l-6.5 6.5" {...p} />,
  chevD:     (p) => <path d="M5.5 9.5 12 16l6.5-6.5" {...p} />,
  arrowR:    (p) => <><path d="M4 12h15" {...p} /><path d="M13 6.5 19 12l-6 5.5" {...p} /></>,
  arrowUR:   (p) => <><path d="M7.5 16.5 16.5 7.5" {...p} /><path d="M9 7.5h7.5V15" {...p} /></>,
  back:      (p) => <><path d="M20 12H5" {...p} /><path d="M11 6 5 12l6 6" {...p} /></>,
  check:     (p) => <path d="M5 12.5 10 17.5 19.5 7" {...p} />,
  checkCircle:(p)=> <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M8.5 12.2 11 14.7 15.7 9.4" {...p} /></>,
  badgeCheck:(p) => <><path d="M12 3.2c.9-.9 2.4-.9 3.3 0l.6.6c.5.5 1.1.7 1.8.6l.8-.1c1.3-.1 2.4 1 2.3 2.3l-.1.8c-.1.7.1 1.3.6 1.8l.6.6c.9.9.9 2.4 0 3.3l-.6.6c-.5.5-.7 1.1-.6 1.8l.1.8c.1 1.3-1 2.4-2.3 2.3l-.8-.1c-.7-.1-1.3.1-1.8.6l-.6.6c-.9.9-2.4.9-3.3 0l-.6-.6c-.5-.5-1.1-.7-1.8-.6l-.8.1c-1.3.1-2.4-1-2.3-2.3l.1-.8c.1-.7-.1-1.3-.6-1.8l-.6-.6c-.9-.9-.9-2.4 0-3.3l.6-.6c.5-.5.7-1.1.6-1.8l-.1-.8c-.1-1.3 1-2.4 2.3-2.3l.8.1c.7.1 1.3-.1 1.8-.6l.6-.6Z" {...p} /><path d="M9 12.2 11 14.2 15 10" {...p} /></>,
  plus:      (p) => <path d="M12 5.5v13M5.5 12h13" {...p} />,
  x:         (p) => <path d="M6.5 6.5 17.5 17.5M17.5 6.5 6.5 17.5" {...p} />,
  share:     (p) => <><path d="M12 3.5v11M8 7l4-3.5L16 7" {...p} /><path d="M6 12v6.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V12" {...p} /></>,
  calendar:  (p) => <><rect x="4" y="5.5" width="16" height="15" rx="2.5" {...p} /><path d="M4 9.5h16M8.5 3.5v4M15.5 3.5v4" {...p} /></>,
  clock:     (p) => <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M12 7.5V12l3 2" {...p} /></>,
  bolt:      (p) => <path d="M13 2.5 5 13h6l-1 8.5L19 11h-6l1-8.5Z" {...p} />,
  lock:      (p) => <><rect x="5" y="10.5" width="14" height="9.5" rx="2.2" {...p} /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...p} /></>,
  info:      (p) => <><circle cx="12" cy="12" r="8.5" {...p} /><path d="M12 11v5.5M12 7.7h.02" {...p} /></>,
  sliders:   (p) => <><path d="M5 8h9M18.5 8H20M5 16h2M11.5 16H20" {...p} /><circle cx="16" cy="8" r="2.2" {...p} /><circle cx="9" cy="16" r="2.2" {...p} /></>,
  replan:    (p) => <><path d="M4.5 9a8 8 0 0 1 13.4-2.6L21 9" {...p} /><path d="M21 4.5V9h-4.5" {...p} /><path d="M19.5 15a8 8 0 0 1-13.4 2.6L3 15" {...p} /><path d="M3 19.5V15h4.5" {...p} /></>,
  flag:      (p) => <><path d="M6 21V4" {...p} /><path d="M6 4.5h11.5l-2.2 4 2.2 4H6" {...p} /></>,
  trophy:    (p) => <><path d="M7 4.5h10v4a5 5 0 0 1-10 0v-4Z" {...p} /><path d="M7 6H4.5v1.5A3 3 0 0 0 7 10.4M17 6h2.5v1.5A3 3 0 0 1 17 10.4" {...p} /><path d="M12 13.5V17M9 21h6M10 17h4l.5 4h-5l.5-4Z" {...p} /></>,
  medal:     (p) => <><circle cx="12" cy="14.5" r="5" {...p} /><path d="M9 9.5 6.5 3h4L12 6.5 13.5 3h4L15 9.5M12 12.3 13 14h1.8l-1.4 1.2.5 1.8L12 16.9l-1.9 1.1.5-1.8L9.2 14H11l1-1.7Z" {...p} /></>,
  sparkle:   (p) => <><path d="M12 4.5c.4 2.8 1.7 4.1 4.5 4.5-2.8.4-4.1 1.7-4.5 4.5-.4-2.8-1.7-4.1-4.5-4.5 2.8-.4 4.1-1.7 4.5-4.5Z" {...p} /><path d="M18 14.5c.2 1.4.9 2.1 2.3 2.3-1.4.2-2.1.9-2.3 2.3-.2-1.4-.9-2.1-2.3-2.3 1.4-.2 2.1-.9 2.3-2.3Z" {...p} /></>,
  star:      (p) => <path d="m12 4 2.3 4.9 5.2.7-3.8 3.6 1 5.2L12 16.1 7.3 18.6l1-5.2L4.5 9.6l5.2-.7L12 4Z" {...p} />,
  shield:    (p) => <path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" {...p} />,
  wallet:    (p) => <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H17a1 1 0 0 1 1 1v1.5" {...p} /><rect x="4" y="7.5" width="16" height="12" rx="2.5" {...p} /><path d="M20 12h-4a2 2 0 0 0 0 4h4" {...p} /></>,
  book:      (p) => <><path d="M12 6.5C10.5 5 8.5 4.5 5.5 4.5V18c3 0 5 .5 6.5 2 1.5-1.5 3.5-2 6.5-2V4.5c-3 0-5 .5-6.5 2Z" {...p} /><path d="M12 6.5V20" {...p} /></>,
  graduation:(p) => <><path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Z" {...p} /><path d="M6.5 10.5V16c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-5.5M21.5 8.5v5" {...p} /></>,
  briefcase: (p) => <><rect x="3.5" y="7.5" width="17" height="12" rx="2.5" {...p} /><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5M3.5 12.5h17" {...p} /></>,
  coins:     (p) => <><ellipse cx="9" cy="7" rx="5" ry="2.6" {...p} /><path d="M4 7v4c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6V7" {...p} /><path d="M10 13.4v3c0 1.4 2.2 2.6 5 2.6s5-1.2 5-2.6v-4c0-1.4-2.2-2.6-5-2.6-.9 0-1.7.1-2.4.3" {...p} /></>,
  gift:      (p) => <><rect x="4.5" y="9.5" width="15" height="4" rx="1" {...p} /><path d="M6 13.5V20a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6.5M12 9.5V21" {...p} /><path d="M12 9.5C11.2 6.5 9.8 5.5 8.5 5.5a2 2 0 0 0 0 4M12 9.5c.8-3 2.2-4 3.5-4a2 2 0 0 1 0 4" {...p} /></>,
  pin:       (p) => <><path d="M12 21c4-4.5 6.5-7.6 6.5-10.5A6.5 6.5 0 0 0 5.5 10.5C5.5 13.4 8 16.5 12 21Z" {...p} /><circle cx="12" cy="10.5" r="2.4" {...p} /></>,
  alert:     (p) => <><path d="M12 4.5 21 19.5H3L12 4.5Z" {...p} /><path d="M12 10v4M12 17h.02" {...p} /></>,
  dot:       (p) => <circle cx="12" cy="12" r="3.5" {...p} fill={p.stroke} stroke="none" />,
  plane:     (p) => <path d="M10.5 3.5c.4-.4 1.1-.4 1.5 0 .4.4.5 1.6.3 2.6l-.3 1.4 6.5 4.4c.3.2.5.6.5 1l-.1 1.2-6.4-2-.7 3.4 1.9 1.6.1 1.3-3.5-1-3.5 1 .1-1.3 1.9-1.6-.7-3.4-6.4 2-.1-1.2c0-.4.2-.8.5-1L9.5 7.5l-.3-1.4c-.2-1 0-2.2.3-2.6Z" {...p} />,
  flame:     (p) => <path d="M12 3c1.4 3-1.2 4.3-1.2 6.8A3 3 0 0 0 12 12.5c1.1-.8 1.2-2.2 1-3 1.7 1.2 3 3.2 3 5.4A4 4 0 0 1 8 15c0-3.6 2.5-5 4-9Z" {...p} />,
  droplet:   (p) => <path d="M12 3.5c3 3.8 5.5 6.6 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2.9 2.5-5.7 5.5-9.5Z" {...p} />,
  edit:      (p) => <><path d="M5 19h3.5L19 8.5a1.8 1.8 0 0 0-2.5-2.5L6 16.5V19Z" {...p} /><path d="M14.5 8 17 10.5" {...p} /></>,
  link:      (p) => <><path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 7.5" {...p} /><path d="M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 0 0 5 5L13 16.5" {...p} /></>,
  sun:       (p) => <><circle cx="12" cy="12" r="3.8" {...p} /><path d="M12 2.5v2.2M12 19.3v2.2M4.4 4.4l1.6 1.6M18 18l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.4 19.6 6 18M18 6l1.6-1.6" {...p} /></>,
  moon:      (p) => <path d="M19 13.5A7.5 7.5 0 0 1 10.5 5a6 6 0 1 0 8.5 8.5Z" {...p} />,
  zap:       (p) => <path d="M13 2.5 5 13h6l-1 8.5L19 11h-6l1-8.5Z" {...p} />,
  heart:     (p) => <path d="M12 20.5C6.5 16.5 4 13.2 4 9.8 4 7.2 6 5.5 8.2 5.5c1.5 0 3 .8 3.8 2.2.8-1.4 2.3-2.2 3.8-2.2C20 5.5 22 7.2 22 9.8c0 3.4-2.5 6.7-8 10.7Z" {...p} />,
  receipt:   (p) => <><path d="M6 3.5h12v17l-2.2-1.4L13.6 21 11.4 19l-2.2 1.5L7 19l-1 1V3.5Z" {...p} /><path d="M9 8h6M9 11.5h6M9 15h3.5" {...p} /></>,
  search:    (p) => <><circle cx="11" cy="11" r="6.5" {...p} /><path d="m16 16 4 4" {...p} /></>,
  filter:    (p) => <path d="M4 6h16l-6 7.5V20l-4-2v-4.5L4 6Z" {...p} />,
  expand:    (p) => <><path d="M9 4.5H5.5a1 1 0 0 0-1 1V9M15 4.5h3.5a1 1 0 0 1 1 1V9M9 19.5H5.5a1 1 0 0 1-1-1V15M15 19.5h3.5a1 1 0 0 1 1-1V15" {...p} /></>,
};

const ICONS = Object.keys(D);

function Icon(name, { size = 22, color = 'currentColor', stroke = null, fill = 'none' } = {}) {
  const draw = D[name] || D.dot;
  // strokeWidth is NOT set on paths — it inherits from the <svg> so the global
  // --istroke tweak controls weight, while an explicit `stroke` prop overrides per-call.
  const p = { fill, stroke: color, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, strokeWidth: stroke != null ? stroke : 'var(--istroke, 1.75)' }}>
      {draw(p)}
    </svg>
  );
}

window.Icon = Icon;
window.ICONS = ICONS;
})();
