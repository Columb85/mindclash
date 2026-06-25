'use client';

import { openShareOnX } from '@/lib/share-x';

interface ShareOnXButtonProps {
  text: string;
  url?: string;
  label?: string;
  className?: string;
  compact?: boolean;
}

export function ShareOnXButton({
  text,
  url,
  label = 'Share on X',
  className = '',
  compact = false,
}: ShareOnXButtonProps) {
  return (
    <button
      type="button"
      onClick={() => openShareOnX(text, url)}
      className={`hud-share-x-btn ${compact ? 'hud-share-x-btn--compact' : ''} ${className}`.trim()}
      aria-label={label}
    >
      <span className="hud-share-x-icon" aria-hidden>𝕏</span>
      {!compact && <span>{label}</span>}
    </button>
  );
}
