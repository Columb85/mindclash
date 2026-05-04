'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Trophy, Target, Flame, TrendingUp, Zap, Award, Percent, Coins, BarChart3 } from 'lucide-react';
import { usePlayer, getRank, xpProgressInLevel, RANKS } from '@/contexts/PlayerContext';
import { RankIcon } from '@/components/icons/RankIcon';

interface UserProfileProps {
  userAddress?: string;
}

export function UserProfile({ userAddress }: UserProfileProps) {
  const { stats, resetStats } = usePlayer();
  const rank = useMemo(() => getRank(stats.level), [stats.level]);
  const { current, needed, pct } = xpProgressInLevel(stats.xp);
  const totalResolved = stats.wins + stats.losses + stats.ties;
  const winRate = totalResolved > 0 ? (stats.wins / totalResolved) * 100 : 0;
  const nextRank = RANKS.find(r => r.minLevel > stats.level);

  const achievements = Object.values(stats.achievements);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Profile Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-8 rounded-2xl border border-dark-border relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(ellipse at top, ${rank.color}60, transparent 60%)`,
          }}
        />
        <div className="relative flex items-center gap-6 flex-wrap">
          <motion.div
            animate={{
              boxShadow: [
                `0 0 20px ${rank.color}40`,
                `0 0 40px ${rank.color}80`,
                `0 0 20px ${rank.color}40`,
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-24 h-24 rounded-2xl flex items-center justify-center text-white"
            style={{
              background: `linear-gradient(135deg, ${rank.color}40, ${rank.color}80)`,
              border: `2px solid ${rank.color}`,
            }}
          >
            <RankIcon rankId={rank.id} size={48} />
          </motion.div>

          <div className="flex-1 min-w-[250px]">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-white">
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'Demo Predictor'}
              </h1>
              <span
                className="px-3 py-1 rounded-full text-sm font-bold border"
                style={{
                  color: rank.color,
                  borderColor: rank.color + '60',
                  background: rank.color + '20',
                }}
              >
                {rank.name}
              </span>
            </div>
            <div className="mt-2 text-gray-300">Level {stats.level}</div>

            <div className="mt-3 max-w-md">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-400">{current} / {needed} PTS</span>
                {nextRank && (
                  <span className="text-gray-400">
                    Next: <span style={{ color: nextRank.color }}>{nextRank.name}</span> at lvl {nextRank.minLevel}
                  </span>
                )}
              </div>
              <div className="relative h-3 bg-dark-bg rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${rank.color}, #a78bfa)` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>
            </div>
          </div>

          {stats.currentStreak >= 2 && (
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              className="flex flex-col items-center px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/40"
            >
              <Flame className="w-8 h-8 text-orange-400" />
              <div className="text-xl font-bold text-white">{stats.currentStreak}</div>
              <div className="text-[10px] text-orange-400 uppercase">Win streak</div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Target} label="Predictions" value={stats.totalPredictions.toLocaleString()} color="#3b82f6" />
        <StatCard icon={Trophy} label="Wins" value={stats.wins.toLocaleString()} color="#22c55e" />
        <StatCard icon={Percent} label="Win Rate" value={`${winRate.toFixed(1)}%`} color="#a78bfa" />
        <StatCard icon={Coins} label="Total Won" value={stats.totalWon.toFixed(0)} color="#f59e0b" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Detailed stats */}
        <div className="glass p-6 rounded-xl border border-dark-border">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Performance
          </h3>
          <div className="space-y-3 text-sm">
            <StatRow label="Wins" value={stats.wins} color="text-green-400" />
            <StatRow label="Losses" value={stats.losses} color="text-red-400" />
            <StatRow label="Ties" value={stats.ties} color="text-gray-400" />
            <StatRow label="Best streak" value={stats.bestStreak} color="text-orange-400" />
            <StatRow label="Total staked" value={stats.totalStaked.toFixed(2)} color="text-white" />
            <StatRow label="Net profit" value={(stats.totalWon - stats.totalStaked).toFixed(2)} color={stats.totalWon - stats.totalStaked >= 0 ? 'text-green-400' : 'text-red-400'} />
            <StatRow label="Total PTS" value={stats.xp.toLocaleString()} color="text-blue-400" />
          </div>
          <button
            onClick={resetStats}
            className="mt-4 text-xs text-gray-500 hover:text-gray-300 underline"
          >
            Reset progress
          </button>
        </div>

        {/* Achievements */}
        <div className="glass p-6 rounded-xl border border-dark-border">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 justify-between">
            <span className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Achievements
            </span>
            <span className="text-sm text-gray-400 font-normal">{unlockedCount} / {achievements.length}</span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {achievements.map(a => (
              <motion.div
                key={a.id}
                whileHover={{ scale: 1.03 }}
                className={`p-3 rounded-lg border text-sm transition ${
                  a.unlocked
                    ? 'bg-yellow-500/10 border-yellow-500/40'
                    : 'bg-dark-bg border-dark-border opacity-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-2xl">{a.unlocked ? a.icon : '🔒'}</span>
                  <div className="min-w-0">
                    <div className={`font-bold text-xs ${a.unlocked ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {a.title}
                    </div>
                    <div className="text-[10px] text-gray-500 leading-tight">{a.description}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Ranks overview */}
      <div className="glass p-6 rounded-xl border border-dark-border">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          Ranks
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {RANKS.map(r => {
            const achieved = stats.level >= r.minLevel;
            const isCurrent = r.id === rank.id;
            return (
              <div
                key={r.id}
                className={`p-3 rounded-lg text-center border-2 transition ${
                  isCurrent ? 'ring-2 ring-offset-2 ring-offset-dark-bg' : ''
                }`}
                style={{
                  borderColor: achieved ? r.color : '#1f2937',
                  background: achieved ? r.color + '15' : 'transparent',
                  opacity: achieved ? 1 : 0.4,
                  ...(isCurrent ? { '--tw-ring-color': r.color } as any : {}),
                }}
              >
                <div className="mb-1 flex justify-center" style={{ color: achieved ? r.color : '#6b7280' }}><RankIcon rankId={r.id} size={28} /></div>
                <div className="text-xs font-bold" style={{ color: achieved ? r.color : '#6b7280' }}>
                  {r.name}
                </div>
                <div className="text-[10px] text-gray-500">Lvl {r.minLevel}+</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      className="glass p-5 rounded-xl border border-dark-border"
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-5 h-5" style={{ color }} />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </motion.div>
  );
}

function StatRow({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex items-center justify-between p-3 bg-dark-bg/60 rounded-lg">
      <span className="text-gray-400">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}
