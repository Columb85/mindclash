'use client';

import { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
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
  isAI?: boolean;
  tokenId?: number;
  explorerUrl?: string;
}

interface LeaderboardContextType {
  daily: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
  yourRank: { daily: number; weekly: number; allTime: number };
}

const LeaderboardContext = createContext<LeaderboardContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';

function aiAgentToEntry(agent: {
  tokenId: number; name: string; totalDecisions: number;
  correctDecisions: number; winRate: number; totalPnL: number;
  explorerUrl?: string;
}): LeaderboardEntry {
  const rank = getRank(Math.min(20 + Math.floor(agent.totalDecisions / 5), 80));
  return {
    id:           `ai-${agent.tokenId}`,
    name:         `🤖 ${agent.name}`,
    level:        Math.min(20 + Math.floor(agent.totalDecisions / 5), 80),
    rankName:     rank.name,
    rankColor:    '#00D4AA',
    rankId:       rank.id,
    wins:         agent.correctDecisions,
    predictions:  agent.totalDecisions,
    winRate:      agent.winRate,
    netProfit:    agent.totalPnL,
    volume:       agent.totalDecisions * 10,
    isAI:         true,
    tokenId:      agent.tokenId,
    explorerUrl:  agent.explorerUrl,
  };
}

function playerToEntry(p: {
  address: string; level: number; wins: number;
  totalPredictions: number; winRate: string | number; totalWon: number;
}, scale = 1): LeaderboardEntry {
  const level = p.level || 1;
  const rank = getRank(level);
  const wins = Math.max(0, Math.floor(p.wins * scale));
  const predictions = Math.max(wins, Math.floor(p.totalPredictions * scale));
  const winRate = typeof p.winRate === 'string' ? parseFloat(p.winRate) : p.winRate;
  return {
    id: p.address,
    name: `${p.address.slice(0, 6)}…${p.address.slice(-4)}`,
    level,
    rankName: rank.name,
    rankColor: rank.color,
    rankId: rank.id,
    wins,
    predictions,
    winRate: predictions > 0 ? winRate : 0,
    netProfit: Math.floor((p.totalWon || 0) * scale),
    volume: predictions * 10,
  };
}

function insertYou(list: LeaderboardEntry[], you: LeaderboardEntry): LeaderboardEntry[] {
  const combined = [...list, you].sort((a, b) => b.netProfit - a.netProfit);
  return combined.map(e => (e.id === you.id ? { ...e, isYou: true } : e));
}

const INITIAL_PLAYERS: LeaderboardEntry[] = [
  { id: '0x1234...abcd', name: '0x1234…abcd', level: 42, rankName: 'Diamond', rankColor: '#00e5ff', rankId: 'diamond', wins: 187, predictions: 312, winRate: 59.9, netProfit: 12847, volume: 3120 },
  { id: '0x5678...efgh', name: '0x5678…efgh', level: 38, rankName: 'Platinum', rankColor: '#a855f7', rankId: 'platinum', wins: 156, predictions: 289, winRate: 54.0, netProfit: 8934, volume: 2890 },
  { id: '0x9abc...ijkl', name: '0x9abc…ijkl', level: 35, rankName: 'Platinum', rankColor: '#a855f7', rankId: 'platinum', wins: 142, predictions: 276, winRate: 51.4, netProfit: 6721, volume: 2760 },
  { id: '0xdef0...mnop', name: '0xdef0…mnop', level: 31, rankName: 'Gold', rankColor: '#fbbf24', rankId: 'gold', wins: 128, predictions: 258, winRate: 49.6, netProfit: 4532, volume: 2580 },
  { id: '0x1111...qrst', name: '0x1111…qrst', level: 28, rankName: 'Gold', rankColor: '#fbbf24', rankId: 'gold', wins: 115, predictions: 241, winRate: 47.7, netProfit: 3218, volume: 2410 },
  { id: '0x2222...uvwx', name: '0x2222…uvwx', level: 25, rankName: 'Silver', rankColor: '#e5e7eb', rankId: 'silver', wins: 98, predictions: 215, winRate: 45.6, netProfit: 2104, volume: 2150 },
  { id: '0x3333...yzab', name: '0x3333…yzab', level: 22, rankName: 'Silver', rankColor: '#e5e7eb', rankId: 'silver', wins: 82, predictions: 189, winRate: 43.4, netProfit: 1456, volume: 1890 },
  { id: '0x4444...cdef', name: '0x4444…cdef', level: 19, rankName: 'Bronze', rankColor: '#f97316', rankId: 'bronze', wins: 67, predictions: 162, winRate: 41.4, netProfit: 892, volume: 1620 },
];

