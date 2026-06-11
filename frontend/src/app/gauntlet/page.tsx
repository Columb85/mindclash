'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, ArrowUp, ArrowDown, Trophy, Loader2, Timer, Bot,
  User, RotateCcw, CheckCircle2, XCircle, Swords, Crown,
} from 'lucide-react';
import Link from 'next/link';
import { analyzeBotDecision, BotAnalysis } from '@/lib/bot-indicators';

const CHAMPIONS = [
  { tokenId: 5 as const, name: 'AlphaPredict',   strategy: 'Momentum',       color: '#3b82f6', title: 'The Trendsetter' },
  { tokenId: 6 as const, name: 'MomentumMaster', strategy: 'Mean-Reversion', color: '#a855f7', title: 'The Contrarian' },
  { tokenId: 7 as const, name: 'NeuralTrader',   strategy: 'Neural Net',     color: '#22c55e', title: 'The Mind' },
];

const ASSETS = ['BTC', 'ETH', 'SOL'] as const;
const ROUND_DURATION = 60; // seconds per round

type Phase = 'intro' | 'picking' | 'analyzing' | 'fighting' | 'round-result' | 'final';

interface RoundResult {
  championIdx: number;
  humanDirection: string;
  agentDirection: string;
  agentConfidence: number;
  agentReasoning: string;
  startPrice: number;
  endPrice: number;
  winner: 'human' | 'agent' | 'tie';
  priceChange: string;
}

