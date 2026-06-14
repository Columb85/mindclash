'use client';

import { motion } from 'framer-motion';

interface DuelRoundTimerProps {
  secondsLeft: number;
  totalSeconds: number;
  asset: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function DuelRoundTimer({ secondsLeft, totalSeconds, asset }: DuelRoundTimerProps) {
  const progress = totalSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSeconds)) : 0;
  const urgent = secondsLeft <= 10 && secondsLeft > 0;

  const r = 54;
  const c = 2 * Math.PI * r;
  const strokeOff = c * (1 - progress);

  return (
    <div className={`duel-timer-wrap${urgent ? ' urgent' : ''}`}>
      <div className="duel-timer-live">
        <span className="live-dot" />
        LIVE
      </div>

      <div className="duel-timer-ring">
        <svg viewBox="0 0 120 120" aria-hidden>
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={urgent ? 'var(--hud-red)' : 'var(--hud-cyan)'}
            strokeWidth="5"
            strokeDasharray={c}
            strokeDashoffset={strokeOff}
            strokeLinecap="round"
          />
        </svg>
        <motion.div
          key={secondsLeft}
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.18 }}
          className={`duel-timer-digits${urgent ? ' urgent' : ''}`}
        >
          {formatTime(secondsLeft)}
        </motion.div>
      </div>

      <div className="duel-timer-asset">{asset}/USDT</div>

      <div className="duel-timer-bar">
        <div className="duel-timer-bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="duel-live-sub">
        <i className="fa-solid fa-clock mr-1" />
        Round in progress
      </div>
    </div>
  );
}
