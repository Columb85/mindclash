'use client';

import { useClash } from '@/contexts/ClashContext';
import { useAccount } from 'wagmi';

export function ClashBalance() {
  const { clashBalance, clashPoints, isLoading } = useClash();
  const { isConnected } = useAccount();

  if (!isConnected) return null;

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1 animate-pulse"
        style={{ border: '1px solid var(--hud-border)', background: 'var(--hud-panel)' }}
      >
        <div className="w-20 h-3 rounded" style={{ background: 'var(--hud-border-hi)' }} />
      </div>
    );
  }

  return (
    <div className="hud-topbar-util flex items-center gap-2">
      {/* $CLASH — purple (matches mockup .balance-pill.clash) */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1"
        style={{
          border: '1px solid rgba(168,85,247,0.35)',
          background: 'rgba(168,85,247,0.08)',
          clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)',
        }}
      >
        <i className="fa-solid fa-coins text-[11px]" style={{ color: '#a855f7' }} />
        <span style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 12, fontWeight: 500, color: '#fff' }}>
          {clashBalance.toLocaleString()}
        </span>
        <span style={{ fontFamily: 'var(--hud-font-head)', fontSize: 9, fontWeight: 700, color: '#a855f7', letterSpacing: '0.1em' }} className="hud-util-label">
          CLASH
        </span>
      </div>

      {/* Points — gold (matches mockup .balance-pill.pts) */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1"
        style={{
          border: '1px solid rgba(251,191,36,0.35)',
          background: 'rgba(251,191,36,0.06)',
          clipPath: 'polygon(4px 0,100% 0,calc(100% - 4px) 100%,0 100%)',
        }}
      >
        <i className="fa-solid fa-bolt text-[11px]" style={{ color: '#fbbf24' }} />
        <span style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 12, fontWeight: 500, color: '#fff' }}>
          {clashPoints.toLocaleString()}
        </span>
        <span style={{ fontFamily: 'var(--hud-font-head)', fontSize: 9, fontWeight: 700, color: '#fbbf24', letterSpacing: '0.1em' }} className="hud-util-label">
          PTS
        </span>
      </div>
    </div>
  );
}
