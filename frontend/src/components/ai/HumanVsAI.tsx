'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import {
  Users, Bot, TrendingUp, TrendingDown, Trophy,
  Zap, Shield, Sword, DollarSign, Activity, Wifi
} from 'lucide-react';
import { useAIAgent } from '@/contexts/AIAgentContext';
import { CryptoImg } from '@/components/icons/CryptoIcons';

const ASSET_COLORS: Record<string, string> = {
  BTC: '#f7931a', ETH: '#627eea', SOL: '#14f195', MNT: '#00D4AA',
};

function formatPrice(price: number, symbol: string): string {
  if (symbol === 'MNT') return `$${price.toFixed(4)}`;
  if (symbol === 'SOL') return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function HumanVsAI() {
  const { address } = useAccount();
  const {
    agents,
    currentHuman,
    currentSession,
    leaderboard,
    livePrices,
    makeHumanDecision,
  } = useAIAgent();
  
  const [selectedDirection, setSelectedDirection] = useState<'UP' | 'DOWN' | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [stake, setStake] = useState(100);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const topAI     = leaderboard.filter(item => 'version' in item).slice(0, 3);
  const topHumans = leaderboard.filter(item => !('version' in item)).slice(0, 3);
  const currentTick = livePrices[selectedAsset];

  const handlePredict = async () => {
    if (!selectedDirection || !address) return;
    
    setIsPredicting(true);
    try {
      await makeHumanDecision(selectedDirection, stake);
      setSelectedDirection(null);
    } catch (error) {
      console.error('Prediction failed:', error);
    } finally {
      setIsPredicting(false);
    }
  };

  if (!currentSession) {
    return (
      <div className="glass p-8 rounded-2xl border border-dark-border text-center">
        <Shield className="w-16 h-16 mx-auto mb-4 text-gray-500" />
        <h3 className="text-2xl font-bold text-white mb-2">Competition Not Active</h3>
        <p className="text-gray-400">Human vs AI session hasn't started yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Competition Header */}
      <div className="glass p-6 rounded-2xl border border-dark-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Human vs AI</h2>
                <p className="text-sm text-gray-400">Turing Test Competition</p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30">
              <Sword className="w-4 h-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">LIVE BATTLE</span>
            </div>
          </div>
          <button
            onClick={() => setShowLeaderboard(!showLeaderboard)}
            className="px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30 transition"
          >
            <Trophy className="w-4 h-4 inline mr-2" />
            Leaderboard
          </button>
        </div>

        {/* Competition Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-dark-surface/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm font-semibold">Human Players</span>
            </div>
            <div className="text-2xl font-bold text-white">{currentSession.totalHumans}</div>
            <div className="text-xs text-gray-400">Active participants</div>
          </div>
          <div className="bg-dark-surface/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <Bot className="w-5 h-5" />
              <span className="text-sm font-semibold">AI Agents</span>
            </div>
            <div className="text-2xl font-bold text-white">{agents.filter(a => a.isActive).length}</div>
            <div className="text-xs text-gray-400">Competing algorithms</div>
          </div>
          <div className="bg-dark-surface/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <DollarSign className="w-5 h-5" />
              <span className="text-sm font-semibold">Prize Pool</span>
            </div>
            <div className="text-2xl font-bold text-white">${currentSession.prizePool.toLocaleString()}</div>
            <div className="text-xs text-gray-400">Total rewards</div>
          </div>
        </div>
      </div>

      {/* Main Battle Interface */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Human Side */}
        <div className="glass p-6 rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Human Team</h3>
                <p className="text-sm text-blue-400">Compete against AI</p>
              </div>
            </div>
            {currentHuman && (
              <div className="text-right">
                <div className="text-sm text-gray-400">Your Performance</div>
                <div className="text-lg font-bold text-white">
                  {currentHuman.winRate.toFixed(1)}% WR
                </div>
              </div>
            )}
          </div>

          {/* Prediction Interface */}
          {address ? (
            <div className="space-y-4">

              {/* Asset selector + live price */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">Asset</label>
                <div className="flex gap-2 mb-3">
                  {(['BTC', 'ETH', 'SOL'] as const).map(sym => {
                    const tick = livePrices[sym];
                    const isUp = (tick?.change24h ?? 0) >= 0;
                    return (
                      <button
                        key={sym}
                        onClick={() => setSelectedAsset(sym)}
                        className={`flex-1 py-2 px-2 rounded-lg border text-xs font-bold transition ${
                          selectedAsset === sym
                            ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                            : 'border-dark-border bg-dark-surface text-gray-400 hover:border-gray-500'
                        }`}
                      >
                        <CryptoImg symbol={sym} className="w-4 h-4" />
                        <span className="ml-1">{sym}</span>
                        {tick && (
                          <span className={`ml-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                            {isUp ? '+' : ''}{tick.change24h.toFixed(1)}%
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Live price display */}
                {currentTick && (
                  <div className="flex items-center justify-between bg-dark-surface/50 rounded-xl px-4 py-3 border border-dark-border mb-1">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-xs text-gray-400">Live · Bybit</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-white">
                        {formatPrice(currentTick.price, selectedAsset)}
                      </div>
                      <div className={`text-xs font-semibold ${currentTick.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        24h: {currentTick.change24h >= 0 ? '+' : ''}{currentTick.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Stake Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Stake Amount
                </label>
                <div className="flex gap-2">
                  {[50, 100, 200, 500].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setStake(amount)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-bold transition ${
                        stake === amount
                          ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                          : 'border-dark-border bg-dark-surface text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Direction Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-2">
                  Will {selectedAsset} go UP or DOWN?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedDirection('UP')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedDirection === 'UP'
                        ? 'border-green-500 bg-green-500/10'
                        : 'border-dark-border bg-dark-surface hover:border-green-500/50'
                    }`}
                  >
                    <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-white">UP</div>
                    <div className="text-xs text-gray-400">Price goes up</div>
                  </button>
                  <button
                    onClick={() => setSelectedDirection('DOWN')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedDirection === 'DOWN'
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-dark-border bg-dark-surface hover:border-red-500/50'
                    }`}
                  >
                    <TrendingDown className="w-8 h-8 text-red-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-white">DOWN</div>
                    <div className="text-xs text-gray-400">Price goes down</div>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handlePredict}
                disabled={!selectedDirection || isPredicting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              >
                {isPredicting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Activity className="w-4 h-4 animate-pulse" />
                    Processing...
                  </span>
                ) : (
                  `Submit Prediction - $${stake}`
                )}
              </button>

              {/* Your Stats */}
              {currentHuman && (
                <div className="bg-dark-surface/30 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold text-white">{currentHuman.totalDecisions}</div>
                      <div className="text-xs text-gray-400">Decisions</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-green-400">{currentHuman.winRate.toFixed(1)}%</div>
                      <div className="text-xs text-gray-400">Win Rate</div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${currentHuman.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {currentHuman.totalPnL >= 0 ? '+' : ''}{currentHuman.totalPnL.toFixed(0)} CLASH
                      </div>
                      <div className="text-xs text-gray-400">PnL</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-500" />
              <p className="text-gray-400">Connect wallet to compete</p>
            </div>
          )}
        </div>

        {/* AI Side */}
        <div className="glass p-6 rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Team</h3>
                <p className="text-sm text-green-400">Algorithmic competition</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-green-400">Live</span>
            </div>
          </div>

          {/* Active Agents */}
          <div className="space-y-3">
            {agents.filter(agent => agent.isActive).map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-dark-surface/30 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-white">{agent.name}</div>
                      <div className="text-xs text-gray-400">v{agent.version}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      agent.winRate >= 60 ? 'text-green-400' : 
                      agent.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {agent.winRate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">{agent.totalDecisions} decisions</div>
                  </div>
                </div>

                {/* Last Decision */}
                {agent.lastDecision && (
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded ${
                      agent.lastDecision.direction === 'UP' 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {agent.lastDecision.direction === 'UP' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {agent.lastDecision.direction}
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                      <Zap className="w-3 h-3" />
                      {agent.lastDecision.confidence}%
                    </div>
                    <span className="text-gray-500">
                      {formatTimeAgo(agent.lastDecision.timestamp)}
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Leaderboard Modal */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowLeaderboard(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[80vh] overflow-hidden glass rounded-2xl border border-dark-border"
            >
              <div className="p-6 border-b border-dark-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">Competition Leaderboard</h3>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="space-y-6">
                  {/* Top AI */}
                  <div>
                    <h4 className="text-sm font-semibold text-green-400 mb-3">🤖 Top AI Agents</h4>
                    <div className="space-y-2">
                      {topAI.map((agent, index) => (
                        <div key={agent.id} className="flex items-center justify-between p-3 bg-dark-surface/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-sm font-bold text-black">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-bold text-white">{agent.name}</div>
                              <div className="text-xs text-gray-400">AI Agent</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-green-400">{agent.winRate.toFixed(1)}%</div>
                            <div className="text-xs text-gray-400">
                              {agent.totalPnL >= 0 ? '+' : ''}{agent.totalPnL.toFixed(0)} CLASH
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Humans */}
                  <div>
                    <h4 className="text-sm font-semibold text-blue-400 mb-3">👥 Top Humans</h4>
                    <div className="space-y-2">
                      {topHumans.map((human, index) => (
                        <div key={human.address} className="flex items-center justify-between p-3 bg-dark-surface/30 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-sm font-bold text-white">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-bold text-white">{human.name}</div>
                              <div className="text-xs text-gray-400">Human Player</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-blue-400">{human.winRate.toFixed(1)}%</div>
                            <div className="text-xs text-gray-400">
                              {human.totalPnL >= 0 ? '+' : ''}{human.totalPnL.toFixed(0)} CLASH
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}
