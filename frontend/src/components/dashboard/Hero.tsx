'use client';

import { motion } from 'framer-motion';
import { SparkleIcon, BoltIcon, ArrowRightIcon } from '@/components/icons/MantleIcons';
import { usePlayer, getRank } from '@/contexts/PlayerContext';
import { useRooms } from '@/contexts/RoomsContext';
import { RankIcon } from '@/components/icons/RankIcon';

interface HeroProps {
  onScrollToRounds: () => void;
}

export function Hero({ onScrollToRounds }: HeroProps) {
  const { stats } = usePlayer();
  const { rooms } = useRooms();
  const rank = getRank(stats.level);
  const openRounds = rooms.filter(r => r.status === 'open').length;

  return (
    <div className="relative rounded-3xl overflow-hidden border border-dark-border bg-gradient-to-br from-blue-950/50 via-purple-950/30 to-dark-surface/80">
      {/* Animated gradient orbs */}
      <motion.div
        animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-40"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent 70%)' }}
      />
      <motion.div
        animate={{ x: [0, -40, 0], y: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-40"
        style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }}
      />
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/2 left-1/2 w-72 h-72 rounded-full blur-3xl opacity-30"
        style={{ background: 'radial-gradient(circle, #22c55e, transparent 70%)' }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative p-8 md:p-12 grid lg:grid-cols-[1.2fr_1fr] gap-8 items-center">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-xs font-semibold text-blue-400 mb-4"
          >
            <SparkleIcon className="w-3.5 h-3.5" size={14} />
            Live on Mantle Network · AI Trading Agent
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight mb-4"
          >
            Predict the market.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
              Earn your edge.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-300 text-lg max-w-xl mb-6"
          >
            Fast-paced prediction rounds on BTC, ETH, SOL. Stake before the round starts,
            win from the losing pool. Auto-scheduled, on-chain transparent, skill-based.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-3"
          >
            <button
              onClick={onScrollToRounds}
              className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition"
            >
              <BoltIcon className="w-5 h-5" size={20} />
              Start Trading
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" size={16} />
            </button>
            {openRounds > 0 && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-semibold">
                <span className="relative flex w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                {openRounds} rounds accepting predictions now
              </div>
            )}
          </motion.div>
        </div>

        {/* Right side: user summary card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative glass rounded-2xl border border-dark-border p-6 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white"
              style={{
                background: `linear-gradient(135deg, ${rank.color}40, ${rank.color}80)`,
                border: `2px solid ${rank.color}`,
                boxShadow: `0 0 20px ${rank.color}40`,
              }}
            >
              <RankIcon rankId={rank.id} size={28} />
            </div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Your Rank</div>
              <div className="font-bold text-white flex items-center gap-2">
                <span style={{ color: rank.color }}>{rank.name}</span>
                <span className="text-gray-400 text-sm">· LVL {stats.level}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Predictions" value={stats.totalPredictions.toString()} />
            <MiniStat label="Wins" value={stats.wins.toString()} highlight="green" />
            <MiniStat
              label="Net"
              value={`${(stats.totalWon - stats.totalStaked) >= 0 ? '+' : ''}${(stats.totalWon - stats.totalStaked).toFixed(0)}`}
              highlight={stats.totalWon - stats.totalStaked >= 0 ? 'green' : 'red'}
            />
          </div>

          {stats.currentStreak >= 2 && (
            <div className="mt-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <div>
                <div className="text-xs text-orange-400 font-semibold">Win streak active</div>
                <div className="text-white font-bold">{stats.currentStreak} in a row</div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  const color = highlight === 'green' ? 'text-green-400' : highlight === 'red' ? 'text-red-400' : 'text-white';
  return (
    <div className="p-2 bg-dark-bg/60 rounded-lg text-center">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500 uppercase">{label}</div>
    </div>
  );
}
