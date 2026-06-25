'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Database, BarChart3, Brain, Zap, CheckCircle2,
  TrendingUp, TrendingDown, ExternalLink, Loader2, AlertCircle, Play,
} from 'lucide-react';
import { analyzeBotDecision, BotAnalysis, Bollinger } from '@/lib/bot-indicators';
import { ShareableDecisionCard } from './ShareableDecisionCard';
import { Share2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';

interface TxResult { txHash: string; explorerUrl: string }

type Phase = 'idle' | 'fetch' | 'indicators' | 'signals' | 'decision' | 'submit' | 'done' | 'error';

const PHASE_ORDER: Phase[] = ['fetch', 'indicators', 'signals', 'decision', 'submit', 'done'];

const PHASE_META: Record<string, { icon: React.ReactNode; label: string }> = {
  fetch:      { icon: <Database className="w-4 h-4" />,  label: 'Fetching market data'       },
  indicators: { icon: <BarChart3 className="w-4 h-4" />, label: 'Computing indicators'       },
  signals:    { icon: <Brain className="w-4 h-4" />,     label: 'Evaluating strategy signals' },
  decision:   { icon: <Zap className="w-4 h-4" />,       label: 'Forming decision'            },
  submit:     { icon: <Loader2 className="w-4 h-4 animate-spin" />, label: 'Submitting on-chain' },
  done:       { icon: <CheckCircle2 className="w-4 h-4" />, label: 'Confirmed on Mantle'      },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function rsiLabel(rsi: number | null) {
  if (rsi == null) return '—';
  if (rsi > 70) return `${rsi} (Overbought)`;
  if (rsi < 30) return `${rsi} (Oversold)`;
  return `${rsi} (Neutral)`;
}

function rsiColor(rsi: number | null) {
  if (rsi == null) return 'text-gray-500';
  if (rsi > 70) return 'text-red-400';
  if (rsi < 30) return 'text-green-400';
  return 'text-yellow-400';
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props {
  tokenId:  number;
  name:     string;
  strategy: string;
  color:    string;
  asset:    string;
}

export function BotThinkingPanel({ tokenId, name, strategy, color, asset }: Props) {
  const [phase,    setPhase]    = useState<Phase>('idle');
  const [analysis, setAnalysis] = useState<BotAnalysis | null>(null);
  const [tx,       setTx]       = useState<TxResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const run = useCallback(async () => {
    setPhase('fetch');
    setAnalysis(null);
    setTx(null);
    setError(null);

    try {
      // Phase 1-2: fetch Bybit klines + compute indicators client-side (no backend needed)
      await sleep(500);
      setPhase('indicators');
      await sleep(300);

      const result = await analyzeBotDecision(tokenId as 5 | 6 | 7, asset, strategy);

      setPhase('signals');
      setAnalysis(result);
      await sleep(900);

      setPhase('decision');
      await sleep(700);

      // Phase 5: submit on-chain via backend
      setPhase('submit');
      try {
        const r2 = await fetch(`${API_URL}/agents/demo`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ tokenId, asset }),
        });
        const j2 = await r2.json();
        if (j2.success) {
          // Private backend: returns txHash (on-chain signing with real keys)
          // Public backend: returns success without txHash (simulation mode)
          if (j2.txHash) {
            setTx({ txHash: j2.txHash, explorerUrl: j2.explorerUrl });
          }
        } else {
          setError(j2.error ?? 'Private key not configured — analysis shown above is real');
        }
      } catch {
        setError('On-chain submission requires backend — all analysis above is real (live Bybit data)');
      }
      setPhase('done');
    } catch (e: any) {
      setError(e.message);
      setPhase('error');
    }
  }, [tokenId, asset, strategy]);

  const currentPhaseIdx = PHASE_ORDER.indexOf(phase);
  const isRunning = phase !== 'idle' && phase !== 'done' && phase !== 'error';

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: `${color}30`, background: 'rgba(8,8,14,0.95)' }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: `${color}20` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18`, border: `1px solid ${color}40` }}>
            <Bot className="w-4 h-4" style={{ color }} />
          </div>
          <div>
            <div className="text-xs font-bold text-white">{name}</div>
            <div className="text-[12px] font-mono" style={{ color: `${color}99` }}>{strategy} · #{tokenId}</div>
          </div>
        </div>
        {(phase === 'done' || phase === 'error') && (
          <button onClick={run}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition"
            style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
          >
            <Brain className="w-3 h-3" /> Re-run
          </button>
        )}
      </div>

      {/* ── Big trigger button (idle state only) ── */}
      {phase === 'idle' && (
        <div className="px-5 py-5">
          <button
            onClick={run}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${color}25, ${color}12)`,
              border: `1.5px solid ${color}55`,
              color,
              boxShadow: `0 0 20px ${color}15`,
            }}
          >
            <Play className="w-5 h-5 fill-current" />
            Watch {name} analyze {asset}
          </button>
          <p className="text-center text-[12px] text-gray-600 mt-2">
            Live Bybit data · RSI · SMA · Bollinger · On-chain tx
          </p>
        </div>
      )}

      {/* ── Timeline ── */}
      {phase !== 'idle' && (
        <div className="px-5 pt-4 flex items-center gap-1.5">
          {PHASE_ORDER.filter(p => p !== 'done').map((p, i) => {
            const done    = currentPhaseIdx > i;
            const active  = phase === p;
            return (
              <div key={p} className="flex items-center gap-1.5 flex-1">
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-full text-[12px] flex-shrink-0 transition-all"
                  style={{
                    background: done ? `${color}30` : active ? `${color}20` : 'rgba(255,255,255,0.04)',
                    border:     `1px solid ${done || active ? color : 'rgba(255,255,255,0.08)'}`,
                    color:      done || active ? color : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {done ? '✓' : String(i + 1)}
                </div>
                {i < 4 && (
                  <div className="h-px flex-1 rounded transition-all" style={{ background: done ? `${color}50` : 'rgba(255,255,255,0.06)' }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Content ── */}
      <div className="px-5 pb-5 pt-3 space-y-3 min-h-[120px]">
        <AnimatePresence mode="wait">

          {/* FETCHING */}
          {phase === 'fetch' && (
            <motion.div key="fetch" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-2">
              <PhaseHeader phase="fetch" color={color} />
              <SkeletonRow />
              <SkeletonRow w="60%" />
              <SkeletonRow w="75%" />
            </motion.div>
          )}

          {/* INDICATORS */}
          {phase === 'indicators' && (
            <motion.div key="indicators" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 pt-2">
              <PhaseHeader phase="indicators" color={color} />
              <SkeletonRow />
              <SkeletonRow w="55%" />
              <SkeletonRow w="80%" />
            </motion.div>
          )}

          {/* SIGNALS — data arrives */}
          {(phase === 'signals' || phase === 'decision' || phase === 'submit' || phase === 'done') && analysis && (
            <motion.div key="signals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pt-1">

              {/* Market row */}
              <div className="grid grid-cols-3 gap-2">
                <DataCell label="Price" value={`$${fmt(analysis.market.price, analysis.market.asset === 'BTC' ? 0 : 2)}`} color={color} />
                <DataCell
                  label="24h Change"
                  value={`${analysis.market.change24h >= 0 ? '+' : ''}${(analysis.market.change24h * 100).toFixed(2)}%`}
                  color={analysis.market.change24h >= 0 ? '#22c55e' : '#ef4444'}
                />
                <DataCell label="Vol/Avg" value={`${(analysis.market.lastVolume / analysis.market.avgVolume).toFixed(2)}×`} color="#a855f7" />
              </div>

              {/* Indicators row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 space-y-1.5">
                  <div className="text-[13px] text-gray-500 uppercase font-semibold tracking-wide">Oscillators</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">RSI(14)</span>
                    <span className={`font-mono font-bold ${rsiColor(analysis.indicators.rsi)}`}>{rsiLabel(analysis.indicators.rsi)}</span>
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 space-y-1.5">
                  <div className="text-[13px] text-gray-500 uppercase font-semibold tracking-wide">Moving Averages</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">SMA10</span>
                    <span className="font-mono text-white">{analysis.indicators.sma10 != null ? `$${fmt(analysis.indicators.sma10, 0)}` : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">SMA20</span>
                    <span className="font-mono text-white">{analysis.indicators.sma20 != null ? `$${fmt(analysis.indicators.sma20, 0)}` : '—'}</span>
                  </div>
                </div>
              </div>

              {/* Bollinger */}
              {analysis.indicators.bollinger && (
                <BollingerBar
                  price={analysis.market.price}
                  boll={analysis.indicators.bollinger}
                  color={color}
                />
              )}

              {/* Signals */}
              <div className="space-y-1.5">
                <div className="text-[13px] text-gray-500 uppercase font-semibold tracking-wide">Strategy Signals — {strategy}</div>
                {analysis.signals.map((sig, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[12px] flex-shrink-0 ${sig.bullish ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {sig.bullish ? '↑' : '↓'}
                    </span>
                    <span className="text-gray-300">{sig.label}</span>
                  </motion.div>
                ))}
              </div>

              {/* Decision */}
              {(phase === 'decision' || phase === 'submit' || phase === 'done') && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border px-4 py-3 flex items-center gap-4"
                  style={{ borderColor: `${color}40`, background: `${color}0e` }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}25`, border: `2px solid ${color}60` }}
                  >
                    {analysis.decision.direction === 'UP'
                      ? <TrendingUp  className="w-6 h-6" style={{ color }} />
                      : <TrendingDown className="w-6 h-6" style={{ color }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black" style={{ color }}>{analysis.decision.direction}</span>
                      <span className="text-xs text-gray-400 font-mono">{asset}</span>
                      <span className="ml-auto text-xs text-gray-500 font-mono">
                        conf: <span className="text-white font-bold">{(analysis.decision.confidence / 10).toFixed(1)}%</span>
                      </span>
                    </div>
                    <div className="text-[12px] text-gray-500 mt-0.5 truncate">{analysis.decision.reasoning}</div>
                  </div>
                </motion.div>
              )}

              {/* Submit spinner */}
              {phase === 'submit' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-xs text-gray-400"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  Calling <code className="text-blue-300">recordDecision({tokenId}, &ldquo;{analysis.decision.direction}&rdquo;, {analysis.decision.confidence}, 250, &ldquo;...&rdquo;)</code>
                </motion.div>
              )}

              {/* Confirmed / Error */}
              {phase === 'done' && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  {tx ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-500/25 bg-green-500/[0.07]">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-green-400">On-chain confirmed</div>
                        <div className="text-[12px] text-gray-500 font-mono truncate">{tx.txHash}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setShowShare(true)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-[12px] text-purple-400 hover:text-purple-300"
                        >
                          <Share2 className="w-2.5 h-2.5" /> Share
                        </button>
                        <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-[12px] text-blue-400 hover:text-blue-300"
                        >
                          <ExternalLink className="w-2.5 h-2.5" />
                          MantleScan
                        </a>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-yellow-500/25 bg-yellow-500/[0.07]">
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-yellow-400">Analysis complete · tx skipped</div>
                        <div className="text-[12px] text-gray-500 mt-0.5">{error}</div>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ERROR */}
          {phase === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-red-400 text-xs pt-4"
            >
              <AlertCircle className="w-4 h-4" /> {error}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      {/* Share modal */}
      {showShare && analysis && (
        <ShareableDecisionCard
          decision={{
            agentName: name,
            tokenId,
            strategy,
            color,
            direction: analysis.decision.direction,
            confidence: analysis.decision.confidence,
            reasoning: analysis.decision.reasoning,
            asset,
            txHash: tx?.txHash,
          }}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PhaseHeader({ phase, color }: { phase: Phase; color: string }) {
  const meta = PHASE_META[phase];
  return (
    <div className="flex items-center gap-2 text-xs font-semibold" style={{ color }}>
      {meta.icon}
      {meta.label}
      <Loader2 className="w-3 h-3 animate-spin opacity-60 ml-auto" />
    </div>
  );
}

function SkeletonRow({ w = '100%' }: { w?: string }) {
  return (
    <div className="h-3 rounded-full bg-white/[0.05] animate-pulse" style={{ width: w }} />
  );
}

function DataCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] px-3 py-2 text-center">
      <div className="text-[13px] text-gray-500 uppercase font-semibold tracking-wide">{label}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}

function BollingerBar({ price, boll, color }: { price: number; boll: Bollinger; color: string }) {
  const range  = boll.upper - boll.lower;
  const pct    = Math.max(0, Math.min(1, (price - boll.lower) / range));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[13px] text-gray-500">
        <span>BB Lower ${fmt(boll.lower, 0)}</span>
        <span>Bollinger Bands (20,2)</span>
        <span>BB Upper ${fmt(boll.upper, 0)}</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/[0.06]">
        <div className="absolute top-0 bottom-0 left-1/3 right-1/3 rounded-full bg-white/[0.08]" />
        <div
          className="absolute top-0.5 bottom-0.5 w-1.5 rounded-full -translate-x-1/2 transition-all"
          style={{ left: `${pct * 100}%`, background: color }}
        />
      </div>
      <div className="text-center text-[13px] text-gray-500">
        Price at <span className="font-bold" style={{ color }}>
          {pct < 0.33 ? 'lower zone (bullish reversal expected)' : pct > 0.67 ? 'upper zone (bearish reversal expected)' : 'middle band (neutral)'}
        </span>
      </div>
    </div>
  );
}
