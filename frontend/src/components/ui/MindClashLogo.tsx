import type { CSSProperties } from 'react';

interface MindClashLogoProps {
  className?: string;
  size?: 'header' | 'overlay';
}

const MIND_STYLE: CSSProperties = {
  fontFamily: "var(--hud-font-head, 'Barlow Condensed', system-ui, sans-serif)",
  fontWeight: 700,
  letterSpacing: '0.04em',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  backgroundImage: 'linear-gradient(90deg, #00e5ff, #00ff88, #a855f7, #00e5ff)',
  backgroundSize: '300% 100%',
  animation: 'logo-flow 4s ease-in-out infinite',
};

const CLASH_STYLE: CSSProperties = {
  fontFamily: "var(--hud-font-head, 'Barlow Condensed', system-ui, sans-serif)",
  fontWeight: 700,
  letterSpacing: '0.04em',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  backgroundImage: 'linear-gradient(90deg, #fbbf24, #ff8c00, #ff5555, #fbbf24)',
  backgroundSize: '300% 100%',
  animation: 'logo-flow 4s ease-in-out infinite',
  animationDelay: '-2s',
};

export function MindClashLogo({ className = '', size = 'header' }: MindClashLogoProps) {
  const fontSize = size === 'overlay' ? 'clamp(28px, 7vw, 40px)' : '24px';

  return (
    <span
      className={`mindclash-logo inline-flex items-baseline flex-shrink-0 ${className}`.trim()}
      aria-label="MindClash"
    >
      <span className="mindclash-logo-mind" style={{ ...MIND_STYLE, fontSize }}>Mind</span>
      <span className="mindclash-logo-clash" style={{ ...CLASH_STYLE, fontSize }}>Clash</span>
    </span>
  );
}