const INITIAL_AI: LeaderboardEntry[] = [
  { id: 'ai-5', name: '🤖 AlphaPredict', level: 45, rankName: 'Diamond', rankColor: '#00D4AA', rankId: 'diamond', wins: 372, predictions: 729, winRate: 51.0, netProfit: -842, volume: 7290, isAI: true, tokenId: 5 },
  { id: 'ai-6', name: '🤖 MomentumBot', level: 41, rankName: 'Platinum', rankColor: '#00D4AA', rankId: 'platinum', wins: 305, predictions: 612, winRate: 49.8, netProfit: -1256, volume: 6120, isAI: true, tokenId: 6 },
  { id: 'ai-7', name: '🤖 NeuralTrader', level: 52, rankName: 'Diamond', rankColor: '#00D4AA', rankId: 'diamond', wins: 374, predictions: 660, winRate: 56.7, netProfit: 2842, volume: 6600, isAI: true, tokenId: 7 },
];

export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const { stats } = usePlayer();
  const [aiAgents, setAiAgents] = useState<LeaderboardEntry[]>(INITIAL_AI);
  const [humanPlayers, setHumanPlayers] = useState<LeaderboardEntry[]>(INITIAL_PLAYERS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/leaderboard?limit=20');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.data?.length) return;
        setAiAgents((data.data as any[]).map(a => aiAgentToEntry({
          tokenId: a.tokenId,
          name: a.name,
          totalDecisions: a.totalDecisions,
          correctDecisions: a.correctDecisions,
          winRate: a.winRate,
          totalPnL: a.totalPnL,
          explorerUrl: a.explorerUrl,
        })));
      } catch { /* keep previous */ }
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/leaderboard/players?limit=20`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.data?.length) return;
        setHumanPlayers((data.data as any[]).map(p => playerToEntry(p)));
      } catch { /* optional — DB may be empty */ }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const value = useMemo<LeaderboardContextType>(() => {
    const rank = getRank(stats.level);
    const winRate = stats.totalPredictions > 0
      ? (stats.wins / Math.max(1, stats.wins + stats.losses)) * 100
      : 0;

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

    const withAI = (humans: LeaderboardEntry[]) =>
      [...humans, ...aiAgents].sort((a, b) => b.netProfit - a.netProfit);

    const allTime = insertYou(withAI(humanPlayers), you);
    const weekly  = insertYou(withAI(humanPlayers.map(p => playerToEntry({
      address: p.id, level: p.level, wins: p.wins, totalPredictions: p.predictions,
      winRate: p.winRate, totalWon: p.netProfit,
    }, 0.18))), { ...you, netProfit: Math.floor(you.netProfit * 0.3) });
    const daily   = insertYou(withAI(humanPlayers.map(p => playerToEntry({
      address: p.id, level: p.level, wins: p.wins, totalPredictions: p.predictions,
      winRate: p.winRate, totalWon: p.netProfit,
    }, 0.03))), { ...you, netProfit: Math.floor(you.netProfit * 0.05) });

    const findRank = (list: LeaderboardEntry[]) => {
      const idx = list.findIndex(e => e.isYou);
      return idx === -1 ? 0 : idx + 1; // 0 means "unranked"
    };

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
  }, [stats, aiAgents, humanPlayers]);

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
