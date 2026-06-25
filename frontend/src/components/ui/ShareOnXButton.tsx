'use client';

import { openShareOnX } from '@/lib/share-x';
import type { ShareCardParams } from '@/lib/share-x';
import { buildSharePageUrl } from '@/lib/share-x';

interface ShareOnXButtonProps {
  text: string;
  url?: string;
  label?: string;
  className?: string;
  compact?: boolean;
  /** When provided, the share link will include og:image card preview */
  ogParams?: ShareCardParams;
}

export function ShareOnXButton({
  text,
  url,
  label = 'Share on X',
  className = '',
  compact = false,
  ogParams,
}: ShareOnXButtonProps) {
  function handleShare() {
    const shareUrl = ogParams ? buildSharePageUrl(ogParams) : url;
    openShareOnX(text, shareUrl);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={`hud-share-x-btn ${compact ? 'hud-share-x-btn--compact' : ''} ${className}`.trim()}
      aria-label={label}
    >
      <span className="hud-share-x-icon" aria-hidden>𝕏</span>
      {!compact && <span>{label}</span>}
    </button>
  );
}
