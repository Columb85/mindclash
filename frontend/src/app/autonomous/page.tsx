'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Database, BarChart3, Brain, Zap, CheckCircle2, RefreshCw,
  ArrowRight, ExternalLink, Play, Pause, Clock,
} from 'lucide-react';
import Link from 'next/link';

// ── Pipeline stages that mirror the Python bot's main loop ──────────────────
const STAGES = [
  {
    id: 'fetch',
    icon: Database,
    title: 'Fetch Market Data',
    color: '#3b82f6',
    description: 'Agent calls Bybit REST API for latest klines (OHLCV candles), order book depth, and 24h ticker.',
    code: `klines = bybit.get_klines(symbol="BTCUSDT", interval="1", limit=30)\nticker = bybit.get_tickers(symbol="BTCUSDT")`,
    duration: 2000,
  },
  {
    id: 'indicators',
    icon: BarChart3,
    title: 'Compute Technical Indicators',
    color: '#a855f7',
    description: 'RSI(14), SMA(10), SMA(20), Bollinger Bands(20,2), volume analysis, momentum score.',
    code: `rsi = calc_rsi(closes, 14)\nsma10 = calc_sma(closes, 10)\nboll = calc_bollinger(closes, 20, 2)`,
    duration: 1500,
  },
  {
    id: 'strategy',
    icon: Brain,
    title: 'Apply Strategy Logic',
    color: '#22c55e',
    description: 'Each agent uses a different strategy: Momentum follows trends, Mean-Reversion fades extremes, Neural combines weighted signals.',
    code: `signals = strategy.evaluate(indicators)\ndirection = "UP" if bull_count >= threshold else "DOWN"\nconfidence = min(950, base + bull_count * weight)`,
    duration: 2000,
  },
  {
    id: 'decide',
    icon: Zap,
    title: 'Form Decision',
    color: '#eab308',
    description: 'Combines all signals into a final direction (UP/DOWN), confidence level (0-100%), and human-readable reasoning string.',
    code: `decision = Decision(\n  direction="UP", confidence=780,\n  reasoning="Momentum: 4/5 bullish signals"\n)`,
    duration: 1000,
  },
  {
    id: 'submit',
    icon: CheckCircle2,
    title: 'Record On-Chain',
    color: '#f97316',
    description: 'Calls AgentNFT.recordDecision() on Mantle Sepolia. The transaction permanently stores the decision with the agent\'s ERC-8004 NFT identity.',
    code: `tx = contract.recordDecision(\n  tokenId=5, direction="UP",\n  confidence=780, stake=250,\n  reasoning="Momentum: 4/5 bullish"\n)`,
    duration: 3000,
  },
  {
    id: 'resolve',
    icon: RefreshCw,
    title: 'Resolve Previous Decision',
    color: '#06b6d4',
    description: 'After the prediction window, calls resolveDecision() with actual price movement. Updates win rate and PnL on-chain.',
    code: `contract.resolveDecision(\n  tokenId=5, decisionIndex=42,\n  wasCorrect=True, pnl=125\n)`,
    duration: 2000,
  },
];

