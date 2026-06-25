'use client';

import { Direction } from '@/types/room';
import { ShareOnXButton } from '@/components/ui/ShareOnXButton';
import { buildRoundResultShareText } from '@/lib/share-x';

interface RoundResultToastProps {
  toastId: string;
  asset: string;
  winner: Direction | 'TIE';
  outcome: 'win' | 'loss' | 'tie';
  payout: number;
  stake: number;
  profit: number;
  ptsGained: number;
  onViewResults: () => void;
}

export function RoundResultToast({
  asset,
  winner,
  outcome,
  payout,
  stake,
  profit,
  ptsGained,
  onViewResults,
}: RoundResultToastProps) {
  const isWin = outcome === 'win';
  const isTie = outcome === 'tie';

  const borderColor = isWin
    ? 'rgba(0,212,170,0.5)'
    : isTie
      ? 'rgba(251,191,36,0.4)'
      : 'rgba(255,85,85,0.5)';

  const bgColor = isWin
    ? 'rgba(0,40,30,0.97)'
    : isTie
      ? 'rgba(40,35,10,0.97)'
      : 'rgba(40,15,15,0.97)';

  const title = isWin
    ? `You won +${profit.toFixed(0)} CLASH`
    : isTie
      ? 'Round tied — stake returned'
      : `Lost ${stake.toFixed(0)} CLASH`;

  const icon = isWin ? '🎉' : isTie ? '🤝' : '💀';

  const shareText = buildRoundResultShareText({
    asset,
    winner,
    outcome,
    stake,
    profit: isWin ? profit : undefined,
    token: 'CLASH',
  });

  return (
    <div
      style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        padding: '14px 16px',
        fontSize: '12px',
        fontFamily: 'Barlow Condensed, sans-serif',
        color: '#e2e8f0',
        boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
        maxWidth: '360px',
        clipPath: 'polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', marginBottom: 4 }}>
            {title}
          </div>
          <div style={{ color: '#94a3b8', marginBottom: 8 }}>
            {asset} went {winner}
            {isWin && ` · Payout ${payout.toFixed(0)} CLASH`}
            {ptsGained > 0 && ` · +${ptsGained} XP`}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={onViewResults}
              style={{
                background: 'rgba(0,212,170,0.12)',
                border: '1px solid rgba(0,212,170,0.35)',
                color: '#00d4aa',
                padding: '5px 12px',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.06em',
                cursor: 'pointer',
                clipPath: 'polygon(4px 0, 100% 0, calc(100% - 4px) 100%, 0 100%)',
              }}
            >
              VIEW RESULTS
            </button>
            <ShareOnXButton text={shareText} compact label="Share on X" />
          </div>
        </div>
      </div>
    </div>
  );
}
