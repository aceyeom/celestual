// badges.jsx — crafted heraldic crest badges for the 6 칭호 (titles).
// Each title gets a unique engraved shield motif. Three tiers of finish:
//   owned (full gold)  ·  locked (etched outline + lock)  ·  legendary (animated foil).
(function () {
const { Icon, Card, Tag } = window.TU;

// inject the foil/glow keyframes once
if (!document.getElementById('badge-css')) {
  const s = document.createElement('style');
  s.id = 'badge-css';
  s.textContent = `
  @keyframes bdgSheen{0%{transform:translateX(-130%) skewX(-16deg)}60%,100%{transform:translateX(230%) skewX(-16deg)}}
  @keyframes bdgGlow{0%,100%{opacity:.35;transform:scale(.96)}50%{opacity:.8;transform:scale(1.06)}}
  @keyframes bdgGem{0%,100%{opacity:.6}50%{opacity:1}}
  .bdg-wrap{position:relative;display:flex;align-items:center;justify-content:center}
  .bdg-glow{position:absolute;inset:-10% 8%;border-radius:50%;filter:blur(11px);pointer-events:none}
  .bdg-foil{animation:bdgGlow 2.6s ease-in-out infinite}
  .bdg-sheen{position:absolute;top:0;bottom:0;width:34%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);mix-blend-mode:overlay;animation:bdgSheen 3.4s ease-in-out infinite;pointer-events:none}
  `;
  document.head.appendChild(s);
}

// ── per-title engraved motif (drawn inside the shield, ~x14–42 / y14–46) ──
const MOTIF = {
  // 불굴 — three climbing chevrons + a guiding star (perseverance, rank)
  '불굴': (c, w) => <g fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d="M28 13.5l1.5 3.1 3.4.5-2.5 2.4.6 3.4-3-1.6-3 1.6.6-3.4-2.5-2.4 3.4-.5z" fill={c} stroke="none" />
    <path d="M19.5 31l8.5-5.5 8.5 5.5M19.5 37l8.5-5.5 8.5 5.5M19.5 43l8.5-5.5 8.5 5.5" />
  </g>,
  // 철벽 — battlement wall (fortress, defense)
  '철벽': (c, w) => <g fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 22h4v-3h4v3h4v-3h4v3h4M17 22v17h22V22" />
    <path d="M17 30h22M24.5 22v17M31.5 30v9M24.5 30v9" opacity="0.65" />
  </g>,
  // 정보처리 장인 — gear + center spark (craft, mastery)
  '정보처리 장인': (c, w) => <g fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="28" cy="30" r="6.4" /><circle cx="28" cy="30" r="2.2" />
    <path d="M28 20v3.6M28 36.4V40M18 30h3.6M34.4 30H38M21 23l2.5 2.5M32.5 34.5 35 37M35 23l-2.5 2.5M21 37l2.5-2.5" />
  </g>,
  // 새벽의 독서가 — rising sun over an open book (dawn reading)
  '새벽의 독서가': (c, w) => <g fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 23.5a6.5 6.5 0 0 1 13 0" />
    <path d="M28 14.5v2.4M19.5 19l1.6 1.6M36.5 19l-1.6 1.6" opacity="0.7" />
    <path d="M28 41c-2.6-2-5.8-2.6-8.5-2.6V28c2.7 0 5.9.6 8.5 2.6 2.6-2 5.8-2.6 8.5-2.6v10.4c-2.7 0-5.9.6-8.5 2.6Z" />
    <path d="M28 30.6V41" />
  </g>,
  // 분대의 기둥 — classical pillar (the squad's backbone)
  '분대의 기둥': (c, w) => <g fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 22h16M18.5 25.5h19M22 25.5v13M34 25.5v13M18.5 41.5h19M21 38h14" />
    <path d="M26 25.5v13M30 25.5v13" opacity="0.55" />
  </g>,
  // 심연의 담력 — a flame descending into the abyss (legendary courage)
  '심연의 담력': (c, w) => <g fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
    <path d="M16.5 21h23l-11.5 21z" opacity="0.85" />
    <path d="M28 23c1.7 3.4-1.4 4.8-1.4 7.6A3 3 0 0 0 28 33.4c1.2-.9 1.3-2.4 1.1-3.2 1.9 1.3 3.1 3.3 3.1 5.5A4.2 4.2 0 0 1 24 35c0-3.7 2.5-5.4 4-9Z" fill={c} stroke="none" />
  </g>,
};

// ── the crest itself ──
function BadgeCrest({ t, size = 78 }) {
  const uid = React.useId().replace(/:/g, '');
  const owned = !!t.owned;
  const legendary = !!t.legendary && owned;
  const motif = MOTIF[t.name] || MOTIF['불굴'];
  const W = size, H = Math.round(size * 1.18);

  // shield path (heraldic, pointed base) on a 56×68 grid, scaled to box
  const shield = 'M28 3.5 52 11.5 V35 C52 51 42.5 61.5 28 67.5 C13.5 61.5 4 51 4 35 V11.5 Z';
  const inner = 'M28 8 47.5 14.5 V34.5 C47.5 47.5 39.5 56.5 28 61.8 C16.5 56.5 8.5 47.5 8.5 34.5 V14.5 Z';

  // tier finishes
  const goldFace = `url(#g_${uid})`;
  const faceFill = owned ? goldFace : 'var(--surface2)';
  const faceStroke = owned ? `url(#e_${uid})` : 'var(--line)';
  const innerFill = owned ? `url(#i_${uid})` : 'transparent';
  const motifColor = owned ? '#5a3d12' : 'var(--faint)';
  const motifW = 1.9;
  const glowCol = legendary ? '#caa6ff' : 'var(--accent)';

  return (
    <div className="bdg-wrap" style={{ width: W, height: H }}>
      {(legendary || owned) && (
        <div className={'bdg-glow' + (legendary ? ' bdg-foil' : '')}
          style={{ background: legendary
            ? 'radial-gradient(circle, rgba(202,166,255,.55), transparent 70%)'
            : 'radial-gradient(circle, rgba(var(--accent-rgb),.32), transparent 72%)',
            opacity: legendary ? undefined : 0.5 }} />
      )}
      <svg width={W} height={H} viewBox="0 0 56 72" style={{ position: 'relative', display: 'block',
        filter: owned ? 'drop-shadow(0 6px 10px rgba(0,0,0,.45))' : 'none' }}>
        <defs>
          <linearGradient id={`g_${uid}`} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor={legendary ? '#fff0c2' : '#f6d488'} />
            <stop offset="0.42" stopColor={legendary ? '#f4c95f' : '#e3a753'} />
            <stop offset="1" stopColor={legendary ? '#b87fe0' : '#a76b1d'} />
          </linearGradient>
          <linearGradient id={`i_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,.34)" />
            <stop offset="0.5" stopColor="rgba(255,255,255,0)" />
            <stop offset="1" stopColor="rgba(90,55,14,.28)" />
          </linearGradient>
          <linearGradient id={`e_${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={legendary ? '#ffe9bd' : '#fbe2ad'} />
            <stop offset="1" stopColor={legendary ? '#7d4bb0' : '#6e4715'} />
          </linearGradient>
          <clipPath id={`c_${uid}`}><path d={shield} /></clipPath>
        </defs>

        {/* face */}
        <path d={shield} fill={faceFill} stroke={faceStroke} strokeWidth={owned ? 1.6 : 1.3}
          strokeDasharray={owned ? 'none' : '2.5 2.5'} />
        {/* inner bevel panel */}
        <path d={inner} fill={innerFill} stroke={owned ? 'rgba(90,55,14,.35)' : 'var(--hair)'} strokeWidth="1" />
        {/* chief divider */}
        <path d="M9 21 H47" stroke={owned ? 'rgba(90,55,14,.3)' : 'var(--hair)'} strokeWidth="1" />

        {/* engraved motif */}
        <g clipPath={`url(#c_${uid})`} opacity={owned ? 1 : 0.7}>{motif(motifColor, motifW)}</g>

        {/* legendary gems on the chief */}
        {legendary && [18, 28, 38].map((x, i) => (
          <circle key={i} cx={x} cy="14.5" r="1.7" fill="#caa6ff"
            style={{ animation: `bdgGem 1.8s ${i * 0.3}s ease-in-out infinite` }} />
        ))}

        {/* top sheen for owned */}
        {owned && <g clipPath={`url(#c_${uid})`}>
          <path d="M28 3.5 52 11.5 V20 C40 14 16 14 4 20 V11.5 Z" fill="rgba(255,255,255,.28)" />
        </g>}

        {/* locked overlay */}
        {!owned && <g transform="translate(28 42)">
          <rect x="-6.5" y="-3" width="13" height="9.5" rx="2" fill="var(--surface)" stroke="var(--faint)" strokeWidth="1.2" />
          <path d="M-3.6 -3 V-5 a3.6 3.6 0 0 1 7.2 0 V-3" fill="none" stroke="var(--faint)" strokeWidth="1.2" />
        </g>}
      </svg>
      {/* animated foil sheen sweep (legendary only), clipped to shield */}
      {legendary && <div style={{ position: 'absolute', inset: 0, overflow: 'hidden',
        clipPath: 'polygon(50% 4%, 93% 16%, 93% 49%, 50% 94%, 7% 49%, 7% 16%)' }}>
        <div className="bdg-sheen" />
      </div>}
    </div>
  );
}

// ── badge card on the profile shelf ──
function BadgeCard({ t }) {
  const owned = !!t.owned;
  const legendary = !!t.legendary;
  const accent = legendary ? '#caa6ff' : 'var(--accent)';
  return (
    <Card pad={0} glow={legendary && owned} style={{ overflow: 'hidden',
      background: owned ? 'linear-gradient(180deg, rgba(var(--accent-rgb),.05), var(--surface))' : 'var(--surface)' }}>
      <div style={{ padding: '15px 12px 13px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        {t.equipped && (
          <div style={{ position: 'absolute', top: 9, right: 9 }}>
            <Tag tone="accent" style={{ fontSize: 9, padding: '1px 7px' }}>착용</Tag>
          </div>
        )}
        {legendary && !owned && (
          <div style={{ position: 'absolute', top: 9, left: 9, fontSize: 9, fontWeight: 800, letterSpacing: '.12em',
            color: '#caa6ff', opacity: 0.8 }}>LEGEND</div>
        )}
        <BadgeCrest t={t} size={76} />
        <div style={{ marginTop: 10, fontSize: 13.5, fontWeight: 800, letterSpacing: '-.01em',
          color: owned ? (legendary ? accent : 'var(--ink)') : 'var(--faint)' }}>{t.name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 3, lineHeight: 1.35, textWrap: 'pretty' }}>{t.desc}</div>
      </div>
    </Card>
  );
}

window.BadgeCrest = BadgeCrest;
window.BadgeCard = BadgeCard;
})();