export default function AutonomousPage() {
  const [playing, setPlaying] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const [cycleCount, setCycleCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const advanceStage = () => {
    setCurrentStage(prev => {
      const next = prev + 1;
      if (next >= STAGES.length) {
        // Cycle complete
        setCycleCount(c => c + 1);
        setCompletedStages(new Set());
        return 0; // restart
      }
      if (prev >= 0) {
        setCompletedStages(s => new Set([...s, STAGES[prev].id]));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (currentStage === -1) {
      setCurrentStage(0);
      return;
    }

    const stage = STAGES[currentStage];
    if (!stage) return;

    timerRef.current = setTimeout(() => {
      advanceStage();
    }, stage.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [playing, currentStage]);

  const togglePlay = () => {
    if (!playing) {
      if (currentStage === -1 || currentStage >= STAGES.length - 1) {
        setCurrentStage(-1);
        setCompletedStages(new Set());
      }
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#06060a]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white transition text-sm">← Back</Link>
          <div className="w-px h-5 bg-gray-800" />
          <Bot className="w-5 h-5 text-cyan-400" />
          <h1 className="text-lg font-black">Autonomous Loop Demo</h1>
          <div className="ml-auto flex items-center gap-3">
            {cycleCount > 0 && (
              <span className="text-[10px] text-gray-500">
                Cycles completed: <span className="text-white font-bold">{cycleCount}</span>
              </span>
            )}
            <button
              onClick={togglePlay}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                playing
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400'
                  : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/30'
              }`}
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {playing ? 'Pause' : 'Start Loop'}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        {/* Intro */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black">How the Python Bot Works</h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            This visualization shows the autonomous decision loop that runs every 5 minutes.
            Each cycle fetches live market data, runs strategy logic, and records the decision permanently on Mantle blockchain.
          </p>
        </div>

        {/* Pipeline visualization */}
        <div className="space-y-3">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const isCurrent   = currentStage === i;
            const isCompleted = completedStages.has(stage.id);
            const isUpcoming  = !isCurrent && !isCompleted;

            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  className={`rounded-2xl border overflow-hidden transition-all duration-500 ${
                    isCurrent ? 'ring-1' : ''
                  }`}
                  style={{
                    borderColor: isCurrent
                      ? `${stage.color}60`
                      : isCompleted
                        ? `${stage.color}30`
                        : 'rgba(255,255,255,0.05)',
                    background: isCurrent
                      ? `${stage.color}08`
                      : 'rgba(255,255,255,0.01)',
                    ...(isCurrent ? { boxShadow: `0 0 20px ${stage.color}15` } : {}),
                  }}
                >
                  {/* Header */}
                  <div className="px-5 py-3 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: isCurrent || isCompleted ? `${stage.color}20` : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${isCurrent || isCompleted ? stage.color : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4" style={{ color: stage.color }} />
                      ) : (
                        <Icon className={`w-4 h-4 ${isCurrent ? 'animate-pulse' : ''}`} style={{ color: isCurrent ? stage.color : '#6b7280' }} />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold transition ${isCurrent || isCompleted ? 'text-white' : 'text-gray-600'}`}>
                          {i + 1}. {stage.title}
                        </span>
                        {isCurrent && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: `${stage.color}20`, color: stage.color, border: `1px solid ${stage.color}40` }}
                          >
                            Running...
                          </motion.span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] text-green-400 font-bold">✓ Done</span>
                        )}
                      </div>
                      <div className={`text-[11px] mt-0.5 transition ${isCurrent ? 'text-gray-400' : isCompleted ? 'text-gray-600' : 'text-gray-700'}`}>
                        {stage.description}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {isCurrent && (
                      <div className="w-20 shrink-0">
                        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ background: stage.color }}
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: stage.duration / 1000, ease: 'linear' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Code preview — only show when current */}
                  <AnimatePresence>
                    {isCurrent && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4">
                          <pre className="text-[11px] font-mono leading-relaxed p-3 rounded-lg bg-black/40 border border-gray-800/50 overflow-x-auto" style={{ color: stage.color }}>
                            {stage.code}
                          </pre>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Arrow connector */}
                {i < STAGES.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowRight
                      className={`w-4 h-4 rotate-90 transition ${
                        isCompleted ? 'text-gray-500' : 'text-gray-800'
                      }`}
                    />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Architecture info */}
        <div className="rounded-2xl border border-gray-800/50 bg-gray-900/30 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Architecture</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1">
              <div className="text-cyan-400 font-bold">Python Bot</div>
              <div className="text-gray-500">Runs every 5 minutes. Fetches live Bybit data, computes indicators, applies strategy, submits to chain.</div>
              <div className="font-mono text-gray-600 text-[10px]">ai-agent/main.py</div>
            </div>
            <div className="space-y-1">
              <div className="text-purple-400 font-bold">Smart Contract</div>
              <div className="text-gray-500">AgentNFT (ERC-8004) on Mantle Sepolia. Stores decisions, tracks win rates, manages agent identity.</div>
              <div className="font-mono text-gray-600 text-[10px]">contracts/AgentNFT.sol</div>
            </div>
            <div className="space-y-1">
              <div className="text-green-400 font-bold">3 Agents</div>
              <div className="text-gray-500">AlphaPredict (momentum), MomentumMaster (mean-reversion), NeuralTrader (neural net). Each has its own wallet & NFT.</div>
              <div className="font-mono text-gray-600 text-[10px]">Token IDs: 5, 6, 7</div>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center justify-center gap-3">
          <a
            href="https://sepolia.mantlescan.xyz/address/0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-500/10 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" /> View Contract on MantleScan
          </a>
          <Link
            href="/leaderboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-yellow-500/30 text-yellow-400 text-xs font-bold hover:bg-yellow-500/10 transition"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Agent Leaderboard
          </Link>
        </div>
      </main>
    </div>
  );
}
