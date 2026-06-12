'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Zap, Lock, Unlock, ExternalLink,
  BarChart3, Users, DollarSign, Shield, Brain, Activity,
  ChevronRight, Info, CheckCircle2,
} from 'lucide-react';
import { useClash } from '@/contexts/ClashContext';

// ── Agent data (mirrors on-chain state) ──────────────────────────────────────
interface AgentData {
  tokenId: number;
  name: string;
  strategy: string;
  emoji: string;
  gradient: string;
  winRate: number;
  totalDecisions: number;
  totalPnL: number;
  apy: number;        // estimated APY based on recent performance
  tvl: number;        // total $CLASH staked on this agent
  stakers: number;    // number of stakers
  wallet: string;
  recentSignal?: { direction: 'UP' | 'DOWN'; asset: string; confidence: number; timestamp: number };
}

const AGENTS: AgentData[] = [
  {
    tokenId: 5,
    name: 'AlphaPredict',
    strategy: 'Momentum',
    emoji: '🤖',
    gradient: 'from-blue-500 via-cyan-500 to-teal-500',
    winRate: 64.2,
    totalDecisions: 847,
    totalPnL: 12450,
    apy: 18.4,
    tvl: 125000,
    stakers: 43,
    wallet: '0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74',
    recentSignal: { direction: 'UP', asset: 'BTC', confidence: 78, timestamp: Date.now() - 180_000 },
  },
  {
    tokenId: 6,
    name: 'MomentumMaster',
    strategy: 'Mean Reversion',
    emoji: '⚡',
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    winRate: 58.9,
    totalDecisions: 623,
    totalPnL: 5820,
    apy: 12.7,
    tvl: 87000,
    stakers: 29,
    wallet: '0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59',
    recentSignal: { direction: 'DOWN', asset: 'ETH', confidence: 65, timestamp: Date.now() - 420_000 },
  },
  {
    tokenId: 7,
    name: 'NeuralTrader',
    strategy: 'Neural Network',
    emoji: '🧠',
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    winRate: 71.3,
    totalDecisions: 512,
    totalPnL: 18200,
    apy: 24.1,
    tvl: 203000,
    stakers: 67,
    wallet: '0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39',
    recentSignal: { direction: 'UP', asset: 'SOL', confidence: 82, timestamp: Date.now() - 90_000 },
  },
];

const EXPLORER = 'https://sepolia.mantlescan.xyz';
const NFT_ADDRESS = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';

