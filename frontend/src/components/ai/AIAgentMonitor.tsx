'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Play, Pause, TrendingUp, TrendingDown, Activity,
  Brain, Zap, Clock, DollarSign, Target, BarChart3, Cpu, Wifi
} from 'lucide-react';
import { useAIAgent } from '@/contexts/AIAgentContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimeAgo(timestamp: number): string {
  const s = Math.floor((Date.now() - timestamp) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatPrice(price: number, symbol: string): string {
  if (symbol === 'MNT') return `$${price.toFixed(4)}`;
  if (symbol === 'SOL') return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#14f195', MNT: '#00D4AA',
};
const ASSET_ICONS: Record<string, string> = {
  BTC: '₿', ETH: 'Ξ', SOL: '◎', MNT: 'M',
};
const STRATEGY_LABELS: Record<string, string> = {
  'momentum':       'Momentum',
  'mean-reversion': 'Mean Rev.',
  'neural':         'Neural Net',
};
const STRATEGY_COLORS: Record<string, string> = {
  'momentum':       'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'mean-reversion': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  'neural':         'text-green-400 bg-green-500/10 border-green-500/30',
};

// AI Agent Avatars and Gradients
const AGENT_AVATARS: Record<string, { emoji: string; gradient: string; glowColor: string }> = {
  'AlphaPredict': {
    emoji: '🤖',
    gradient: 'from-blue-500 via-cyan-500 to-teal-500',
    glowColor: 'rgba(59, 130, 246, 0.5)'
  },
  'MomentumMaster': {
    emoji: '⚡',
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    glowColor: 'rgba(168, 85, 247, 0.5)'
  },
  'NeuralTrader': {
    emoji: '🧠',
    gradient: 'from-green-500 via-emerald-500 to-teal-500',
    glowColor: 'rgba(34, 197, 94, 0.5)'
  },
};

// Status Badges
function getAgentBadge(winRate: number, totalDecisions: number) {
  if (winRate >= 70) return { text: 'LEGENDARY', emoji: '👑', color: 'from-yellow-400 to-amber-500' };
  if (winRate >= 60) return { text: 'On Fire', emoji: '🔥', color: 'from-orange-400 to-red-500' };
  if (winRate >= 55) return { text: 'Hot Streak', emoji: '🎯', color: 'from-green-400 to-emerald-500' };
  if (totalDecisions >= 100) return { text: 'Veteran', emoji: '⭐', color: 'from-blue-400 to-cyan-500' };
  return null;
}

// ── Session Timer ─────────────────────────────────────────────────────────────

function SessionTimer({ startTime, endTime }: { startTime: number; endTime: number }) {
  const [timeLeft, setTimeLeft] = useState(endTime - Date.now());
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(endTime - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endTime]);
  if (timeLeft <= 0) return <span className="text-red-400">Ended</span>;
  const h = Math.floor(timeLeft / 3_600_000);
  const m = Math.floor((timeLeft % 3_600_000) / 60_000);
  const s = Math.floor((timeLeft % 60_000) / 1000);
  return (
    <span className={h < 1 ? 'text-yellow-400' : 'text-white'}>
      {h > 0 && `${h}h `}{m}m {s}s
    </span>
  );
}

// ── Live Price Row ────────────────────────────────────────────────────────────

