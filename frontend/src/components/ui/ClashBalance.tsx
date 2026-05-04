'use client';

import { Zap, Coins } from 'lucide-react';
import { useClash } from '@/contexts/ClashContext';
import { useAccount } from 'wagmi';

export function ClashBalance() {
  const { clashBalance, clashPoints, isLoading } = useClash();
  const { isConnected } = useAccount();

  if (!isConnected) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-surface/50 border border-dark-border animate-pulse">
        <div className="w-20 h-4 bg-gray-700 rounded" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {/* $CLASH Balance */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30">
        <Coins className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-bold text-white">
          {clashBalance.toLocaleString()}
        </span>
        <span className="text-xs text-purple-400 font-medium">$CLASH</span>
      </div>

      {/* Clash Points */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
        <Zap className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-bold text-white">
          {clashPoints.toLocaleString()}
        </span>
        <span className="text-xs text-yellow-400 font-medium">Points</span>
      </div>
    </div>
  );
}

// Compact version for mobile
export function ClashBalanceCompact() {
  const { clashBalance, clashPoints, isLoading } = useClash();
  const { isConnected } = useAccount();

  if (!isConnected || isLoading) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex items-center gap-1 text-purple-400">
        <Coins className="w-3 h-3" />
        {clashBalance.toLocaleString()}
      </span>
      <span className="text-gray-600">|</span>
      <span className="flex items-center gap-1 text-yellow-400">
        <Zap className="w-3 h-3" />
        {clashPoints.toLocaleString()}
      </span>
    </div>
  );
}
