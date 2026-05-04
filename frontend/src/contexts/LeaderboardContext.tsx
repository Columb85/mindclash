'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { usePlayer, getRank } from './PlayerContext';

export interface LeaderboardEntry {
  id: string;
  name: string;
  level: number;
  rankName: string;
  rankColor: string;
  rankId: string;
  wins: number;
  predictions: number;
  winRate: number;
  netProfit: number;
  volume: number;
  isYou?: boolean;
}

interface LeaderboardContextType {
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
  yourRank: { daily: number; weekly: number; allTime: number };
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(undefined);

// Deterministic mock leaderboard data
const MOCK_TOPS = [
  { name: 'CryptoOracle.eth',  level: 78, wins: 642, predictions: 812, profit: 45320, volume: 280400 },
  { name: 'DiamondWhale',      level: 65, wins: 518, predictions: 702, profit: 38100, volume: 220800 },
  { name: 'MoonPredictor',     level: 58, wins: 421, predictions: 589, profit: 29850, volume: 185200 },
  { name: '0xSatoshi.eth',     level: 52, wins: 389, predictions: 551, profit: 25600, volume: 164200 },
  { name: 'BullRunKing',       level: 48, wins: 352, predictions: 515, profit: 22100, volume: 142500 },
  { name: 'DegenMaxi',         level: 42, wins: 298, predictions: 462, profit: 18500, volume: 121000 },
  { name: 'AlphaHunter',       level: 38, wins: 271, predictions: 435, profit: 15200, volume: 99400 },
  { name: 'ChartWizard',       level: 35, wins: 245, predictions: 402, profit: 13100, volume: 87300 },
  { name: '0xEmperor',         level: 32, wins: 221, predictions: 372, profit: 11050, volume: 74100 },
  { name: 'SignalSensei',      level: 28, wins: 198, predictions: 345, profit: 9400, volume: 62800 },
  { name: 'MarketMystic',      level: 25, wins: 178, predictions: 318, profit: 7800, volume: 52600 },
  { name: 'PriceProphet',      level: 22, wins: 152, predictions: 282, profit: 6300, volume: 44200 },
  { name: 'TrendTamer',        level: 19, wins: 134, predictions: 259, profit: 5100, volume: 37800 },
  { name: 'BlockOracle',       level: 17, wins: 118, predictions: 231, profit: 4200, volume: 32400 },
  { name: 'VolatilityViking',  level: 15, wins: 102, predictions: 204, profit: 3400, volume: 27500 },
  { name: 'CandleStickNinja',  level: 13, wins: 89,  predictions: 182, profit: 2700, volume: 23000 },
  { name: 'PipHunter',         level: 12, wins: 78,  predictions: 163, profit: 2200, volume: 19400 },
  { name: 'HodlerHero',        level: 10, wins: 67,  predictions: 142, profit: 1700, volume: 16200 },
  { name: 'MomentumMage',      level: 9,  wins: 58,  predictions: 128, profit: 1400, volume: 13800 },
  { name: 'RSIRanger',         level: 8,  wins: 50,  predictions: 114, profit: 1100, volume: 11500 },
];

function toEntry(seed: typeof MOCK_TOPS[number], scale = 1): LeaderboardEntry {
  const rank = getRank(seed.level);
  const wins = Math.max(1, Math.floor(seed.wins * scale));
  const predictions = Math.max(wins, Math.floor(seed.predictions * scale));
  return {
    id: seed.name,
    name: seed.name,
    level: seed.level,
    rankName: rank.name,
    rankColor: rank.color,
    rankId: rank.id,
    wins,
    predictions,
    winRate: (wins / predictions) * 100,
    netProfit: Math.floor(seed.profit * scale),
    volume: Math.floor(seed.volume * scale),
  };
}

function insertYou(list: LeaderboardEntry[], you: LeaderboardEntry): LeaderboardEntry[] {
  const combined = [...list, you].sort((a, b) => b.netProfit - a.netProfit);
  return combined.map(e => (e.id === you.id ? { ...e, isYou: true } : e));
}

export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const { stats } = usePlayer();

  const value = useMemo<LeaderboardContextType>(() => {
    const rank = getRank(stats.level);
    const winRate = stats.totalPredictions > 0 ? (stats.wins / Math.max(1, stats.wins + stats.losses)) * 100 : 0;

    const you: LeaderboardEntry = {
      id: 'YOU',
      name: 'You',
      level: stats.level,
      rankName: rank.name,
      rankColor: rank.color,
      rankId: rank.id,
      wins: stats.wins,
      predictions: stats.totalPredictions,
      winRate,
      netProfit: Math.floor(stats.totalWon - stats.totalStaked),
      volume: Math.floor(stats.totalStaked),
    };

    const allTime = insertYou(MOCK_TOPS.map(m => toEntry(m, 1)), you);
    const weekly  = insertYou(MOCK_TOPS.map(m => toEntry(m, 0.18)), { ...you, netProfit: Math.floor(you.netProfit * 0.3) });
    const daily   = insertYou(MOCK_TOPS.map(m => toEntry(m, 0.03)), { ...you, netProfit: Math.floor(you.netProfit * 0.05) });

    const findRank = (list: LeaderboardEntry[]) => list.findIndex(e => e.isYou) + 1;

    return {
      daily,
      weekly,
      allTime,
      yourRank: {
        daily: findRank(daily),
        weekly: findRank(weekly),
        allTime: findRank(allTime),
      },
    };
  }, [stats]);

  return (
    <LeaderboardContext.Provider value={value}>
      {children}
    </LeaderboardContext.Provider>
  );
}

export function useLeaderboard() {
  const ctx = useContext(LeaderboardContext);
  if (!ctx) throw new Error('useLeaderboard must be used within LeaderboardProvider');
  return ctx;
}
