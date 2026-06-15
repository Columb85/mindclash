'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

export const CLASH_TOKEN_ADDRESS = '0xFb178c931e5F64bBA180A4419E4E2f216d1eEDDe' as const;
export const TREASURY_ADDRESS    = '0xA82615C3882170BAFCFb145C19B2D388E7aF5952' as const;

export const CLASH_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'claimFaucet',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs:  [],
    outputs: [],
  },
  {
    name: 'canClaimFaucet',
    type: 'function',
    stateMutability: 'view',
    inputs:  [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'canClaim',  type: 'bool'    },
      { name: 'timeLeft',  type: 'uint256' },
    ],
  },
] as const;

interface ClashContextType {
  clashBalance: number;
  clashPoints: number;
  addPoints: (amount: number, reason: string) => void;
  isLoading: boolean;
  refetchBalance: () => void;
}

const ClashContext = createContext<ClashContextType | undefined>(undefined);

// Points rewards configuration
const POINTS_REWARDS = {
  BET_PLACED: 10,
  ROUND_WON: 50,
  BEAT_AI: 100,
  FIRST_BET_OF_DAY: 25,
  WIN_STREAK_3: 150,
  WIN_STREAK_5: 500,
  REFERRAL: 200,
  TOP_10_LEADERBOARD: 1000,
};

export function ClashProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [clashPoints, setClashPoints] = useState(0);

  // ── Real on-chain $CLASH balance ─────────────────────────────────────────────
  const { data: rawBalance, isLoading: balanceLoading, refetch } = useReadContract({
    address: CLASH_TOKEN_ADDRESS,
    abi: CLASH_ABI,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
    query: {
      enabled: isConnected && !!address,
      staleTime: 15_000,
      gcTime: 60_000,
    },
  });

  const clashBalance = rawBalance !== undefined
    ? Math.floor(Number(formatUnits(rawBalance as bigint, 18)))
    : 0;
  const isLoading = balanceLoading && isConnected && !!address;

  // ── Off-chain points (localStorage) ─────────────────────────────────────────
  useEffect(() => {
    if (!isConnected || !address) { setClashPoints(0); return; }
    try {
      const stored = localStorage.getItem(`clash_points_${address}`);
      if (stored) {
        setClashPoints(parseInt(stored, 10));
      } else {
        setClashPoints(100); // welcome bonus
        localStorage.setItem(`clash_points_${address}`, '100');
      }
    } catch { /* ignore */ }
  }, [isConnected, address]);

  const addPoints = (amount: number, reason: string) => {
    if (!address) return;
    const newPoints = clashPoints + amount;
    setClashPoints(newPoints);
    localStorage.setItem(`clash_points_${address}`, newPoints.toString());
  };

  return (
    <ClashContext.Provider value={{ clashBalance, clashPoints, addPoints, isLoading, refetchBalance: () => { refetch(); } }}>
      {children}
    </ClashContext.Provider>
  );
}

export function useClash() {
  const context = useContext(ClashContext);
  if (!context) {
    throw new Error('useClash must be used within a ClashProvider');
  }
  return context;
}

export { POINTS_REWARDS };
