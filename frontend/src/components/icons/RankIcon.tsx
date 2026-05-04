'use client';

import {
  Sprout, Compass, LineChart, Briefcase, Target, Gem, Crown, Circle,
  LucideIcon,
} from 'lucide-react';

const RANK_CONFIG: Record<string, {
  icon: LucideIcon;
  from: string;
  to: string;
  glow: string;
}> = {
  rookie:     { icon: Sprout,     from: '#86EFAC', to: '#166534', glow: '#22c55e' },
  scout:      { icon: Compass,    from: '#93C5FD', to: '#1E3A8A', glow: '#3b82f6' },
  analyst:    { icon: LineChart,  from: '#C4B5FD', to: '#4C1D95', glow: '#8b5cf6' },
  trader:     { icon: Briefcase,  from: '#FDE68A', to: '#92400E', glow: '#f59e0b' },
  strategist: { icon: Target,     from: '#FCA5A5', to: '#991B1B', glow: '#ef4444' },
  oracle:     { icon: Gem,        from: '#F9A8D4', to: '#9D174D', glow: '#ec4899' },
  legend:     { icon: Crown,      from: '#FCD34D', to: '#B45309', glow: '#fbbf24' },
};

export function RankIcon({
  rankId,
  className,
  size = 18,
}: {
  rankId: string;
  className?: string;
  size?: number;
}) {
  const cfg = RANK_CONFIG[rankId];
  if (!cfg) {
    return <Circle size={size} className={className} strokeWidth={2} />;
  }
  const Icon = cfg.icon;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md ${className ?? ''}`}
      style={{
        width: size + 6,
        height: size + 6,
        background: `linear-gradient(135deg, ${cfg.from}30, ${cfg.to}50)`,
        border: `1px solid ${cfg.from}25`,
        boxShadow: `0 0 ${size * 0.6}px ${cfg.glow}20`,
      }}
    >
      <Icon
        size={size * 0.75}
        style={{ color: cfg.from }}
        strokeWidth={2.5}
      />
    </span>
  );
}
