'use client';

import { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
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

// ── Session tracking ───────────────────────────────────────────────────────

interface QuestSession {
  dailyDate: string;   // 'YYYY-MM-DD'
  weekKey:   string;   // 'YYYY-WW'
  // snapshot of cumulative stats at session start
  daily: {
    predictionsStart: number;
    winsStart:        number;
    stakedStart:      number;
  };
  weekly: {
    predictionsStart: number;
    winsStart:        number;
    streakStart:      number; // bestStreak snapshot
  };
}

const QUEST_SESSION_KEY = 'mindclash_quest_session_v1';

function getTodayKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getWeekKey(): string {
  const d = new Date();
  const dayNum = d.getUTCDay() || 7;
  const thursday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 4 - dayNum));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${week}`;
}

function loadSession(): QuestSession | null {
  try {
    const raw = localStorage.getItem(QUEST_SESSION_KEY);
    return raw ? (JSON.parse(raw) as QuestSession) : null;
  } catch { return null; }
}

function saveSession(s: QuestSession): void {
  try { localStorage.setItem(QUEST_SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Context ────────────────────────────────────────────────────────────────

const QuestsContext = createContext<QuestsContextType | undefined>(undefined);

export function QuestsProvider({ children }: { children: ReactNode }) {
  const { stats } = usePlayer();

  // Baseline snapshots used to compute today's/this-week's progress
  const [session, setSession] = useState<QuestSession>(() => {
    // On first render, create a neutral zero-progress baseline;
    // real values are hydrated inside the effect below.
    return {
      dailyDate: '',
      weekKey:   '',
      daily:   { predictionsStart: 0, winsStart: 0, stakedStart: 0 },
      weekly:  { predictionsStart: 0, winsStart: 0, streakStart: 0 },
    };
  });

  // Sync / reset session whenever the component mounts or date changes
  useEffect(() => {
    const today  = getTodayKey();
    const week   = getWeekKey();
    const stored = loadSession();

    let updated = stored ?? {
      dailyDate: today,
      weekKey:   week,
      daily:   {
        predictionsStart: stats.totalPredictions,
        winsStart:        stats.wins,
        stakedStart:      stats.totalStaked,
      },
      weekly:  {
        predictionsStart: stats.totalPredictions,
        winsStart:        stats.wins,
        streakStart:      0,
      },
    };

    let changed = false;

    // Daily reset
    if (updated.dailyDate !== today) {
      updated = {
        ...updated,
        dailyDate: today,
        daily: {
          predictionsStart: stats.totalPredictions,
          winsStart:        stats.wins,
          stakedStart:      stats.totalStaked,
        },
      };
      changed = true;
    }

    // Weekly reset
    if (updated.weekKey !== week) {
      updated = {
        ...updated,
        weekKey: week,
        weekly: {
          predictionsStart: stats.totalPredictions,
          winsStart:        stats.wins,
          streakStart:      0,
        },
      };
      changed = true;
    }

    if (changed || !stored) saveSession(updated);
    setSession(updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — date checks happen here

  const value = useMemo<QuestsContextType>(() => {
    // ── Daily session progress (relative to day start) ──────────────────────
    const dailyPreds  = Math.max(0, stats.totalPredictions - session.daily.predictionsStart);
    const dailyWins   = Math.max(0, stats.wins             - session.daily.winsStart);
    const dailyStaked = Math.max(0, stats.totalStaked      - session.daily.stakedStart);

    // ── Weekly session progress (relative to week start) ────────────────────
    const weeklyPreds  = Math.max(0, stats.totalPredictions - session.weekly.predictionsStart);
    const weeklyWins   = Math.max(0, stats.wins             - session.weekly.winsStart);
    // Streak is not additive: track current session's best streak
    const weeklyStreak = Math.max(0, stats.bestStreak - session.weekly.streakStart);

    const daily: Quest[] = [
      {
        id: 'd1', period: 'daily', icon: '🎯',
        title: 'Active Trader',
        description: 'Make 3 predictions today',
        target: 3, progress: Math.min(3, dailyPreds), rewardXp: 50,
        completed: dailyPreds >= 3,
      },
      {
        id: 'd2', period: 'daily', icon: '🏆',
        title: 'First Blood',
        description: 'Win at least 1 round today',
        target: 1, progress: Math.min(1, dailyWins), rewardXp: 75,
        completed: dailyWins >= 1,
      },
      {
        id: 'd3', period: 'daily', icon: '💸',
        title: 'Volume Play',
        description: 'Stake at least 100 CLASH today',
        target: 100, progress: Math.min(100, Math.floor(dailyStaked)), rewardXp: 100,
        completed: dailyStaked >= 100,
      },
    ];

    const weekly: Quest[] = [
      {
        id: 'w1', period: 'weekly', icon: '🔥',
        title: 'Streak Hunter',
        description: 'Reach a 3-round win streak this week',
        target: 3, progress: Math.min(3, weeklyStreak), rewardXp: 250,
        completed: weeklyStreak >= 3,
      },
      {
        id: 'w2', period: 'weekly', icon: '📊',
        title: 'Veteran Week',
        description: 'Make 20 predictions this week',
        target: 20, progress: Math.min(20, weeklyPreds), rewardXp: 300,
        completed: weeklyPreds >= 20,
      },
      {
        id: 'w3', period: 'weekly', icon: '💎',
        title: 'Bot Slayer',
        description: 'Win 10 rounds this week',
        target: 10, progress: Math.min(10, weeklyWins), rewardXp: 500,
        completed: weeklyWins >= 10,
      },
    ];

    const all = [...daily, ...weekly];
    return {
      daily,
      weekly,
      completedCount: all.filter(q => q.completed).length,
      totalCount: all.length,
    };
  }, [stats, session]);

  return <QuestsContext.Provider value={value}>{children}</QuestsContext.Provider>;
}

export function useQuests() {
  const ctx = useContext(QuestsContext);
  if (!ctx) throw new Error('useQuests must be used within QuestsProvider');
  return ctx;
}
