'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, X, Trophy, Bot } from 'lucide-react';
import { Direction } from '@/types/room';
import { fireConfetti } from '@/lib/confetti';
import type { BotResult } from './GameRoundInterface';

interface ResolutionRevealProps {
  open: boolean;
  onClose: () => void;
  winner: Direction | 'TIE';
  startPrice: number;
  endPrice: number;
  token: string;
  userOutcome?: 'win' | 'loss' | 'tie' | null;
  userPayout?: number;
  userStake?: number;
  botResults?: BotResult[];
  ptsGained?: number;
}

export function ResolutionReveal({
  open,
  onClose,
  winner,
  startPrice,
  endPrice,
  token,
  userOutcome,
  userPayout = 0,
  userStake = 0,
  botResults = [],
  ptsGained = 0,
}: ResolutionRevealProps) {
  const diffPct = startPrice ? ((endPrice - startPrice) / startPrice) * 100 : 0;
  const profit = userPayout - userStake;
  const beaten = botResults.filter(b => b.beat).length;

  useEffect(() => {
    if (open && userOutcome === 'win') fireConfetti();
  }, [open, userOutcome]);

  const winnerLabel = winner === 'UP' ? 'UP' : winner === 'DOWN' ? 'DOWN' : 'TIE';
  const winnerColor = winner === 'UP' ? '#22c55e' : winner === 'DOWN' ? '#ef4444' : '#9ca3af';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-4 right-4 z-50 w-[min(100vw-2rem,320px)] rounded-xl border border-white/10 bg-[#12121a]/95 backdrop-blur-md shadow-xl overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              {winner === 'UP' ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
              ) : winner === 'DOWN' ? (
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              ) : null}
              <span className="text-xs font-bold text-white">Round settled · {winnerLabel}</span>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="px-3 py-2.5 space-y-2 text-xs">
            <div className="flex justify-between text-gray-500 font-mono">
              <span>${startPrice.toFixed(2)} → ${endPrice.toFixed(2)}</span>
              <span style={{ color: winnerColor }}>{diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%</span>
            </div>

            {userOutcome === 'win' && (
              <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-green-500/10 border border-green-500/25">
                <Trophy className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-green-400 font-bold">You won +{profit.toFixed(2)} {token}</div>
                  {ptsGained > 0 && <div className="text-[10px] text-gray-400">+{ptsGained} PTS</div>}
                </div>
              </div>
            )}

            {userOutcome === 'loss' && (
              <div className="px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                Lost {userStake.toFixed(2)} {token}
              </div>
            )}

            {userOutcome === 'tie' && (
              <div className="px-2 py-1.5 rounded-lg bg-gray-500/10 text-gray-300">
                Stake refunded · {userStake.toFixed(2)} {token}
              </div>
            )}

            {botResults.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <Bot className="w-3 h-3" />
                Beat {beaten}/{botResults.length} AI agents
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
