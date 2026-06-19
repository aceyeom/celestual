import React from 'react';
import { Icon, STAT_C } from '../icons';

export function Card({ children, style = {}, pad = 16, onClick, glow = false, elev = false, className = '' }) {
  const border = glow ? 'inset 0 0 0 1px rgba(var(--accent-rgb),.30)' : 'inset 0 0 0 1px var(--line)';
  const shadow = glow
    ? `${border}, 0 1px 0 var(--inset), 0 14px 30px -18px rgba(var(--accent-rgb),calc(.55*var(--game) + .12))`
    : `${border}, 0 1px 0 var(--inset), var(--shadow)`;
  return (
    <div onClick={onClick} className={className + (onClick ? ' tm-tap' : '')}
      style={{ background: elev ? 'var(--surface2)' : 'var(--surface)', borderRadius: 'var(--r-lg)', padding: pad, boxShadow: shadow, cursor: onClick ? 'pointer' : 'default', position: 'relative', ...style }}>
      {children}
    </div>
  );
}

export function Tag({ children, tone = 'neutral', solid = false, icon, style = {} }) {
  const map = {
    accent: ['var(--accent)', 'var(--accent-rgb)'], positive: ['var(--positive)', 'var(--positive-rgb)'],
    warn: ['var(--warn)', 'var(--warn-rgb)'], danger: ['var(--danger)', 'var(--danger-rgb)'],
    neutral: ['var(--sub)', '255,255,255'],
  };
  const [c, rgb] = map[tone] || map.neutral;
  const base = solid
    ? { color: tone === 'neutral' ? 'var(--ink)' : 'var(--on-accent)', background: c, boxShadow: 'none' }
    : { color: c, background: `rgba(${rgb},.10)`, boxShadow: `inset 0 0 0 1px rgba(${rgb},.26)` };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: icon ? '3px 9px 3px 7px' : '3px 9px',
      borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.01em', whiteSpace: 'nowrap', lineHeight: 1.5, ...base, ...style }}>
      {icon && Icon(icon, { size: 12.5, color: solid ? (tone === 'neutral' ? 'var(--ink)' : 'var(--on-accent)') : c, stroke: 2 })}
      {children}
    </span>
  );
}

