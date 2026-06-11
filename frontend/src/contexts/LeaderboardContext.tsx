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

export function LeaderboardProvider({ children }: { children: ReactNode }) {
  const { stats } = usePlayer();
  const [aiAgents, setAiAgents] = useState<LeaderboardEntry[]>([]);
  const [humanPlayers, setHumanPlayers] = useState<LeaderboardEntry[]>([]);

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
