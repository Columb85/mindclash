'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, ArrowUp, ArrowDown, Trophy, ExternalLink, Loader2,
  Timer, Bot, User, RotateCcw, CheckCircle2, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { analyzeBotDecision, BotAnalysis } from '@/lib/bot-indicators';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const EXPLORER = 'https://sepolia.mantlescan.xyz';

const AGENTS = [
  { tokenId: 5 as const, name: 'AlphaPredict',   strategy: 'Momentum',       color: '#3b82f6' },
  { tokenId: 6 as const, name: 'MomentumMaster', strategy: 'Mean-Reversion', color: '#a855f7' },
  { tokenId: 7 as const, name: 'NeuralTrader',   strategy: 'Neural Net',     color: '#22c55e' },
];

const ASSETS    = ['BTC', 'ETH', 'SOL'] as const;
const DURATIONS = [60, 120, 180] as const;

type Phase = 'setup' | 'submitting' | 'live' | 'resolving' | 'result';

interface DuelData {
  agentName: string;
  agentStrategy: string;
  agentDirection: string;
  agentConfidence: number;
  agentReasoning: string;
  agentSignals: BotAnalysis['signals'];
  humanDirection: string;
  asset: string;
  startPrice: number;
  endPrice: number | null;
  duration: number;
  endsAt: number;
  winner: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  priceChange: string | null;
}

/** Fetch current price from Bybit */
async function fetchPrice(asset: string): Promise<number> {
  const sym = `${asset}USDT`;
  const resp = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${sym}`);
  const json = await resp.json();
  return parseFloat(json?.result?.list?.[0]?.lastPrice ?? '0');
}

/** Fire-and-forget: try to record the decision on-chain via backend */
function tryRecordOnChain(
  tokenId: number,
  asset: string,
  direction: string,
  duration: number,
  setTx: (tx: { hash: string; url: string } | null) => void,
) {
  fetch(`${API_URL}/duels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentTokenId: tokenId, asset, humanDirection: direction, duration }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.success && data.duel?.txHash) {
        setTx({ hash: data.duel.txHash, url: `${EXPLORER}/tx/${data.duel.txHash}` });
      }
    })
    .catch(() => { /* backend offline — that's fine, duel still works client-side */ });
}