export function Btn({ children, onClick, tone = 'accent', size = 'md', icon, full = true, style = {} }) {
  const pads = { sm: '9px 14px', md: '13px 18px', lg: '15px 20px' };
  const fs = { sm: 13, md: 14.5, lg: 15.5 };
  const tones = {
    accent: { background: 'var(--accent)', color: 'var(--on-accent)', boxShadow: '0 8px 22px -10px rgba(var(--accent-rgb),.8)' },
    soft: { background: 'rgba(var(--accent-rgb),.13)', color: 'var(--accent)', boxShadow: 'inset 0 0 0 1px rgba(var(--accent-rgb),.3)' },
    ghost: { background: 'var(--surface2)', color: 'var(--ink)', boxShadow: 'inset 0 0 0 1px var(--line)' },
  };
  const t = tones[tone] || tones.accent;
  return (
    <button onClick={onClick} className="tm-tap" style={{ width: full ? '100%' : 'auto', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      fontWeight: 700, fontSize: fs[size], letterSpacing: '-.01em', padding: pads[size], borderRadius: 'var(--r-md)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, ...t, ...style }}>
      {icon && Icon(icon, { size: 17, color: 'currentColor', stroke: 2 })}
      {children}
    </button>
  );
}

export function SectionHeader({ children, right, caption, style = {} }) {
  return (
    <div style={{ margin: '2px 2px 11px', ...style }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.01em', color: 'var(--ink)', whiteSpace: 'nowrap', flexShrink: 0 }}>{children}</h3>
        {right && <span style={{ fontSize: 11.5, color: 'var(--faint)', whiteSpace: 'nowrap', flexShrink: 0 }}>{right}</span>}
      </div>
      {caption && <div style={{ fontSize: 11.5, color: 'var(--faint)', marginTop: 3, lineHeight: 1.4 }}>{caption}</div>}
    </div>
  );
}

export function IconChip({ name, tone = 'neutral', size = 38, r = 12, stroke = 1.85 }) {
  const tints = {
    accent: ['var(--accent)', 'rgba(var(--accent-rgb),.12)', 'rgba(var(--accent-rgb),.22)'],
    positive: ['var(--positive)', 'rgba(var(--positive-rgb),.12)', 'rgba(var(--positive-rgb),.22)'],
    danger: ['var(--danger)', 'rgba(var(--danger-rgb),.12)', 'rgba(var(--danger-rgb),.22)'],
    neutral: ['var(--ink)', 'var(--surface2)', 'var(--line)'],
  };
  const [c, bg, bd] = tints[tone] || tints.neutral;
  return (
    <div style={{ width: size, height: size, borderRadius: r, flexShrink: 0, background: bg, boxShadow: `inset 0 0 0 1px ${bd}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {Icon(name, { size: size * 0.5, color: c, stroke })}
    </div>
  );
}

export function ProgressBar({ pct = 0, height = 8, color = 'var(--accent)', track = 'var(--track)', marker = null, pips = null, style = {}, glow = false }) {
  const clamp = (n) => Math.max(0, Math.min(100, n));
  return (
    <div style={{ position: 'relative', height, borderRadius: height, background: track, ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${clamp(pct)}%`, borderRadius: height, background: color, transformOrigin: 'left', boxShadow: glow ? `0 0 14px -2px ${color}` : 'none', transition: 'width .7s cubic-bezier(.2,.7,.3,1)' }} />
      {pips && pips.map((p, i) => (
        <div key={i} style={{ position: 'absolute', left: `${clamp(p.at)}%`, top: '50%', width: height - 3, height: height - 3, marginLeft: -(height - 3) / 2, transform: 'translateY(-50%)', borderRadius: 999, background: p.done ? color : 'var(--bg)', boxShadow: p.done ? 'none' : `inset 0 0 0 1.5px var(--faint)` }} />
      ))}
      {marker != null && (
        <div style={{ position: 'absolute', left: `${clamp(marker)}%`, top: -3, bottom: -3, width: 2, marginLeft: -1, background: 'var(--ink)', borderRadius: 2, opacity: .9 }}>
          <div style={{ position: 'absolute', top: -4, left: -2.5, width: 7, height: 7, borderRadius: 999, background: 'var(--ink)' }} />
        </div>
      )}
    </div>
  );
}

export function StatBar({ s, mode = 'mono', compact = false }) {
  const isEdge = s.key === 'edge';
  const fill = mode === 'color' ? (STAT_C[s.key] || 'var(--ink)') : (isEdge ? 'var(--accent)' : 'var(--bar)');
  const iconC = mode === 'color' ? (STAT_C[s.key] || 'var(--sub)') : (isEdge ? 'var(--accent)' : 'var(--sub)');
  return (
    <div style={{ padding: compact ? '9px 0' : '11px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        {Icon(s.key, { size: 16, color: iconC, stroke: 1.8 })}
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{s.mil}</span>
        <span style={{ fontSize: 11, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.real}</span>
        {isEdge && <Tag tone="accent" style={{ fontSize: 9.5, padding: '1px 6px' }}>최고 난도</Tag>}
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--faint)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <span style={{ color: isEdge ? 'var(--accent)' : 'var(--ink)', fontWeight: 700 }}>{s.cur}</span> / {s.tgt} XP
        </span>
      </div>
      <div style={{ position: 'relative', height: 6, borderRadius: 6, background: 'var(--track)', marginTop: 8, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${s.tgt}%`, borderRadius: 6, background: 'var(--line)' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${s.cur}%`, borderRadius: 6, background: fill, transition: 'width .7s cubic-bezier(.2,.7,.3,1)' }} />
      </div>
    </div>
  );
}

export function ScreenHead({ title, sub, onBack, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '2px 0 16px' }}>
      {onBack && (
        <button onClick={onBack} className="tm-tap" style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--surface)', boxShadow: 'inset 0 0 0 1px var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, border: 'none', padding: 0 }}>
          {Icon('back', { size: 19, color: 'var(--ink)' })}
        </button>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.025em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
        {sub && <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function KV({ label, value, valueColor = 'var(--ink)', strong, top }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderTop: top ? '1px solid var(--hair)' : 'none' }}>
      <span style={{ fontSize: 13, color: 'var(--sub)' }}>{label}</span>
      <span className="mono" style={{ fontSize: strong ? 14 : 13, fontWeight: strong ? 700 : 600, color: valueColor, whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

export function Donut({ pct, size = 50, color = 'var(--accent)', track = 'rgba(255,255,255,.09)', w = 4 }) {
  const r = (size - w) / 2, c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={w} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .7s cubic-bezier(.2,.7,.3,1)' }} />
    </svg>
  );
}
