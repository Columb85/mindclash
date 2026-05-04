'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

export interface Rank {
  id: string;
  name: string;
  minLevel: number;
  color: string;
  icon: string;
}

export const RANKS: Rank[] = [
  { id: 'rookie',    name: 'Rookie',    minLevel: 1,  color: '#9ca3af', icon: '🥉' },
  { id: 'scout',     name: 'Scout',     minLevel: 5,  color: '#60a5fa', icon: '🔎' },
  { id: 'analyst',   name: 'Analyst',   minLevel: 10, color: '#34d399', icon: '📊' },
  { id: 'trader',    name: 'Trader',    minLevel: 20, color: '#a78bfa', icon: '💼' },
  { id: 'strategist',name: 'Strategist',minLevel: 35, color: '#f59e0b', icon: '🎯' },
  { id: 'oracle',    name: 'Oracle',    minLevel: 50, color: '#ec4899', icon: '🔮' },
  { id: 'legend',    name: 'Legend',    minLevel: 75, color: '#ef4444', icon: '👑' },
];

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  unlockedAt?: number;
}

export interface PlayerStats {
  xp: number;
  level: number;
  totalPredictions: number;
  wins: number;
  losses: number;
  ties: number;
  totalStaked: number;
  totalWon: number;
  currentStreak: number;
  bestStreak: number;
  lastPredictionAt: number;
  achievements: Record<string, Achievement>;
}

const DEFAULT_ACHIEVEMENTS: Record<string, Achievement> = {
  first_pred:  { id: 'first_pred',  title: 'First Steps',   description: 'Make your first prediction',       icon: '🎯', type: 'bronze',   unlocked: false },
  first_win:   { id: 'first_win',   title: 'First Blood',   description: 'Win your first round',             icon: '🏆', type: 'bronze',   unlocked: false },
  streak_3:    { id: 'streak_3',    title: 'On Fire',       description: 'Win 3 rounds in a row',            icon: '🔥', type: 'silver',   unlocked: false },
  streak_5:    { id: 'streak_5',    title: 'Unstoppable',   description: 'Win 5 rounds in a row',            icon: '⚡', type: 'gold',     unlocked: false },
  streak_10:   { id: 'streak_10',   title: 'Oracle Mind',   description: 'Win 10 rounds in a row',           icon: '🔮', type: 'platinum', unlocked: false },
  big_win:       { id: 'big_win',       title: 'Big Winner',      description: 'Win more than 500 in one round',     icon: '💰', type: 'gold',     unlocked: false },
  high_roller:   { id: 'high_roller',   title: 'High Roller',     description: 'Stake 1000+ in one prediction',      icon: '🎰', type: 'silver',   unlocked: false },
  veteran:       { id: 'veteran',       title: 'Veteran',         description: 'Make 100 predictions',               icon: '🎖️', type: 'gold',    unlocked: false },
  level_10:      { id: 'level_10',      title: 'Rising Star',     description: 'Reach level 10',                     icon: '⭐', type: 'silver',   unlocked: false },
  level_25:      { id: 'level_25',      title: 'Seasoned',        description: 'Reach level 25',                     icon: '🌟', type: 'gold',     unlocked: false },
  beat_a_bot:    { id: 'beat_a_bot',    title: 'Bot Slayer',      description: 'Beat an AI agent in a round',        icon: '🤖', type: 'bronze',   unlocked: false },
  beat_all_bots: { id: 'beat_all_bots', title: 'AI Terminator',   description: 'Beat ALL 3 AI agents in one round',  icon: '🦾', type: 'platinum', unlocked: false },
  bot_nemesis:   { id: 'bot_nemesis',   title: 'Bot Nemesis',     description: 'Beat bots 10 times total',           icon: '⚔️', type: 'gold',    unlocked: false },
};

const DEFAULT_STATS: PlayerStats = {
  xp: 0,
  level: 1,
  totalPredictions: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  totalStaked: 0,
  totalWon: 0,
  currentStreak: 0,
  bestStreak: 0,
  lastPredictionAt: 0,
  achievements: DEFAULT_ACHIEVEMENTS,
};

const STORAGE_KEY = 'gamefi_player_stats_v1';

// PTS curve: total PTS required to reach level N.
// Level 1 = 0 PTS baseline. Level N = floor(100 * (N-1)^1.5).
//   Lvl 2 -> 100 PTS, Lvl 5 -> 800, Lvl 10 -> 2700, Lvl 25 -> 13500, Lvl 50 -> 34300, Lvl 75 -> 63000
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.5));
}
export function levelFromXp(xp: number): number {
  let lvl = 1;
  while (xp >= xpForLevel(lvl + 1)) lvl++;
  return lvl;
}
export function xpProgressInLevel(xp: number): { current: number; needed: number; pct: number } {
  const safeXp = Math.max(0, xp);
  const lvl = levelFromXp(safeXp);
  const curBase = xpForLevel(lvl);
  const nextBase = xpForLevel(lvl + 1);
  const current = Math.max(0, safeXp - curBase);
  const needed = Math.max(1, nextBase - curBase);
  const pct = Math.min(100, Math.max(0, (current / needed) * 100));
  return { current, needed, pct };
}
export function getRank(level: number): Rank {
  return [...RANKS].reverse().find(r => level >= r.minLevel) ?? RANKS[0];
}

export interface PredictionResult {
  outcome: 'win' | 'loss' | 'tie';
  stake: number;
  payout: number; // gross payout (including stake) for wins; 0 for losses; stake for ties
  botsBeaten?: number; // 0-3: how many AI bots the player beat in this round
}