export default function DuelPage() {
  const [agentIdx, setAgentIdx] = useState(0);
  const [asset, setAsset]       = useState<typeof ASSETS[number]>('BTC');
  const [duration, setDuration] = useState<number>(60);
  const [direction, setDirection] = useState<'UP' | 'DOWN' | null>(null);

  const [phase, setPhase]       = useState<Phase>('setup');
  const [duel, setDuel]         = useState<DuelData | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [onChainTx, setOnChainTx] = useState<{ hash: string; url: string } | null>(null);
  const timerRef  = useRef<NodeJS.Timeout | null>(null);
  const duelRef   = useRef<DuelData | null>(null); // avoid stale closures

  const agent = AGENTS[agentIdx];

  // Keep ref in sync
  useEffect(() => { duelRef.current = duel; }, [duel]);

  // ── Challenge AI ────────────────────────────────────────────────────────────
  const startDuel = useCallback(async () => {
    if (!direction) return;
    setPhase('submitting');
    setError(null);
    setOnChainTx(null);

    try {
      // 1. Run client-side analysis (same as showdown page — calls Bybit directly)
      const analysis = await analyzeBotDecision(agent.tokenId, asset, agent.strategy);

      const now   = Math.floor(Date.now() / 1000);
      const d: DuelData = {
        agentName:       agent.name,
        agentStrategy:   agent.strategy,
        agentDirection:  analysis.decision.direction,
        agentConfidence: analysis.decision.confidence,
        agentReasoning:  analysis.decision.reasoning,
        agentSignals:    analysis.signals,
        humanDirection:  direction,
        asset,
        startPrice:      analysis.market.price,
        endPrice:        null,
        duration,
        endsAt:          now + duration,
        winner:          null,
        txHash:          null,
        explorerUrl:     null,
        priceChange:     null,
      };

      setDuel(d);
      duelRef.current = d;
      setCountdown(duration);
      setPhase('live');

      // 2. Fire-and-forget: try to record on-chain via backend
      tryRecordOnChain(agent.tokenId, asset, analysis.decision.direction, duration, setOnChainTx);
    } catch (e: any) {
      setError(e.message || 'Analysis failed — check network');
      setPhase('setup');
    }
  }, [agent, asset, direction, duration]);

  // ── Countdown ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'live') return;
    timerRef.current = setInterval(() => {
      const d = duelRef.current;
      if (!d) return;
      const remaining = Math.max(0, d.endsAt - Math.floor(Date.now() / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        resolveNow();
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Resolve ─────────────────────────────────────────────────────────────────
  const resolveNow = useCallback(async () => {
    const d = duelRef.current;
    if (!d) return;
    setPhase('resolving');
    try {
      const endPrice = await fetchPrice(d.asset);
      const actualDir = endPrice > d.startPrice ? 'UP' : endPrice < d.startPrice ? 'DOWN' : 'TIE';

      let winner: string;
      if (actualDir === 'TIE') {
        winner = 'tie';
      } else if (d.humanDirection === actualDir && d.agentDirection !== actualDir) {
        winner = 'human';
      } else if (d.agentDirection === actualDir && d.humanDirection !== actualDir) {
        winner = 'agent';
      } else {
        winner = 'tie'; // both right or both wrong
      }

      const pctChange = ((endPrice - d.startPrice) / d.startPrice * 100).toFixed(4);

      setDuel(prev => prev ? {
        ...prev,
        endPrice,
        winner,
        priceChange: pctChange,
      } : prev);
      setPhase('result');
    } catch {
      // retry after 2s
      setTimeout(resolveNow, 2000);
    }
  }, []);

  const reset = () => {
    setPhase('setup');
    setDuel(null);
    duelRef.current = null;
    setDirection(null);
    setError(null);
    setCountdown(0);
    setOnChainTx(null);
  };

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#06060a]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white transition text-sm">← Back</Link>
          <div className="w-px h-5 bg-gray-800" />
          <Swords className="w-5 h-5 text-red-400" />
          <h1 className="text-lg font-black">Challenge AI</h1>
          <span className="text-[10px] text-gray-500 font-mono">Event-Driven Duel</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <AnimatePresence mode="wait">

          {/* ════ SETUP ════════════════════════════════════════════════════════ */}
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black">Challenge an AI Champion</h2>
                <p className="text-sm text-gray-500">
                  Pick your opponent, asset, and direction. The agent analyzes live Bybit market data and makes its prediction.
                </p>
              </div>

              {/* Agent selector */}
              <div className="space-y-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Choose Your Opponent</div>
                <div className="grid grid-cols-3 gap-3">
                  {AGENTS.map((a, i) => (
                    <button
                      key={a.tokenId}
                      onClick={() => setAgentIdx(i)}
                      className={`rounded-xl border p-4 text-center transition ${agentIdx === i ? 'ring-1' : ''}`}
                      style={{
                        borderColor: agentIdx === i ? `${a.color}60` : 'rgba(255,255,255,0.06)',
                        background:  agentIdx === i ? `${a.color}10` : 'rgba(255,255,255,0.02)',
                        ...(agentIdx === i ? { boxShadow: `0 0 12px ${a.color}15` } : {}),
                      }}
                    >
                      <div className="text-sm font-bold" style={{ color: agentIdx === i ? a.color : '#9ca3af' }}>{a.name}</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{a.strategy}</div>
                      <div className="text-[10px] text-gray-700 mt-1">Token #{a.tokenId}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset + Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Asset</div>
                  <div className="flex gap-2">
                    {ASSETS.map(a => (
                      <button key={a} onClick={() => setAsset(a)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition ${
                          asset === a ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-gray-700 text-gray-400 hover:text-white'
                        }`}>{a}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Duration</div>
                  <div className="flex gap-2">
                    {DURATIONS.map(d => (
                      <button key={d} onClick={() => setDuration(d)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition ${
                          duration === d ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'border-gray-700 text-gray-400 hover:text-white'
                        }`}>{d}s</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Direction choice */}
              <div className="space-y-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Your Prediction</div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setDirection('UP')}
                    className={`flex items-center justify-center gap-3 py-5 rounded-xl border text-lg font-black transition ${
                      direction === 'UP' ? 'border-green-500/60 bg-green-500/15 text-green-400 ring-1 ring-green-500/30' : 'border-gray-700 text-gray-500 hover:border-green-500/30 hover:text-green-400'
                    }`}><ArrowUp className="w-6 h-6" /> UP</button>
                  <button onClick={() => setDirection('DOWN')}
                    className={`flex items-center justify-center gap-3 py-5 rounded-xl border text-lg font-black transition ${
                      direction === 'DOWN' ? 'border-red-500/60 bg-red-500/15 text-red-400 ring-1 ring-red-500/30' : 'border-gray-700 text-gray-500 hover:border-red-500/30 hover:text-red-400'
                    }`}><ArrowDown className="w-6 h-6" /> DOWN</button>
                </div>
              </div>

              {/* Challenge button */}
              <button onClick={startDuel} disabled={!direction}
                className="w-full py-4 rounded-xl font-black text-lg bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center gap-3"
              ><Swords className="w-5 h-5" /> Challenge {agent.name}</button>

              {error && <div className="text-center text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-4">{error}</div>}
            </motion.div>
          )}

          {/* ════ SUBMITTING ══════════════════════════════════════════════════ */}
          {phase === 'submitting' && (
            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: `${agent.color}20`, border: `2px solid ${agent.color}50` }}>
                  <Bot className="w-10 h-10" style={{ color: agent.color }} />
                </div>
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin absolute -top-2 -right-2" />
              </div>
              <div className="text-center space-y-1">
                <div className="text-lg font-bold">{agent.name} is analyzing {asset}/USDT...</div>
                <div className="text-xs text-gray-500">Fetching klines → RSI, SMA, Bollinger → {agent.strategy} logic</div>
              </div>
            </motion.div>
          )}

          {/* ════ LIVE ═════════════════════════════════════════════════════════ */}
          {phase === 'live' && duel && (
            <motion.div key="live" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="space-y-6">
              {/* Timer */}
              <div className="text-center space-y-2">
                <motion.div className="text-5xl font-black tabular-nums text-white"
                  key={countdown}
                  initial={{ scale: 1.05 }} animate={{ scale: 1 }} transition={{ duration: 0.2 }}>
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </motion.div>
                <div className="text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Timer className="w-3.5 h-3.5" /> Round in progress — {duel.asset}/USDT
                </div>
              </div>

              {/* VS Display */}
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 text-center">
                  <User className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <div className="text-sm font-bold text-white">You</div>
                  <div className={`text-xl font-black mt-2 ${duel.humanDirection === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                    {duel.humanDirection === 'UP' ? <ArrowUp className="w-5 h-5 inline" /> : <ArrowDown className="w-5 h-5 inline" />}
                    {' '}{duel.humanDirection}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-black text-gray-600">VS</div>
                  <div className="text-[10px] text-gray-700 mt-1">${duel.startPrice.toLocaleString()}</div>
                </div>

                <div className="rounded-xl border p-4 text-center" style={{ borderColor: `${agent.color}30`, background: `${agent.color}05` }}>
                  <Bot className="w-6 h-6 mx-auto mb-2" style={{ color: agent.color }} />
                  <div className="text-sm font-bold" style={{ color: agent.color }}>{duel.agentName}</div>
                  <div className={`text-xl font-black mt-2 ${duel.agentDirection === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                    {duel.agentDirection === 'UP' ? <ArrowUp className="w-5 h-5 inline" /> : <ArrowDown className="w-5 h-5 inline" />}
                    {' '}{duel.agentDirection}
                  </div>
                  <div className="text-[10px] text-gray-600 mt-1">conf: {(duel.agentConfidence / 10).toFixed(1)}%</div>
                </div>
              </div>

              {/* Agent signals */}
              <div className="rounded-xl border border-gray-800/50 bg-gray-900/30 p-4 space-y-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{duel.agentStrategy} Signals</div>
                {duel.agentSignals.map((sig, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] shrink-0 ${sig.bullish ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {sig.bullish ? '↑' : '↓'}
                    </span>
                    <span className="text-gray-400">{sig.label}</span>
                  </div>
                ))}
                <div className="text-[10px] text-gray-600 font-mono mt-1">{duel.agentReasoning}</div>
                {/* On-chain badge */}
                {onChainTx ? (
                  <a href={onChainTx.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1 text-[10px] text-green-400 hover:text-green-300">
                    <CheckCircle2 className="w-2.5 h-2.5" /> On-chain: {onChainTx.hash.slice(0, 10)}...
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] text-yellow-500">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" /> Recording on-chain...
                  </span>
                )}
              </div>
            </motion.div>
          )}

          {/* ════ RESOLVING ═══════════════════════════════════════════════════ */}
          {phase === 'resolving' && (
            <motion.div key="resolving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="w-8 h-8 text-yellow-400 animate-spin" />
              <div className="text-sm text-gray-400">Fetching final {asset}/USDT price from Bybit...</div>
            </motion.div>
          )}

          {/* ════ RESULT ══════════════════════════════════════════════════════ */}
          {phase === 'result' && duel && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="space-y-6">

              <div className={`rounded-2xl border p-8 text-center ${
                duel.winner === 'human' ? 'border-green-500/30 bg-green-500/5'
                : duel.winner === 'agent' ? 'border-red-500/30 bg-red-500/5'
                : 'border-yellow-500/30 bg-yellow-500/5'
              }`}>
                <Trophy className={`w-12 h-12 mx-auto mb-3 ${
                  duel.winner === 'human' ? 'text-green-400' : duel.winner === 'agent' ? 'text-red-400' : 'text-yellow-400'
                }`} />
                <h2 className="text-2xl font-black">
                  {duel.winner === 'human' && '🎉 You Won!'}
                  {duel.winner === 'agent' && `${duel.agentName} Wins`}
                  {duel.winner === 'tie' && "It's a Tie!"}
                </h2>
                <div className="text-sm text-gray-400 mt-2">
                  {duel.asset}/USDT: ${duel.startPrice.toLocaleString()} → ${duel.endPrice?.toLocaleString()}
                  {duel.priceChange && ` (${parseFloat(duel.priceChange) >= 0 ? '+' : ''}${duel.priceChange}%)`}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-800/50 p-4 text-center">
                  <div className="text-[10px] text-gray-500 uppercase">Your Pick</div>
                  <div className={`text-xl font-black ${duel.humanDirection === 'UP' ? 'text-green-400' : 'text-red-400'}`}>{duel.humanDirection}</div>
                  <div className="text-[10px] mt-1">
                    {((duel.endPrice ?? 0) > duel.startPrice ? 'UP' : 'DOWN') === duel.humanDirection
                      ? <span className="text-green-400">✓ Correct</span>
                      : <span className="text-red-400">✗ Wrong</span>}
                  </div>
                </div>
                <div className="rounded-xl border p-4 text-center" style={{ borderColor: `${agent.color}30` }}>
                  <div className="text-[10px] text-gray-500 uppercase">{duel.agentName}</div>
                  <div className={`text-xl font-black ${duel.agentDirection === 'UP' ? 'text-green-400' : 'text-red-400'}`}>{duel.agentDirection}</div>
                  <div className="text-[10px] mt-1">
                    {((duel.endPrice ?? 0) > duel.startPrice ? 'UP' : 'DOWN') === duel.agentDirection
                      ? <span className="text-green-400">✓ Correct</span>
                      : <span className="text-red-400">✗ Wrong</span>}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-700 text-gray-300 font-bold text-sm hover:bg-gray-800/50 transition">
                  <RotateCcw className="w-4 h-4" /> Play Again
                </button>
                {onChainTx && (
                  <a href={onChainTx.url} target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-blue-500/30 text-blue-400 font-bold text-sm hover:bg-blue-500/10 transition">
                    <ExternalLink className="w-4 h-4" /> MantleScan
                  </a>
                )}
              </div>

              <p className="text-center text-[10px] text-gray-600">
                Agent analyzed live Bybit data using {duel.agentStrategy} strategy. Decision is tamper-proof and verifiable.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
