import React from 'react';

const paths = {
  body: <><path d="M3 9v6M21 9v6M6 7v10M18 7v10M6 12h12" /></>,
  mind: <><path d="M12 3a6 6 0 0 0-6 6c0 2 1 3 1 5v3a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3c0-2 1-3 1-5a6 6 0 0 0-6-6Z" /><path d="M9.5 9.5l2 2 3-3.5" /></>,
  money: <><circle cx="12" cy="12" r="9" /><path d="M8 8l4 6 4-6M9.2 12.4h5.6M9.2 14.6h5.6" /></>,
  craft: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2.2 2.2M16.8 16.8 19 19M19 5l-2.2 2.2M7.2 16.8 5 19" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 6.5a3 3 0 0 1 0 5.5M17 14.5a5.2 5.2 0 0 1 3.5 4.5" /></>,
  edge: <><path d="M12 3c1.5 3.5-1.5 4.5-1.5 7A3.2 3.2 0 0 0 12 13c1.2-1 1.2-2.5 1-3.2 1.8 1.3 3 3.2 3 5.4A4 4 0 0 1 12 21a4 4 0 0 1-4-4c0-3.8 2.5-5.2 4-7.8Z" /></>,
  home: <><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" /><path d="M12 12l6-4" /></>,
  palm: <><path d="M12 21V11M12 11c0-3 1.5-5.5 4-5.5s3.5 2.5 2 5.5M12 11c0-3-1.5-5.5-4-5.5S4.5 8 6 11M12 11c0-2.5 1.5-4 3-4M12 21H8a4 4 0 0 1 0-8h4" /></>,
  shieldGift: <><path d="M12 22C12 22 4 18 4 12V5l8-3 8 3v7c0 6-8 10-8 10Z" /><path d="M12 8v8M9 11h6" /></>,
  user: <><circle cx="12" cy="8.5" r="3.4" /><path d="M5 19.5a7 7 0 0 1 14 0" /></>,
  back: <><path d="M15 18l-6-6 6-6" /></>,
  chevR: <><path d="M9 18l6-6-6-6" /></>,
  chevD: <><path d="M6 9l6 6 6-6" /></>,
  check: <><path d="M5 12l5 5 9-9" /></>,
  trophy: <><path d="M6 2h12M6 2v8a6 6 0 0 0 12 0V2M6 2H4a2 2 0 0 0-2 2v2a4 4 0 0 0 4 4M18 2h2a2 2 0 0 0 2 2v2a4 4 0 0 0-4 4M12 16v5M8 21h8" /></>,
  flag: <><path d="M4 21V4M4 4l16 6-16 6" /></>,
  medal: <><circle cx="12" cy="15" r="6" /><path d="M8.5 3.5l1 3h5l1-3" /><path d="M9 3.5L12 9l3-5.5" /></>,
  wallet: <><rect x="2" y="5" width="20" height="15" rx="2" /><path d="M16 10h.01M2 10h20" /></>,
  coins: <><circle cx="8" cy="10" r="6" /><path d="M14 4.5a6 6 0 0 1 0 11" /><path d="M18.5 7.5a6 6 0 0 1 0 5" /></>,
  book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V4H6.5A2.5 2.5 0 0 0 4 6.5z" /></>,
  graduation: <><path d="M2 10l10-6 10 6-10 6-10-6zM6 12v5l6 3 6-3v-5" /></>,
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></>,
  moon: <><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" /></>,
  sparkle: <><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5Z" /></>,
  zap: <><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z" /></>,
  flame: <><path d="M12 3c1.5 3.5-1.5 4.5-1.5 7A3.2 3.2 0 0 0 12 13c1.2-1 1.2-2.5 1-3.2 1.8 1.3 3 3.2 3 5.4A4 4 0 0 1 12 21a4 4 0 0 1-4-4c0-3.8 2.5-5.2 4-7.8Z" /></>,
  replan: <><path d="M21 9a9 9 0 1 0-1.5 5" /><path d="M21 3v6h-6" /></>,
  expand: <><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 8h.01M12 12v4" /></>,
  badgeCheck: <><path d="M12 2l2.4 5 5.6.8-4 3.9.9 5.6-5-2.6-5 2.6.9-5.6-4-3.9 5.6-.8Z" /></>,
  pin: <><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7Z" /><circle cx="12" cy="9" r="2" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  x: <><path d="M18 6L6 18M6 6l12 12" /></>,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  arrowUR: <><path d="M7 17L17 7M7 7h10v10" /></>,
  heart: <><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.7 1.1-1a5.5 5.5 0 0 0 0-7.7Z" /></>,
  arrowR: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  link: <><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></>,
  star: <><path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.9 6.6 19.7l1.2-6L3.3 9.3l6.1-.7Z" /></>,
  share: <><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" /></>,
};

export function Icon(key, { size = 20, color = 'currentColor', stroke = 1.8 } = {}) {
  const content = paths[key];
  if (!content) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {content}
    </svg>
  );
}

export const STAT_C = {
  body: '#FF9F4A', mind: '#9B8CF5', money: 'var(--positive)',
  craft: '#6FB4E0', people: '#45C7C2', edge: 'var(--accent)',
};

export const STATUS = {
  on:    { c: 'var(--positive)', rgb: 'var(--positive-rgb)', label: '페이스 좋음', dot: '🟢' },
  tight: { c: 'var(--warn)',     rgb: 'var(--warn-rgb)',     label: '빠듯함',     dot: '🟡' },
  risk:  { c: 'var(--danger)',   rgb: 'var(--danger-rgb)',   label: '위험',       dot: '🔴' },
};