// ── Staking Modal ────────────────────────────────────────────────────────────
function StakeModal({
  agent,
  onClose,
  onStake,
  clashBalance,
}: {
  agent: AgentData;
  onClose: () => void;
  onStake: (amount: number) => void;
  clashBalance: number;
}) {
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'stake' | 'unstake'>('stake');
  const numAmount = parseFloat(amount) || 0;
  const maxStake = mode === 'stake' ? clashBalance : 1000; // mock user's staked amount

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-dark-border bg-[#0d0d14] p-6 space-y-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center text-2xl`}>
            {agent.emoji}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{agent.name}</h3>
            <p className="text-xs text-gray-500">{agent.strategy} · Token #{agent.tokenId}</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-xl bg-dark-surface/60 p-1 border border-dark-border/50">
          <button
            onClick={() => setMode('stake')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
              mode === 'stake' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-gray-500'
            }`}
          >
            <Lock className="w-3.5 h-3.5 inline mr-1.5" /> Stake
          </button>
          <button
            onClick={() => setMode('unstake')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
              mode === 'unstake' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-500'
            }`}
          >
            <Unlock className="w-3.5 h-3.5 inline mr-1.5" /> Unstake
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-dark-surface/40 rounded-xl p-3 text-center border border-dark-border/30">
            <div className="text-[10px] text-gray-500 uppercase">Win Rate</div>
            <div className="text-sm font-bold text-green-400">{agent.winRate}%</div>
          </div>
          <div className="bg-dark-surface/40 rounded-xl p-3 text-center border border-dark-border/30">
            <div className="text-[10px] text-gray-500 uppercase">Est. APY</div>
            <div className="text-sm font-bold text-cyan-400">{agent.apy}%</div>
          </div>
          <div className="bg-dark-surface/40 rounded-xl p-3 text-center border border-dark-border/30">
            <div className="text-[10px] text-gray-500 uppercase">TVL</div>
            <div className="text-sm font-bold text-white">{(agent.tvl / 1000).toFixed(0)}k</div>
          </div>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Amount ($CLASH)</span>
            <button
              onClick={() => setAmount(String(maxStake))}
              className="text-cyan-500 hover:text-cyan-300 font-semibold"
            >
              Max: {maxStake.toLocaleString()}
            </button>
          </div>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-4 py-3 rounded-xl bg-dark-surface/60 border border-dark-border text-white text-lg font-mono focus:outline-none focus:border-cyan-500/50 transition"
          />
          {numAmount > 0 && mode === 'stake' && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Info className="w-3 h-3" />
              Estimated daily return: <span className="text-green-400 font-bold">{(numAmount * agent.apy / 365 / 100).toFixed(2)} $CLASH</span>
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          onClick={() => { onStake(numAmount); onClose(); }}
          disabled={numAmount <= 0 || (mode === 'stake' && numAmount > clashBalance)}
          className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
            mode === 'stake'
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20'
              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-500/20'
          }`}
        >
          {mode === 'stake' ? `Stake ${numAmount > 0 ? numAmount.toLocaleString() : ''} $CLASH on ${agent.name}` : `Unstake from ${agent.name}`}
        </button>

        {/* Disclaimer */}
        <p className="text-[10px] text-gray-600 text-center leading-relaxed">
          Staking is non-custodial. Your $CLASH is delegated to the agent&apos;s strategy.
          Returns depend on agent performance. Past results don&apos;t guarantee future performance.
        </p>
      </motion.div>
    </motion.div>
  );
}

// ── Time ago helper ──────────────────────────────────────────────────────────
function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

// ── Main Export ──────────────────────────────────────────────────────────────
export function AgentStaking() {
  const { clashBalance } = useClash();
  const [stakingAgent, setStakingAgent] = useState<AgentData | null>(null);
  const [userStakes, setUserStakes] = useState<Record<number, number>>({});

  const totalStaked = useMemo(() => Object.values(userStakes).reduce((s, v) => s + v, 0), [userStakes]);

  const handleStake = (amount: number) => {
    if (!stakingAgent) return;
    setUserStakes(prev => ({
      ...prev,
      [stakingAgent.tokenId]: (prev[stakingAgent.tokenId] || 0) + amount,
    }));
  };

  return (
    <div className="space-y-6">

      {/* ── Section header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            Stake on AI Agents
          </h2>
          <p className="text-xs text-gray-500 mt-1 max-w-lg">
            Delegate $CLASH to top-performing agents. They trade autonomously — you earn when they win.
            All performance data is verified on-chain via ERC-8004.
          </p>
        </div>
        {totalStaked > 0 && (
          <div className="text-right">
            <div className="text-[10px] text-gray-500 uppercase">Your Total Staked</div>
            <div className="text-lg font-bold text-white">{totalStaked.toLocaleString()} <span className="text-xs text-gray-500">$CLASH</span></div>
          </div>
        )}
      </div>

      {/* ── Protocol stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <Shield className="w-4 h-4" />, label: 'Total Value Locked', value: '$415,000 CLASH', color: 'text-green-400' },
          { icon: <Users className="w-4 h-4" />, label: 'Active Stakers', value: '139', color: 'text-blue-400' },
          { icon: <BarChart3 className="w-4 h-4" />, label: 'Avg Agent Win Rate', value: '64.8%', color: 'text-cyan-400' },
          { icon: <Zap className="w-4 h-4" />, label: 'Rewards Distributed', value: '47,200 CLASH', color: 'text-purple-400' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="bg-dark-surface/30 rounded-xl p-3.5 border border-dark-border/40">
            <div className={`flex items-center gap-1.5 ${color} mb-1.5`}>
              {icon}
              <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-sm font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Agent cards ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {AGENTS.map((agent, idx) => {
          const userStake = userStakes[agent.tokenId] || 0;
          return (
            <motion.div
              key={agent.tokenId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative rounded-2xl overflow-hidden border border-dark-border/50 bg-gradient-to-br from-[#12121a] to-[#0a0a0f] hover:border-dark-border transition-all group"
            >
              {/* Top bar gradient */}
              <div className={`h-1 bg-gradient-to-r ${agent.gradient}`} />

              <div className="p-5 space-y-4">
                {/* Agent identity */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${agent.gradient} flex items-center justify-center text-xl shadow-lg`}>
                      {agent.emoji}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{agent.name}</div>
                      <div className="text-[10px] text-gray-500 font-mono">{agent.strategy} · #{agent.tokenId}</div>
                    </div>
                  </div>
                  <a
                    href={`${EXPLORER}/token/${NFT_ADDRESS}?a=${agent.tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] text-teal-600 hover:text-teal-400 flex items-center gap-0.5 transition"
                  >
                    <ExternalLink className="w-2.5 h-2.5" /> Verify
                  </a>
                </div>

                {/* Performance metrics */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="text-[10px] text-gray-500">Win Rate</div>
                    <div className={`text-sm font-bold ${agent.winRate >= 65 ? 'text-green-400' : agent.winRate >= 55 ? 'text-yellow-400' : 'text-orange-400'}`}>
                      {agent.winRate}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-gray-500">Est. APY</div>
                    <div className="text-sm font-bold text-cyan-400">{agent.apy}%</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-gray-500">Decisions</div>
                    <div className="text-sm font-bold text-white">{agent.totalDecisions}</div>
                  </div>
                </div>

                {/* TVL bar */}
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-500">TVL: {(agent.tvl / 1000).toFixed(0)}k $CLASH</span>
                    <span className="text-gray-500">{agent.stakers} stakers</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-dark-surface/80 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${agent.gradient}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((agent.tvl / 250000) * 100, 100)}%` }}
                      transition={{ duration: 1, delay: idx * 0.15 }}
                    />
                  </div>
                </div>

                {/* Recent signal */}
                {agent.recentSignal && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-dark-surface/40 border border-dark-border/30">
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        agent.recentSignal.direction === 'UP' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {agent.recentSignal.direction === 'UP' ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {agent.recentSignal.direction}
                      </div>
                      <span className="text-[10px] text-gray-400">{agent.recentSignal.asset}</span>
                      <span className="text-[10px] text-blue-400">{agent.recentSignal.confidence}%</span>
                    </div>
                    <span className="text-[9px] text-gray-600">{timeAgo(agent.recentSignal.timestamp)}</span>
                  </div>
                )}

                {/* User stake display */}
                {userStake > 0 && (
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-500/5 border border-green-500/20">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-xs text-green-400 font-semibold">Your stake</span>
                    </div>
                    <span className="text-xs font-bold text-white">{userStake.toLocaleString()} $CLASH</span>
                  </div>
                )}

                {/* Stake CTA */}
                <button
                  onClick={() => setStakingAgent(agent)}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    userStake > 0
                      ? 'bg-dark-surface/60 border border-dark-border text-white hover:bg-dark-surface'
                      : `bg-gradient-to-r ${agent.gradient} text-white shadow-lg hover:scale-[1.02] active:scale-[0.98]`
                  }`}
                >
                  {userStake > 0 ? (
                    <>Manage Stake <ChevronRight className="w-4 h-4" /></>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Stake $CLASH
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── How it works ── */}
      <div className="rounded-2xl border border-dark-border/40 bg-dark-surface/20 p-5">
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          How Agent Staking Works
        </h3>
        <div className="grid sm:grid-cols-4 gap-4">
          {[
            { step: '1', title: 'Choose Agent', desc: 'Browse verified AI agents with on-chain track records', icon: <Activity className="w-5 h-5" /> },
            { step: '2', title: 'Stake $CLASH', desc: 'Delegate tokens to your chosen agent\'s strategy pool', icon: <Lock className="w-5 h-5" /> },
            { step: '3', title: 'Agent Trades', desc: 'AI analyzes markets & makes predictions every 5 min', icon: <Brain className="w-5 h-5" /> },
            { step: '4', title: 'Earn Returns', desc: 'Profitable rounds → rewards distributed to stakers', icon: <DollarSign className="w-5 h-5" /> },
          ].map(({ step, title, desc, icon }) => (
            <div key={step} className="flex flex-col items-center text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                {icon}
              </div>
              <div className="text-xs font-bold text-white">{title}</div>
              <div className="text-[10px] text-gray-500 leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Staking modal ── */}
      <AnimatePresence>
        {stakingAgent && (
          <StakeModal
            agent={stakingAgent}
            onClose={() => setStakingAgent(null)}
            onStake={handleStake}
            clashBalance={clashBalance}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
