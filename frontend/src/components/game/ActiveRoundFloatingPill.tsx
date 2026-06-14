'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useActiveRound } from '@/contexts/ActiveRoundContext';

export function ActiveRoundFloatingPill() {
  const pathname = usePathname();
  const { pinnedRoom, isAwayFromRound, returnToRound } = useActiveRound();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!isAwayFromRound) return;
    const i = setInterval(() => tick(n => n + 1), 1000);
    return () => clearInterval(i);
  }, [isAwayFromRound]);

  // Banner on /app already covers this case
  if (pathname === '/app' || !isAwayFromRound || !pinnedRoom) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = pinnedRoom.status === 'open'
    ? pinnedRoom.startTime - nowSec
    : pinnedRoom.endTime - nowSec;

  const m = Math.floor(Math.abs(secsLeft) / 60);
  const s = Math.abs(secsLeft) % 60;
  const timeStr = `${m}:${s.toString().padStart(2, '0')}`;

  return (
    <button className="hud-active-round-pill" onClick={returnToRound}>
      <span className={`hud-active-round-dot ${pinnedRoom.status}`} />
      <span>
        {pinnedRoom.asset} {pinnedRoom.status === 'live' ? 'LIVE' : 'OPEN'} · {timeStr}
      </span>
      <i className="fa-solid fa-arrow-right text-[9px]" />
    </button>
  );
}
