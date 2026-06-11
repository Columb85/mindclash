'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Medal, Award, TrendingUp, Users, Trophy } from 'lucide-react';
import { useLeaderboard, LeaderboardEntry } from '@/contexts/LeaderboardContext';
import { RankIcon } from '@/components/icons/RankIcon';

function RankMedal({ position }: { position: number }) {
  if (position === 1) return <Trophy className="w-6 h-6" style={{ color: '#fbbf24' }} />;
  if (position === 2) return <Medal className="w-6 h-6" style={{ color: '#e5e7eb' }} />;
  if (position === 3) return <Award className="w-6 h-6" style={{ color: '#f97316' }} />;
  return <span className="font-bold text-gray-500 text-sm">#{position}</span>;
}

function TopCard({ entry, position }: { entry: LeaderboardEntry; position: number }) {
  const glow = ['#fbbf24', '#e5e7eb', '#f97316'][position - 1];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position * 0.05 }}
      className={`relative p-5 rounded-2xl border-2 overflow-hidden ${entry.isYou ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        borderColor: glow,
        background: `linear-gradient(135deg, ${glow}15, transparent)`,
      }}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-30" style={{ background: glow }} />
      <div className="relative flex flex-col items-center">
        <RankMedal position={position} />
        <div
          className="mt-2 w-16 h-16 rounded-xl flex items-center justify-center text-3xl mb-2"
          style={{
            background: `linear-gradient(135deg, ${entry.rankColor}40, ${entry.rankColor}80)`,
            border: `2px solid ${entry.rankColor}`,
          }}
        >
          <RankIcon rankId={entry.rankId} size={32} />
        </div>
        <div className="text-sm font-bold text-white truncate max-w-full">{entry.name}</div>
        <div className="text-xs" style={{ color: entry.rankColor }}>{entry.rankName} · LVL {entry.level}</div>
        <div className="mt-3 text-2xl font-black text-white">{entry.netProfit.toLocaleString()}</div>
        <div className="text-[10px] text-gray-400 uppercase">Net profit</div>
        <div className="mt-2 flex gap-3 text-[10px] text-gray-400">
          <span>{entry.wins}W</span>
          <span>{entry.winRate.toFixed(0)}% WR</span>
        </div>
      </div>
    </motion.div>
  );
}

function Row({ entry, position }: { entry: LeaderboardEntry; position: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`grid grid-cols-[40px_1fr_80px_80px_110px_110px] items-center gap-3 px-4 py-3 rounded-lg hover:bg-dark-surface/50 transition-colors ${
        entry.isYou ? 'bg-blue-500/10 border border-blue-500/40' : ''
      }`}
    >
      <div className="text-center font-mono text-sm text-gray-500">#{position}</div>
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center" style={{ background: entry.rankColor + '20', color: entry.rankColor }}>
          <RankIcon rankId={entry.rankId} size={16} />
        </span>
        <div className="min-w-0">
          <div className="font-bold text-white truncate text-sm flex items-center gap-2">
            {entry.name}
            {entry.isYou && <span className="px-1.5 py-0.5 text-[9px] bg-blue-500 text-white rounded">YOU</span>}
          </div>
          <div className="text-[10px]" style={{ color: entry.rankColor }}>
            {entry.rankName} · LVL {entry.level}
          </div>
        </div>
      </div>
      <div className="text-sm text-white text-right font-semibold">{entry.wins}</div>
      <div className="text-sm text-white text-right">{entry.winRate.toFixed(1)}%</div>
      <div className="text-sm text-right font-semibold text-gray-300">{entry.volume.toLocaleString()}</div>
      <div className={`text-right font-bold ${entry.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {entry.netProfit >= 0 ? '+' : ''}{entry.netProfit.toLocaleString()}
      </div>
    </motion.div>
  );
}

export function Leaderboard() {
  const { daily, weekly, allTime, yourRank } = useLeaderboard();
  const [tab, setTab] = useState<'daily' | 'weekly' | 'allTime'>('weekly');

  const data = tab === 'daily' ? daily : tab === 'weekly' ? weekly : allTime;
  const myRank = tab === 'daily' ? yourRank.daily : tab === 'weekly' ? yourRank.weekly : yourRank.allTime;

  const top3 = data.slice(0, 3);
  const rest = data.slice(3, 50);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="glass p-6 rounded-2xl border border-dark-border flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-sm text-gray-400">Top predictors across the protocol</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
            <div className="text-[10px] text-blue-400 uppercase">Your rank</div>
            <div className="text-xl font-bold text-white">{myRank > 0 ? `#${myRank}` : '—'}</div>
          </div>
          <div className="flex gap-1 bg-dark-surface p-1 rounded-lg">
            {(['daily', 'weekly', 'allTime'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition ${
                  tab === t ? 'bg-blue-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                {t === 'allTime' ? 'All Time' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 3 podium */}
      <div className="grid md:grid-cols-3 gap-4">
        {[top3[1], top3[0], top3[2]].map((entry, i) => {
          if (!entry) return null;
          const originalPos = [2, 1, 3][i];
          return (
            <div key={entry.id} className={i === 1 ? 'md:-translate-y-3' : ''}>
              <TopCard entry={entry} position={originalPos} />
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl border border-dark-border overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_80px_80px_110px_110px] gap-3 px-4 py-3 border-b border-dark-border text-[10px] uppercase text-gray-500 font-semibold bg-dark-surface/50">
          <div className="text-center">#</div>
          <div>Player</div>
          <div className="text-right">Wins</div>
          <div className="text-right">Win %</div>
          <div className="text-right">Volume</div>
          <div className="text-right">Net Profit</div>
        </div>
        <div className="divide-y divide-dark-border/50">
          {rest.map((entry, i) => (
            <Row key={entry.id + i} entry={entry} position={i + 4} />
          ))}
        </div>
      </div>

      <div className="text-center text-xs text-gray-500">
        <Users className="w-3 h-3 inline mr-1" />
        Updated live · Based on net profit in selected period
      </div>
    </div>
  );
}