async function fetchPrice(asset: string): Promise<number> {
  const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${asset}USDT`);
  const j = await r.json();
  return parseFloat(j?.result?.list?.[0]?.lastPrice ?? '0');
}

export default function GauntletPage() {
  const [phase, setPhase]         = useState<Phase>('intro');
  const [asset, setAsset]         = useState<typeof ASSETS[number]>('BTC');
  const [roundIdx, setRoundIdx]   = useState(0);
  const [direction, setDirection] = useState<'UP' | 'DOWN' | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [results, setResults]     = useState<RoundResult[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<BotAnalysis | null>(null);
  const [startPrice, setStartPrice] = useState(0);

  const endsAtRef   = useRef(0);
  const timerRef    = useRef<NodeJS.Timeout | null>(null);

  const champ = CHAMPIONS[roundIdx] ?? CHAMPIONS[0];
  const wins  = results.filter(r => r.winner === 'human').length;

  // ── Start gauntlet ──────────────────────────────────────────────────────────
  const begin = () => {
    setPhase('picking');
    setRoundIdx(0);
    setResults([]);
    setDirection(null);
  };

  // ── Pick direction & analyze ────────────────────────────────────────────────
  const submitPick = useCallback(async () => {
    if (!direction) return;
    setPhase('analyzing');
    try {
      const analysis = await analyzeBotDecision(champ.tokenId, asset, champ.strategy);
      setCurrentAnalysis(analysis);
      setStartPrice(analysis.market.price);
      endsAtRef.current = Math.floor(Date.now() / 1000) + ROUND_DURATION;
      setCountdown(ROUND_DURATION);
      setPhase('fighting');
    } catch {
      setPhase('picking');
    }
  }, [direction, champ, asset]);

  // ── Countdown ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'fighting') return;
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, endsAtRef.current - Math.floor(Date.now() / 1000));
      setCountdown(rem);
      if (rem <= 0) {
        clearInterval(timerRef.current!);
        resolveRound();
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Resolve ─────────────────────────────────────────────────────────────────
  const resolveRound = async () => {
    const endP = await fetchPrice(asset);
    const actualDir = endP > startPrice ? 'UP' : endP < startPrice ? 'DOWN' : 'TIE';
    const agentDir = currentAnalysis?.decision.direction ?? 'UP';

    let winner: 'human' | 'agent' | 'tie';
    if (actualDir === 'TIE') winner = 'tie';
    else if (direction === actualDir && agentDir !== actualDir) winner = 'human';
    else if (agentDir === actualDir && direction !== actualDir) winner = 'agent';
    else winner = 'tie';

    const r: RoundResult = {
      championIdx:    roundIdx,
      humanDirection: direction!,
      agentDirection: agentDir,
      agentConfidence: currentAnalysis?.decision.confidence ?? 0,
      agentReasoning: currentAnalysis?.decision.reasoning ?? '',
      startPrice,
      endPrice:       endP,
      winner,
      priceChange:    ((endP - startPrice) / startPrice * 100).toFixed(4),
    };

    setResults(prev => [...prev, r]);
    setPhase('round-result');
  };

  // ── Next round or final ─────────────────────────────────────────────────────
  const nextRound = () => {
    if (roundIdx + 1 >= CHAMPIONS.length) {
      setPhase('final');
    } else {
      setRoundIdx(roundIdx + 1);
      setDirection(null);
      setPhase('picking');
    }
  };

  const restart = () => {
    setPhase('intro');
    setRoundIdx(0);
    setResults([]);
    setDirection(null);
  };

  const currentResult = results[roundIdx];

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      <header className="border-b border-gray-800/50 bg-[#06060a]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white transition text-sm">← Back</Link>
          <div className="w-px h-5 bg-gray-800" />
          <Shield className="w-5 h-5 text-orange-400" />
          <h1 className="text-lg font-black">The Gauntlet</h1>
          {phase !== 'intro' && phase !== 'final' && (
            <span className="text-xs text-gray-500 ml-auto">Round {roundIdx + 1} of {CHAMPIONS.length}</span>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <AnimatePresence mode="wait">

          {/* ════ INTRO ═══════════════════════════════════════════════════════ */}
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-8 text-center py-8">
              <Shield className="w-16 h-16 text-orange-400 mx-auto" />
              <h2 className="text-3xl font-black">The Agent Gauntlet</h2>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                Face all 3 AI champions in sequence. Each round: pick UP or DOWN, then watch the agent
                analyze the market and counter your prediction. Beat all 3 to prove human supremacy.
              </p>

              <div className="grid grid-cols-3 gap-3">
                {CHAMPIONS.map((c, i) => (
                  <div key={c.tokenId} className="rounded-xl border p-4 text-center" style={{ borderColor: `${c.color}30`, background: `${c.color}05` }}>
                    <div className="text-xs font-bold" style={{ color: c.color }}>{c.name}</div>
                    <div className="text-[10px] text-gray-600">{c.title}</div>
                    <div className="text-[10px] text-gray-700 mt-1">{c.strategy}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Select Asset</div>
                <div className="flex gap-2 justify-center">
                  {ASSETS.map(a => (
                    <button key={a} onClick={() => setAsset(a)}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                        asset === a ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-gray-700 text-gray-400'
                      }`}>{a}</button>
                  ))}
                </div>
              </div>

              <button onClick={begin}
                className="px-8 py-4 rounded-xl font-black text-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30 transition">
                Enter The Gauntlet
              </button>
            </motion.div>
          )}

          {/* ════ PICKING ═════════════════════════════════════════════════════ */}
          {phase === 'picking' && (
            <motion.div key="picking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-6">
              <div className="text-center space-y-2">
                <div className="text-xs text-gray-500">Round {roundIdx + 1} / {CHAMPIONS.length}</div>
                <h2 className="text-xl font-black">vs <span style={{ color: champ.color }}>{champ.name}</span></h2>
                <div className="text-xs text-gray-600">{champ.title} — {champ.strategy}</div>
              </div>

              <div className="rounded-xl border p-6 text-center" style={{ borderColor: `${champ.color}30`, background: `${champ.color}05` }}>
                <Bot className="w-12 h-12 mx-auto mb-2" style={{ color: champ.color }} />
                <div className="text-sm font-bold" style={{ color: champ.color }}>{champ.name}</div>
                <div className="text-[10px] text-gray-600">Token #{champ.tokenId} — {asset}/USDT — {ROUND_DURATION}s</div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold text-center">Your Prediction</div>
                <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => setDirection('UP')}
                    className={`flex items-center justify-center gap-3 py-5 rounded-xl border text-lg font-black transition ${
                      direction === 'UP' ? 'border-green-500/60 bg-green-500/15 text-green-400' : 'border-gray-700 text-gray-500 hover:border-green-500/30'
                    }`}><ArrowUp className="w-6 h-6" /> UP</button>
                  <button onClick={() => setDirection('DOWN')}
                    className={`flex items-center justify-center gap-3 py-5 rounded-xl border text-lg font-black transition ${
                      direction === 'DOWN' ? 'border-red-500/60 bg-red-500/15 text-red-400' : 'border-gray-700 text-gray-500 hover:border-red-500/30'
                    }`}><ArrowDown className="w-6 h-6" /> DOWN</button>
                </div>
              </div>

              <button onClick={submitPick} disabled={!direction}
                className="w-full py-3 rounded-xl font-bold bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition">
                Lock In & Fight
              </button>
            </motion.div>
          )}

          {/* ════ ANALYZING ═══════════════════════════════════════════════════ */}
          {phase === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-4">
              <Bot className="w-12 h-12" style={{ color: champ.color }} />
              <Loader2 className="w-6 h-6 text-orange-400 animate-spin" />
              <div className="text-sm">{champ.name} is analyzing {asset}/USDT...</div>
            </motion.div>
          )}

          {/* ════ FIGHTING ════════════════════════════════════════════════════ */}
          {phase === 'fighting' && currentAnalysis && (
            <motion.div key="fighting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-6">
              <div className="text-center">
                <motion.div className="text-5xl font-black tabular-nums" key={countdown}
                  initial={{ scale: 1.05 }} animate={{ scale: 1 }}>
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </motion.div>
                <div className="text-xs text-gray-500 mt-1">Round {roundIdx + 1} — {asset}/USDT</div>
              </div>

              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 text-center">
                  <User className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <div className="text-xs font-bold text-white">You</div>
                  <div className={`text-lg font-black mt-1 ${direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                    {direction}
                  </div>
                </div>
                <div className="text-2xl font-black text-gray-600 text-center">VS</div>
                <div className="rounded-xl border p-4 text-center" style={{ borderColor: `${champ.color}30`, background: `${champ.color}05` }}>
                  <Bot className="w-5 h-5 mx-auto mb-1" style={{ color: champ.color }} />
                  <div className="text-xs font-bold" style={{ color: champ.color }}>{champ.name}</div>
                  <div className={`text-lg font-black mt-1 ${currentAnalysis.decision.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                    {currentAnalysis.decision.direction}
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-gray-600 font-mono text-center">{currentAnalysis.decision.reasoning}</div>
            </motion.div>
          )}

          {/* ════ ROUND RESULT ════════════════════════════════════════════════ */}
          {phase === 'round-result' && currentResult && (
            <motion.div key="round-result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="space-y-6 text-center">
              <div className={`rounded-2xl border p-6 ${
                currentResult.winner === 'human' ? 'border-green-500/30 bg-green-500/5' :
                currentResult.winner === 'agent' ? 'border-red-500/30 bg-red-500/5' :
                'border-yellow-500/30 bg-yellow-500/5'
              }`}>
                {currentResult.winner === 'human' ? (
                  <><CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <div className="text-xl font-black text-green-400">You beat {CHAMPIONS[currentResult.championIdx].name}!</div></>
                ) : currentResult.winner === 'agent' ? (
                  <><XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <div className="text-xl font-black text-red-400">{CHAMPIONS[currentResult.championIdx].name} wins this round</div></>
                ) : (
                  <><div className="text-xl font-black text-yellow-400">Tie!</div></>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  ${currentResult.startPrice.toLocaleString()} → ${currentResult.endPrice.toLocaleString()} ({currentResult.priceChange}%)
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                {results.map((r, i) => (
                  <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    r.winner === 'human' ? 'bg-green-500/20 text-green-400' :
                    r.winner === 'agent' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>{r.winner === 'human' ? 'W' : r.winner === 'agent' ? 'L' : 'T'}</div>
                ))}
                {Array.from({ length: CHAMPIONS.length - results.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="w-8 h-8 rounded-lg bg-gray-800/30 border border-gray-800" />
                ))}
              </div>

              <button onClick={nextRound}
                className="px-6 py-3 rounded-xl font-bold bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30 transition">
                {roundIdx + 1 >= CHAMPIONS.length ? 'See Final Results' : `Next: ${CHAMPIONS[roundIdx + 1].name}`}
              </button>
            </motion.div>
          )}

          {/* ════ FINAL ═══════════════════════════════════════════════════════ */}
          {phase === 'final' && (
            <motion.div key="final" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="space-y-6 text-center py-8">
              <Crown className={`w-16 h-16 mx-auto ${wins >= 2 ? 'text-yellow-400' : wins >= 1 ? 'text-gray-400' : 'text-red-400'}`} />
              <h2 className="text-3xl font-black">
                {wins === 3 && 'FLAWLESS VICTORY'}
                {wins === 2 && 'You Conquered The Gauntlet!'}
                {wins === 1 && 'Close Fight!'}
                {wins === 0 && 'The Machines Win... This Time'}
              </h2>
              <div className="text-sm text-gray-400">
                Score: {wins}/{CHAMPIONS.length} rounds won
              </div>

              <div className="space-y-3 max-w-sm mx-auto">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-800/50 p-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${CHAMPIONS[i].color}15` }}>
                      <Bot className="w-4 h-4" style={{ color: CHAMPIONS[i].color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-xs font-bold" style={{ color: CHAMPIONS[i].color }}>{CHAMPIONS[i].name}</div>
                      <div className="text-[10px] text-gray-600">You: {r.humanDirection} vs Agent: {r.agentDirection}</div>
                    </div>
                    <div className={`text-xs font-bold ${r.winner === 'human' ? 'text-green-400' : r.winner === 'agent' ? 'text-red-400' : 'text-yellow-400'}`}>
                      {r.winner === 'human' ? 'WIN' : r.winner === 'agent' ? 'LOSS' : 'TIE'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                <button onClick={restart}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold border border-gray-700 text-gray-300 hover:bg-gray-800/50 transition">
                  <RotateCcw className="w-4 h-4" /> Try Again
                </button>
                <Link href="/duel"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition">
                  <Swords className="w-4 h-4" /> Quick Duel
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