function LivePriceRow({ symbol, price, change }: { symbol: string; price: number; change: number }) {
  const color = ASSET_COLORS[symbol] ?? '#fff';
  const isUp  = change >= 0;
  return (
    <div className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-dark-surface/40 transition-colors group">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {ASSET_ICONS[symbol]}
        </div>
        <div>
          <span className="text-sm font-bold text-white">{symbol}</span>
          <div className={`text-[10px] font-semibold flex items-center gap-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
            {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {isUp ? '+' : ''}{change.toFixed(2)}%
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-mono font-bold text-white">{formatPrice(price, symbol)}</div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AIAgentMonitor() {
  const {
    agents, activeAgent, currentSession, agentDecisions,
    livePrices, startAgent, stopAgent,
  } = useAIAgent();

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(agents[0]?.id ?? null);
  const selectedAgent = agents.find(a => a.id === selectedAgentId) ?? null;

  // Keep selected agent in sync when agents update
  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) setSelectedAgentId(agents[0].id);
  }, [agents, selectedAgentId]);

  if (!currentSession) {
    return (
      <div className="glass p-6 rounded-2xl border border-dark-border text-center">
        <Brain className="w-12 h-12 mx-auto mb-3 text-gray-500" />
        <h3 className="text-xl font-bold text-white mb-2">No Active Session</h3>
        <p className="text-gray-400">AI competition session not started</p>
      </div>
    );
  }

  const totalDecisions = agents.reduce((s, a) => s + a.totalDecisions, 0);
  const avgWinRate     = agents.length > 0
    ? agents.reduce((s, a) => s + a.winRate, 0) / agents.length
    : 0;
  const totalPnL       = agents.reduce((s, a) => s + a.totalPnL, 0);

  return (
    <div className="space-y-6">

      {/* ── Session Header ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl">
        {/* Animated gradient border */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl" />
        <div className="absolute inset-[1px] bg-gradient-to-br from-[#14141f] to-[#0a0a0f] rounded-2xl" />
        
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Brain className="w-7 h-7 text-white" />
                </div>
                {/* Pulsing ring */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 animate-ping opacity-20" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  AI Agent Monitor
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <p className="text-xs text-gray-400">Turing Test Competition · Mantle Sepolia</p>
                </div>
              </div>
            </div>
            <div className="text-right bg-dark-surface/50 rounded-xl px-4 py-2.5 border border-dark-border/50">
              <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">Session ends in</div>
              <div className="text-lg font-bold font-mono">
                <SessionTimer startTime={currentSession.startTime} endTime={currentSession.endTime} />
              </div>
            </div>
          </div>

          {/* Stats row - enhanced */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: <Bot className="w-4 h-4" />,       color: 'blue',   label: 'Active Agents',   value: `${agents.filter(a => a.isActive).length}/${agents.length}` },
              { icon: <Target className="w-4 h-4" />,    color: 'green',  label: 'Total Decisions', value: totalDecisions.toLocaleString() },
              { icon: <BarChart3 className="w-4 h-4" />, color: 'yellow', label: 'Avg Win Rate',    value: `${avgWinRate.toFixed(1)}%` },
              { icon: <Zap className="w-4 h-4" />,       color: 'purple', label: 'Total PnL',       value: `${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(0)} CLASH` },
            ].map(({ icon, color, label, value }) => (
              <div
                key={label}
                className="group relative bg-dark-surface/40 hover:bg-dark-surface/60 rounded-xl p-4 border border-dark-border/50 hover:border-dark-border transition-all cursor-default"
              >
                {/* Subtle glow on hover */}
                <div className={`absolute inset-0 rounded-xl bg-${color}-500/5 opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className={`flex items-center gap-2 text-${color}-400 mb-2`}>
                  {icon}
                  <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
                </div>
                <div className="text-2xl font-bold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Grid: Agents + Live Prices ───────────────────────────────── */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6">

        {/* Agents */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-8 h-[2px] bg-gradient-to-r from-blue-500 to-transparent" />
            AI Agents
          </h3>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {agents.map((agent, idx) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
                onClick={() => setSelectedAgentId(agent.id)}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`relative rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                  selectedAgentId === agent.id
                    ? 'ring-2 ring-blue-500 shadow-xl shadow-blue-500/20'
                    : 'hover:shadow-lg hover:shadow-black/20'
                }`}
              >
                {/* Card background with gradient border */}
                <div className={`absolute inset-0 rounded-2xl ${
                  selectedAgentId === agent.id
                    ? 'bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-cyan-500/30'
                    : 'bg-gradient-to-br from-[#1f1f2e] to-[#14141f]'
                }`} style={{ padding: '1px' }}>
                  <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-[#14141f] to-[#0d0d14]" />
                </div>
                
                {/* Active indicator glow */}
                {agent.isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500/0 via-green-500 to-green-500/0" />
                )}

                <div className="relative z-10 p-4">
                  {/* Header with Avatar */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Agent Avatar with Gradient */}
                      {(() => {
                        const avatarInfo = AGENT_AVATARS[agent.name] || { emoji: '🤖', gradient: 'from-gray-500 to-gray-600', glowColor: 'rgba(107, 114, 128, 0.5)' };
                        return (
                          <motion.div
                            className={`relative w-12 h-12 rounded-xl bg-gradient-to-br ${avatarInfo.gradient} flex items-center justify-center text-2xl shadow-lg transition-all`}
                            style={{
                              boxShadow: agent.isActive ? `0 0 20px ${avatarInfo.glowColor}` : 'none'
                            }}
                            whileHover={{ scale: 1.1, rotate: [0, -5, 5, 0] }}
                            transition={{ duration: 0.3 }}
                          >
                            {avatarInfo.emoji}
                            {agent.isActive && (
                              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#14141f] animate-pulse flex items-center justify-center">
                                <span className="w-2 h-2 rounded-full bg-white" />
                              </span>
                            )}
                          </motion.div>
                        );
                      })()}
                      <div>
                        <div className="font-bold text-white text-sm leading-tight">{agent.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono">v{agent.version}</div>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); agent.isActive ? stopAgent(agent.id) : startAgent(agent.id); }}
                      className={`p-2 rounded-lg transition-all ${
                        agent.isActive
                          ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 hover:shadow-lg hover:shadow-red-500/20'
                          : 'bg-green-500/15 text-green-400 hover:bg-green-500/25 hover:shadow-lg hover:shadow-green-500/20'
                      }`}
                    >
                      {agent.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Status Badge (On Fire, etc) */}
                  {(() => {
                    const badge = getAgentBadge(agent.winRate, agent.totalDecisions);
                    if (!badge) return null;
                    return (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${badge.color} text-white text-[10px] font-bold mb-3 shadow-lg`}
                      >
                        <span className="text-sm">{badge.emoji}</span>
                        {badge.text}
                      </motion.div>
                    );
                  })()}

                  {/* Strategy badge - enhanced */}
                  {'strategy' in agent && (
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold mb-4 ml-2 ${STRATEGY_COLORS[(agent as any).strategy] ?? ''}`}>
                      <Cpu className="w-3 h-3" />
                      {STRATEGY_LABELS[(agent as any).strategy] ?? 'Unknown'}
                    </div>
                  )}

                  {/* Stats - enhanced with visual indicators */}
                  <div className="space-y-3">
                    {/* Win Rate with progress bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Win Rate</span>
                        <span className={`text-sm font-bold ${agent.winRate >= 60 ? 'text-green-400' : agent.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {agent.winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-dark-surface/80 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            agent.winRate >= 60 ? 'bg-gradient-to-r from-green-600 to-green-400' :
                            agent.winRate >= 50 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                            'bg-gradient-to-r from-red-600 to-red-400'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(agent.winRate, 100)}%` }}
                          transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                    
                    {/* Decisions and PnL */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-dark-surface/40 rounded-lg px-2.5 py-2 text-center">
                        <div className="text-[10px] text-gray-500 mb-0.5">Decisions</div>
                        <div className="text-sm font-bold text-white">{agent.totalDecisions}</div>
                      </div>
                      <div className="bg-dark-surface/40 rounded-lg px-2.5 py-2 text-center">
                        <div className="text-[10px] text-gray-500 mb-0.5">PnL</div>
                        <div className={`text-sm font-bold ${agent.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {agent.totalPnL >= 0 ? '+' : ''}{agent.totalPnL.toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Last decision */}
                {agent.lastDecision && agent.lastDecision.direction !== 'HOLD' && (
                  <div className="mt-3 pt-3 border-t border-dark-border/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] text-gray-500">Last signal</span>
                      <span className="text-[10px] text-gray-600">{formatTimeAgo(agent.lastDecision.timestamp)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        agent.lastDecision.direction === 'UP'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {agent.lastDecision.direction === 'UP'
                          ? <TrendingUp className="w-2.5 h-2.5" />
                          : <TrendingDown className="w-2.5 h-2.5" />}
                        {agent.lastDecision.direction}
                      </div>
                      {'asset' in agent.lastDecision && (
                        <div className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-dark-surface text-gray-300">
                          {(agent.lastDecision as any).asset}
                        </div>
                      )}
                      <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400">
                        <Zap className="w-2.5 h-2.5" />
                        {agent.lastDecision.confidence}%
                      </div>
                    </div>
                    {agent.lastDecision.reasoning && (
                      <p className="text-[10px] text-gray-600 mt-1.5 leading-relaxed line-clamp-2">
                        {agent.lastDecision.reasoning}
                      </p>
                    )}
                  </div>
                )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right panel: Live prices + recent decisions */}
        <div className="space-y-5">

          {/* Live Prices - enhanced */}
          <div className="relative rounded-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#1f1f2e] to-[#14141f]" style={{ padding: '1px' }}>
              <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-[#14141f] to-[#0d0d14]" />
            </div>
            <div className="relative z-10 p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-green-500/15 flex items-center justify-center">
                  <Wifi className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-sm font-bold text-white">Live Prices</span>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-dark-surface/80 text-gray-500 border border-dark-border/50">via Bybit</span>
              </div>
              {Object.entries(livePrices).length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-6 flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-600 border-t-gray-400 animate-spin" />
                  Connecting to Bybit…
                </div>
              ) : (
                <div className="space-y-1">
                  {(['BTC', 'ETH', 'SOL'] as const).map(sym => {
                    const tick = livePrices[sym];
                    if (!tick) return null;
                    return (
                      <LivePriceRow
                        key={sym}
                        symbol={sym}
                        price={tick.price}
                        change={tick.change24h}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Selected Agent Detail ──────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            key={selectedAgent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="relative rounded-2xl overflow-hidden"
          >
            {/* Gradient border */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 via-purple-500/20 to-cyan-500/30" style={{ padding: '1px' }}>
              <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-[#14141f] to-[#0a0a0f]" />
            </div>
            
            <div className="relative z-10 p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white text-lg">{selectedAgent.name}</h3>
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    {'strategy' in selectedAgent && (
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${STRATEGY_COLORS[(selectedAgent as any).strategy] ?? ''}`}>
                        {STRATEGY_LABELS[(selectedAgent as any).strategy]}
                      </span>
                    )}
                    <span className="text-gray-600">·</span>
                    <span className="font-mono">v{selectedAgent.version}</span>
                  </div>
                </div>
                <div className="text-right bg-dark-surface/50 rounded-xl px-4 py-2 border border-dark-border/50">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">On-chain address</div>
                  <div className="text-xs font-mono text-gray-300">
                    {selectedAgent.address.slice(0, 10)}…{selectedAgent.address.slice(-6)}
                  </div>
                </div>
              </div>

              {/* Stats grid - enhanced */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { label: 'Total Decisions', value: selectedAgent.totalDecisions.toLocaleString(), color: 'blue' },
                  { label: 'Correct',         value: selectedAgent.correctDecisions.toLocaleString(), color: 'green' },
                  { label: 'Win Rate',        value: `${selectedAgent.winRate.toFixed(1)}%`, color: selectedAgent.winRate >= 60 ? 'green' : selectedAgent.winRate >= 50 ? 'yellow' : 'red' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-dark-surface/50 rounded-xl p-4 text-center border border-dark-border/30">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</div>
                    <div className={`text-xl font-bold ${
                      color === 'green' ? 'text-green-400' :
                      color === 'yellow' ? 'text-yellow-400' :
                      color === 'red' ? 'text-red-400' : 'text-white'
                    }`}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Reasoning from last decision - enhanced */}
              {selectedAgent.lastDecision?.reasoning && (
                <div className="bg-gradient-to-br from-dark-surface/60 to-dark-surface/30 rounded-xl p-4 border border-dark-border/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      Latest Reasoning
                    </div>
                    {selectedAgent.lastDecision.timestamp && (
                      <div className="text-[10px] text-gray-600 font-mono">{formatTimeAgo(selectedAgent.lastDecision.timestamp)}</div>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{selectedAgent.lastDecision.reasoning}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
