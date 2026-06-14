'use client';

import { useEffect, useState } from 'react';
import { useActiveRound } from '@/contexts/ActiveRoundContext';

export function ActiveRoundBanner() {
  const { pinnedRoom, isAwayFromRound, returnToRound } = useActiveRound();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!isAwayFromRound) return;
    const i = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(i);
  }, [isAwayFromRound]);

  if (!isAwayFromRound || !pinnedRoom) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = pinnedRoom.status === 'open'
    ? pinnedRoom.startTime - nowSec
    : pinnedRoom.endTime - nowSec;

  const fmtTime = (sec: number) => {
    const m = Math.floor(Math.abs(sec) / 60);
    const s = Math.abs(sec) % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const statusLabel = pinnedRoom.status === 'open' ? 'OPEN' : 'LIVE';
  const timeLabel = pinnedRoom.status === 'open' ? 'until lock' : 'until result';

  return (
    <div className="hud-active-round-banner">
      <div className="hud-active-round-left">
        <span className={`hud-active-round-dot ${pinnedRoom.status}`} />
        <div>
          <div className="hud-active-round-title">
            Your {pinnedRoom.asset} round is {statusLabel}
          </div>
          <div className="hud-active-round-sub">
            {fmtTime(secsLeft)} {timeLabel}
          </div>
        </div>
      </div>
      <button className="hud-active-round-btn" onClick={returnToRound}>
        <i className="fa-solid fa-arrow-right-to-bracket" />
        Return to Round
      </button>
    </div>
  );
}