interface PlayerContextType {
  stats: PlayerStats;
  recordPrediction: (stake: number) => Achievement[];
  recordResult: (result: PredictionResult) => Achievement[];
  resetStats: () => void;
  totalBotsBeaten: number;
}

// PTS rules
// - Prediction: 10 base + floor(stake / 50) (capped at +40). Stake 50 -> 11, 500 -> 20, 2000 -> 50
// - Win:       40 base + floor(profit / 20). Profit 100 -> 45, 500 -> 65, 2000 -> 140
// - Loss:      5 (consolation)
// - Tie:       10 (refund-only round)
// - Beat 1 bot: +30 PTS bonus  | Beat 2 bots: +70 PTS | Beat all 3: +150 PTS
export function xpForPrediction(stake: number): number {
  return 10 + Math.min(40, Math.floor(Math.max(0, stake) / 50));
}
export function xpForOutcome(outcome: 'win' | 'loss' | 'tie', profit: number): number {
  if (outcome === 'win') return 40 + Math.floor(Math.max(0, profit) / 20);
  if (outcome === 'tie') return 10;
  return 5;
}
export function xpForBotBeating(botsBeaten: number): number {
  if (botsBeaten <= 0) return 0;
  if (botsBeaten === 1) return 30;
  if (botsBeaten === 2) return 70;
  return 150; // beat all 3
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [stats, setStats]           = useState<PlayerStats>(DEFAULT_STATS);
  const [totalBotsBeaten, setBotsBeaten] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PlayerStats;
        setStats({
          ...DEFAULT_STATS,
          ...parsed,
          achievements: { ...DEFAULT_ACHIEVEMENTS, ...(parsed.achievements || {}) },
        });
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (s: PlayerStats) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {/* ignore */}
  };

  const recordPrediction = useCallback((stake: number): Achievement[] => {
    const newlyUnlocked: Achievement[] = [];
    setStats(prev => {
      const safeStake = Math.max(0, stake);
      const totalPredictions = prev.totalPredictions + 1;
      const totalStaked = prev.totalStaked + safeStake;
      const xpGain = xpForPrediction(safeStake);
      const xp = prev.xp + xpGain;
      const level = levelFromXp(xp);

      const achievements = { ...prev.achievements };
      const unlock = (id: string) => {
        if (achievements[id] && !achievements[id].unlocked) {
          achievements[id] = { ...achievements[id], unlocked: true, unlockedAt: Date.now() };
          newlyUnlocked.push(achievements[id]);
        }
      };

      if (totalPredictions === 1) unlock('first_pred');
      if (safeStake >= 1000) unlock('high_roller');
      if (totalPredictions >= 100) unlock('veteran');
      if (level >= 10) unlock('level_10');
      if (level >= 25) unlock('level_25');

      const next: PlayerStats = {
        ...prev,
        totalPredictions,
        totalStaked,
        xp,
        level,
        achievements,
        lastPredictionAt: Date.now(),
      };
      persist(next);
      return next;
    });
    return newlyUnlocked;
  }, []);

  const recordResult = useCallback((result: PredictionResult): Achievement[] => {
    const newlyUnlocked: Achievement[] = [];
    const bots = Math.max(0, Math.min(3, result.botsBeaten ?? 0));
    if (bots > 0) setBotsBeaten(prev => prev + bots);

    setStats(prev => {
      const isWin = result.outcome === 'win';
      const isLoss = result.outcome === 'loss';
      const isTie = result.outcome === 'tie';

      const profit  = isWin ? Math.max(0, result.payout - result.stake) : 0;
      const xpGain  = xpForOutcome(result.outcome, profit) + xpForBotBeating(bots);

      const wins    = prev.wins + (isWin ? 1 : 0);
      const losses  = prev.losses + (isLoss ? 1 : 0);
      const ties    = prev.ties + (isTie ? 1 : 0);
      const totalWon       = prev.totalWon + profit;
      const currentStreak  = isWin ? prev.currentStreak + 1 : isLoss ? 0 : prev.currentStreak;
      const bestStreak     = Math.max(prev.bestStreak, currentStreak);
      const xp    = prev.xp + xpGain;
      const level = levelFromXp(xp);

      const achievements = { ...prev.achievements };
      const unlock = (id: string) => {
        if (achievements[id] && !achievements[id].unlocked) {
          achievements[id] = { ...achievements[id], unlocked: true, unlockedAt: Date.now() };
          newlyUnlocked.push(achievements[id]);
        }
      };

      if (isWin) {
        if (wins === 1) unlock('first_win');
        if (currentStreak >= 3) unlock('streak_3');
        if (currentStreak >= 5) unlock('streak_5');
        if (currentStreak >= 10) unlock('streak_10');
        if (profit >= 500) unlock('big_win');
      }
      if (level >= 10) unlock('level_10');
      if (level >= 25) unlock('level_25');
      if (bots >= 1) unlock('beat_a_bot');
      if (bots >= 3) unlock('beat_all_bots');

      const next: PlayerStats = {
        ...prev,
        wins, losses, ties, totalWon,
        currentStreak, bestStreak,
        xp, level, achievements,
      };
      persist(next);
      return next;
    });
    return newlyUnlocked;
  }, []);

  const resetStats = useCallback(() => {
    setStats(DEFAULT_STATS);
    persist(DEFAULT_STATS);
  }, []);

  return (
    <PlayerContext.Provider value={{ stats, recordPrediction, recordResult, resetStats, totalBotsBeaten }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
