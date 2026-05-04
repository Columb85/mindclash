'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { usePlayer } from './PlayerContext';

export type QuestPeriod = 'daily' | 'weekly';

export interface Quest {
  id: string;
  period: QuestPeriod;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  rewardXp: number;
  completed: boolean;
}

interface QuestsContextType {
  daily: Quest[];
  weekly: Quest[];
  completedCount: number;
  totalCount: number;
}

const QuestsContext = createContext<QuestsContextType | undefined>(undefined);

export function QuestsProvider({ children }: { children: ReactNode }) {
  const { stats } = usePlayer();

  const value = useMemo<QuestsContextType>(() => {
    const daily: Quest[] = [
      {
        id: 'd1', period: 'daily', icon: '🎯',
        title: 'Make 3 predictions', description: 'Submit 3 predictions today',
        target: 3, progress: Math.min(3, stats.totalPredictions), rewardXp: 50,
        completed: stats.totalPredictions >= 3,
      },
      {
        id: 'd2', period: 'daily', icon: '🏆',
        title: 'Win a round', description: 'Win at least 1 round today',
        target: 1, progress: Math.min(1, stats.wins), rewardXp: 75,
        completed: stats.wins >= 1,
      },
      {
        id: 'd3', period: 'daily', icon: '💸',
        title: 'Stake 100+ total', description: 'Stake at least 100 across predictions',
        target: 100, progress: Math.min(100, Math.floor(stats.totalStaked)), rewardXp: 100,
        completed: stats.totalStaked >= 100,
      },
    ];

    const weekly: Quest[] = [
      {
        id: 'w1', period: 'weekly', icon: '🔥',
        title: '3 win streak', description: 'Reach a 3-round win streak',
        target: 3, progress: Math.min(3, stats.bestStreak), rewardXp: 250,
        completed: stats.bestStreak >= 3,
      },
      {
        id: 'w2', period: 'weekly', icon: '📊',
        title: '20 predictions', description: 'Submit 20 predictions this week',
        target: 20, progress: Math.min(20, stats.totalPredictions), rewardXp: 300,
        completed: stats.totalPredictions >= 20,
      },
      {
        id: 'w3', period: 'weekly', icon: '💎',
        title: 'Win 10 rounds', description: 'Accumulate 10 wins this week',
        target: 10, progress: Math.min(10, stats.wins), rewardXp: 500,
        completed: stats.wins >= 10,
      },
    ];

    const all = [...daily, ...weekly];
    return {
      daily,
      weekly,
      completedCount: all.filter(q => q.completed).length,
      totalCount: all.length,
    };
  }, [stats]);

  return <QuestsContext.Provider value={value}>{children}</QuestsContext.Provider>;
}

export function useQuests() {
  const ctx = useContext(QuestsContext);
  if (!ctx) throw new Error('useQuests must be used within QuestsProvider');
  return ctx;
}
