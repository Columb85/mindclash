'use client';

interface IconProps {
  className?: string;
}

/**
 * Real crypto logos via CoinGecko CDN.
 * CLASH uses a custom SVG (our native token).
 */

const LOCAL_ICON_URLS: Record<string, string> = {
  BTC:  '/crypto/btc.png',
  ETH:  '/crypto/eth.png',
  SOL:  '/crypto/sol.png',
  MNT:  '/crypto/mnt.png',
  USDC: '/crypto/usdc.png',
  USDT: '/crypto/usdt.png',
};

/** Inline image — uses local static files only, no external requests */
export function CryptoImg({ symbol, className }: { symbol: string; className?: string }) {
  const url = LOCAL_ICON_URLS[symbol];
  if (!url) return <span className={className}>{symbol.slice(0, 1)}</span>;
  return (
    <img
      src={url}
      alt={symbol}
      className={`rounded-full object-cover ${className ?? ''}`}
    />
  );
}

function PremiumToken({
  id,
  bgFrom,
  bgTo,
  glowColor,
  children,
  className,
  ringColor,
}: {
  id: string;
  bgFrom: string;
  bgTo: string;
  glowColor: string;
  ringColor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const bgGrad = `${id}-bg`;
  const hlGrad = `${id}-hl`;
  const innerShadow = `${id}-is`;
  const glowFilter = `${id}-glow`;

  return (
    <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        {/* Main body gradient — top-lit sphere illusion */}
        <radialGradient id={bgGrad} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor={bgFrom} />
          <stop offset="100%" stopColor={bgTo} />
        </radialGradient>

        {/* Top specular highlight */}
        <radialGradient id={hlGrad} cx="38%" cy="28%" r="35%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Inner shadow for depth */}
        <radialGradient id={innerShadow} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
        </radialGradient>

        {/* Outer glow filter */}
        <filter id={glowFilter} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feColorMatrix in="blur" type="matrix"
            values={`0 0 0 0 ${parseInt(glowColor.slice(1,3),16)/255}
                     0 0 0 0 ${parseInt(glowColor.slice(3,5),16)/255}
                     0 0 0 0 ${parseInt(glowColor.slice(5,7),16)/255}
                     0 0 0 0.4 0`} result="colorBlur"/>
          <feMerge>
            <feMergeNode in="colorBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow circle */}
      <circle cx="40" cy="40" r="38" fill={glowColor} opacity="0.12" />

      {/* Main body */}
      <circle cx="40" cy="40" r="34" fill={`url(#${bgGrad})`} />

      {/* Inner shadow rim */}
      <circle cx="40" cy="40" r="34" fill={`url(#${innerShadow})`} />

      {/* Subtle edge ring */}
      <circle cx="40" cy="40" r="34" fill="none"
        stroke={ringColor ?? `${bgFrom}60`} strokeWidth="0.8" opacity="0.6" />

      {/* Specular highlight */}
      <ellipse cx="34" cy="24" rx="18" ry="10" fill={`url(#${hlGrad})`} />

      {/* Brand glyph */}
      <g filter={`url(#${glowFilter})`}>{children}</g>
    </svg>
  );
}

export const BitcoinIcon = ({ className }: IconProps) => (
  <PremiumToken
    id="btc"
    bgFrom="#FFB74D"
    bgTo="#E65100"
    glowColor="#FF9800"
    ringColor="#FFD54F50"
    className={className}
  >
    <path
      fill="#FFFFFF"
      d="M50.82 34.47c.49-3.28-2.01-5.04-5.42-6.22l1.11-4.44-2.7-.67-1.08 4.32c-.71-.18-1.44-.34-2.17-.51l1.09-4.35L38.95 26l-1.1 4.44c-.59-.13-1.16-.27-1.72-.41v-.01l-3.73-.93-.72 2.88s2.01.46 1.96.5c1.09.27 1.29.99 1.25 1.57l-1.26 5.06c.08.02.17.05.28.09-.09-.02-.18-.05-.28-.07l-1.77 7.08c-.13.33-.47.83-1.24.64.03.04-1.96-.49-1.96-.49l-1.34 3.09 3.52.88c.65.16 1.29.33 1.92.49l-1.12 4.5 2.7.67 1.11-4.45c.74.2 1.45.38 2.15.56l-1.1 4.42 2.7.67 1.12-4.49c4.61.87 8.07.52 9.53-3.65 1.17-3.35-.06-5.29-2.48-6.55 1.76-.41 3.09-1.57 3.45-3.97zm-6.17 8.65c-.83 3.35-6.48 1.54-8.31 1.09l1.49-5.95c1.83.46 7.7 1.36 6.82 4.86zm.83-8.7c-.76 3.05-5.46 1.5-6.98 1.12l1.34-5.39c1.52.38 6.44 1.09 5.64 4.27z"
      transform="translate(9,6) scale(0.82)"
    />
  </PremiumToken>
);

export const EthereumIcon = ({ className }: IconProps) => (
  <PremiumToken
    id="eth"
    bgFrom="#A5B4FC"
    bgTo="#3730A3"
    glowColor="#818CF8"
    ringColor="#C7D2FE50"
    className={className}
  >
    <g transform="translate(8,4) scale(0.82)">
      <path fill="#FFFFFF" fillOpacity="0.5" d="M40 12v16l16 7z" />
      <path fill="#FFFFFF" d="M40 12L24 35l16-7z" />
      <path fill="#FFFFFF" fillOpacity="0.5" d="M40 52v12l16-22z" />
      <path fill="#FFFFFF" d="M40 64V52l-16-9z" />
      <path fill="#FFFFFF" fillOpacity="0.25" d="M40 49l16-9-16-7z" />
      <path fill="#FFFFFF" fillOpacity="0.75" d="M24 40l16 9V33z" />
    </g>
  </PremiumToken>
);

export const SolanaIcon = ({ className }: IconProps) => (
  <PremiumToken
    id="sol"
    bgFrom="#2DD4BF"
    bgTo="#6D28D9"
    glowColor="#8B5CF6"
    ringColor="#A78BFA50"
    className={className}
  >
    <defs>
      <linearGradient id="sol-bar2" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stopColor="#00FFA3" />
        <stop offset="50%" stopColor="#01D4FF" />
        <stop offset="100%" stopColor="#DC1FFF" />
      </linearGradient>
    </defs>
    <g transform="translate(14, 20) scale(0.72)">
      <path fill="url(#sol-bar2)"
        d="M5.85 19.37a1.18 1.18 0 0 1 .83-.34h26.2a.58.58 0 0 1 .41.99l-5.18 5.18a1.18 1.18 0 0 1-.83.34H.95a.58.58 0 0 1-.41-.99l5.31-5.18zm0-19.33a1.18 1.18 0 0 1 .83-.34h26.2a.58.58 0 0 1 .41.99L28.11 5.87a1.18 1.18 0 0 1-.83.34H.95a.58.58 0 0 1-.41-.99L5.85.04zM28.11 9.65a1.18 1.18 0 0 0-.83-.34h-26.2a.58.58 0 0 0-.41.99l5.18 5.18a1.18 1.18 0 0 0 .83.34h26.2a.58.58 0 0 0 .41-.99l-5.18-5.18z"
      />
    </g>
  </PremiumToken>
);

export const USDCIcon = ({ className }: IconProps) => (
  <PremiumToken
    id="usdc"
    bgFrom="#93C5FD"
    bgTo="#1E3A8A"
    glowColor="#3B82F6"
    ringColor="#BFDBFE50"
    className={className}
  >
    <g transform="translate(16, 16) scale(0.6)">
      <path fill="#FFFFFF" d="M40 8c17.67 0 32 14.33 32 32S57.67 72 40 72 8 57.67 8 40 22.33 8 40 8zm6.6 33.2c0-5.6-3.8-7.6-11.2-8.6-5.2-.8-6.2-2.2-6.2-4.2 0-2.2 1.8-3.8 5.2-3.8 3.2 0 5 1.2 5.8 3.8.2.6.8 1 1.4 1h3.2c.8 0 1.4-.6 1.4-1.2v-.4c-1-4.2-4.2-7-8.6-7.4v-4c0-.8-.6-1.4-1.6-1.4h-3c-.8 0-1.4.6-1.4 1.4v3.8c-5.4.8-9 4.6-9 9.4 0 5.8 3.6 7.8 11 8.8 5 .9 6 2 6 4.2s-2 3.8-5.4 3.8c-4.2 0-6.2-1.8-7-4.4-.2-.6-.8-1-1.4-1h-3c-.8 0-1.4.6-1.4 1.2v.4c1 5 4.6 8.2 10.2 8.8v4c0 .8.6 1.4 1.4 1.4h3c.8 0 1.4-.6 1.4-1.4v-4c5.4-.8 9.2-4.8 9.2-9.8z"/>
    </g>
  </PremiumToken>
);

export const USDTIcon = ({ className }: IconProps) => (
  <PremiumToken
    id="usdt"
    bgFrom="#6EE7B7"
    bgTo="#065F46"
    glowColor="#10B981"
    ringColor="#A7F3D050"
    className={className}
  >
    <g transform="translate(16, 14) scale(0.6)">
      <path fill="#FFFFFF" d="M40 8c17.67 0 32 14.33 32 32S57.67 72 40 72 8 57.67 8 40 22.33 8 40 8zm14 20.6H46v-5.2c0-1-.8-1.8-1.8-1.8H35.8c-1 0-1.8.8-1.8 1.8v5.2H26c-1 0-1.8.8-1.8 1.8v6c0 1 .8 1.8 1.8 1.8h8v5.2c0 1 .8 1.8 1.8 1.8h8.4c1 0 1.8-.8 1.8-1.8V38.2h8c1 0 1.8-.8 1.8-1.8v-6c0-1-.8-1.8-1.8-1.8z"/>
    </g>
  </PremiumToken>
);

// CLASH Token Icon - Our native platform token
export const CLASHIcon = ({ className }: IconProps) => (
  <PremiumToken
    id="clash"
    bgFrom="#A78BFA"
    bgTo="#5B21B6"
    glowColor="#8B5CF6"
    ringColor="#C4B5FD50"
    className={className}
  >
    <g transform="translate(16, 16) scale(0.6)">
      {/* Lightning bolt symbol for CLASH */}
      <path fill="#FFFFFF" d="M44 10L22 42h14L32 70l22-32H40L44 10z"/>
    </g>
  </PremiumToken>
);

export const CryptoIcon = ({ symbol, className }: { symbol: string; className?: string }) => {
  if (symbol === 'CLASH') return <CLASHIcon className={className} />;

  const url = LOCAL_ICON_URLS[symbol];
  if (url) {
    return (
      <img
        src={url}
        alt={symbol}
        className={`rounded-full object-cover ${className ?? ''}`}
      />
    );
  }

  return (
    <div
      className={`${className ?? ''} flex items-center justify-center rounded-full bg-dark-surface border border-dark-border`}
    >
      <span className="font-black text-white/80 text-xs">{symbol.slice(0, 2)}</span>
    </div>
  );
};
