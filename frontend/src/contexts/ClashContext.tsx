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
  refetchBalance: (optimisticDeduct?: number) => void;
}

const POINTS_KEY_PREFIX = 'clash_points_';

function pointsKey(address: string): string {
  return `${POINTS_KEY_PREFIX}${address.toLowerCase()}`;
}

function readPoints(address: string): number | null {
  try {
    const key = pointsKey(address);
    let raw = localStorage.getItem(key);
    if (raw === null) {
      // migrate legacy mixed-case key
      raw = localStorage.getItem(`${POINTS_KEY_PREFIX}${address}`);
      if (raw !== null) {
        localStorage.setItem(key, raw);
        localStorage.removeItem(`${POINTS_KEY_PREFIX}${address}`);
      }
    }
    if (raw === null) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

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

const ClashContext = createContext<ClashContextType | undefined>(undefined);

export function ClashProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [clashPoints, setClashPoints] = useState(0);
  const [balanceOffset, setBalanceOffset] = useState(0);

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

  const onChainBalance = rawBalance !== undefined
    ? Math.floor(Number(formatUnits(rawBalance as bigint, 18)))
    : 0;
  const clashBalance = Math.max(0, onChainBalance - balanceOffset);
  const isLoading = balanceLoading && isConnected && !!address;

  useEffect(() => { setBalanceOffset(0); }, [rawBalance]);

  // ── Off-chain points (localStorage, per wallet) ─────────────────────────────
  useEffect(() => {
    if (!isConnected || !address) {
      setClashPoints(0);
      return;
    }
    const stored = readPoints(address);
    if (stored !== null) {
      setClashPoints(stored);
    } else {
      setClashPoints(100); // welcome bonus for new wallet
      try {
        localStorage.setItem(pointsKey(address), '100');
      } catch { /* ignore */ }
    }
  }, [isConnected, address]);

  const addPoints = (amount: number, _reason: string) => {
    if (!address) return;
    setClashPoints(prev => {
      const newPoints = prev + amount;
      try {
        localStorage.setItem(pointsKey(address), String(newPoints));
      } catch { /* ignore */ }
      return newPoints;
    });
  };

  return (
    <ClashContext.Provider value={{ clashBalance, clashPoints, addPoints, isLoading, refetchBalance: (optimisticDeduct?: number) => {
      if (optimisticDeduct) setBalanceOffset(prev => prev + optimisticDeduct);
      setTimeout(() => refetch(), 2500);
    } }}>
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
