'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Play, ArrowUp, ArrowDown, Trophy, BarChart3, Brain, ExternalLink, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { analyzeBotDecision, BotAnalysis } from '@/lib/bot-indicators';

const AGENTS = [
  { tokenId: 5 as const, name: 'AlphaPredict',   strategy: 'Momentum',       color: '#3b82f6' },
  { tokenId: 6 as const, name: 'MomentumMaster', strategy: 'Mean-Reversion', color: '#a855f7' },
  { tokenId: 7 as const, name: 'NeuralTrader',   strategy: 'Neural Net',     color: '#22c55e' },
];

const ASSETS = ['BTC', 'ETH', 'SOL'] as const;

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function ShowdownPage() {
  const [agentA, setAgentA] = useState(0); // index into AGENTS
  const [agentB, setAgentB] = useState(2);
  const [asset, setAsset]   = useState<typeof ASSETS[number]>('BTC');
  const [running, setRunning] = useState(false);
  const [resultA, setResultA] = useState<BotAnalysis | null>(null);
  const [resultB, setResultB] = useState<BotAnalysis | null>(null);

  const runShowdown = useCallback(async () => {
    setRunning(true);
    setResultA(null);
    setResultB(null);

    const a = AGENTS[agentA];
    const b = AGENTS[agentB];

    // Run both analyses in parallel (same market data fetch)
    const [rA, rB] = await Promise.all([
      analyzeBotDecision(a.tokenId, asset, a.strategy),
      analyzeBotDecision(b.tokenId, asset, b.strategy),
    ]);

    setResultA(rA);
    setResultB(rB);
    setRunning(false);
  }, [agentA, agentB, asset]);

  const a = AGENTS[agentA];
  const b = AGENTS[agentB];

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#06060a]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white transition text-sm">← Back</Link>
          <div className="w-px h-5 bg-gray-800" />
          <Swords className="w-5 h-5 text-orange-400" />
          <h1 className="text-lg font-black">Strategy Showdown</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
        {/* Selector */}
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black">Compare AI Strategies Head-to-Head</h2>
          <p className="text-sm text-gray-500">Pick two agents, one asset — see how different strategies interpret the same market data</p>
        </div>

        {/* Config row */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {/* Agent A selector */}
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider text-center">Agent A</div>
            <div className="flex gap-1">
              {AGENTS.map((ag, i) => (
                <button
                  key={ag.tokenId}
                  onClick={() => { if (i !== agentB) setAgentA(i); }}
                  disabled={i === agentB}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    agentA === i
                      ? 'text-white'
                      : i === agentB
                        ? 'opacity-30 cursor-not-allowed border-gray-800 text-gray-600'
                        : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                  style={agentA === i ? { borderColor: `${ag.color}60`, background: `${ag.color}20`, color: ag.color } : {}}
                >
                  {ag.name}
                </button>
              ))}
            </div>
          </div>

          <div className="text-2xl font-black text-gray-600">VS</div>

          {/* Agent B selector */}
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider text-center">Agent B</div>
            <div className="flex gap-1">
              {AGENTS.map((ag, i) => (
                <button
                  key={ag.tokenId}
                  onClick={() => { if (i !== agentA) setAgentB(i); }}
                  disabled={i === agentA}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    agentB === i
                      ? 'text-white'
                      : i === agentA
                        ? 'opacity-30 cursor-not-allowed border-gray-800 text-gray-600'
                        : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                  style={agentB === i ? { borderColor: `${ag.color}60`, background: `${ag.color}20`, color: ag.color } : {}}
                >
                  {ag.name}
                </button>
              ))}
            </div>
          </div>

          {/* Asset */}
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider text-center">Asset</div>
            <div className="flex gap-1">
              {ASSETS.map(a => (
                <button
                  key={a}
                  onClick={() => setAsset(a)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    asset === a
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                      : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {a}/USDT
                </button>
              ))}
            </div>
          </div>

          {/* Go */}
          <button
            onClick={runShowdown}
            disabled={running}
            className="px-6 py-3 rounded-xl font-bold text-sm bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30 disabled:opacity-50 transition flex items-center gap-2"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
            {running ? 'Analyzing...' : 'Run Showdown'}
          </button>
        </div>

        {/* Results — side by side */}
        {(resultA || resultB || running) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AgentResult agent={a} result={resultA} loading={running && !resultA} />
            <AgentResult agent={b} result={resultB} loading={running && !resultB} />
          </div>
        )}

        {/* Verdict */}
        {resultA && resultB && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-6 text-center space-y-3"
          >
            <Trophy className="w-8 h-8 text-orange-400 mx-auto" />
            <h3 className="text-xl font-black">
              {resultA.decision.direction === resultB.decision.direction ? (
                <>Both agents agree: <span className={resultA.decision.direction === 'UP' ? 'text-green-400' : 'text-red-400'}>{resultA.decision.direction}</span></>
              ) : (
                <>Agents disagree!</>
              )}
            </h3>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="text-center">
                <div className="font-bold" style={{ color: a.color }}>{a.name}</div>
                <div className={`text-lg font-black ${resultA.decision.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                  {resultA.decision.direction} ({(resultA.decision.confidence / 10).toFixed(1)}%)
                </div>
              </div>
              <div className="text-2xl text-gray-600">vs</div>
              <div className="text-center">
                <div className="font-bold" style={{ color: b.color }}>{b.name}</div>
                <div className={`text-lg font-black ${resultB.decision.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                  {resultB.decision.direction} ({(resultB.decision.confidence / 10).toFixed(1)}%)
                </div>
              </div>
            </div>
            {resultA.decision.confidence !== resultB.decision.confidence && (
              <p className="text-xs text-gray-500">
                Higher confidence:{' '}
                <span style={{ color: resultA.decision.confidence > resultB.decision.confidence ? a.color : b.color }}>
                  {resultA.decision.confidence > resultB.decision.confidence ? a.name : b.name}
                </span>
                {' '}({(Math.max(resultA.decision.confidence, resultB.decision.confidence) / 10).toFixed(1)}%)
              </p>
            )}
            <p className="text-[10px] text-gray-600">
              Both analyses used the same live Bybit {asset}/USDT data — different strategies, different conclusions
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

// ── Agent Result Panel ────────────────────────────────────────────────────────
function AgentResult({
  agent,
  result,
  loading,
}: {
  agent: typeof AGENTS[number];
  result: BotAnalysis | null;
  loading: boolean;
}) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: `${agent.color}30`, background: `${agent.color}05` }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: `${agent.color}20` }}>
        <div className="w-3 h-3 rounded-full" style={{ background: agent.color }} />
        <span className="text-sm font-bold text-white">{agent.name}</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full border" style={{ color: agent.color, borderColor: `${agent.color}40` }}>
          {agent.strategy}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: agent.color }} />
            Analyzing {agent.strategy}...
          </div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Market data */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2 py-1.5 text-center">
                <div className="text-[9px] text-gray-500">Price</div>
                <div className="text-xs font-bold" style={{ color: agent.color }}>${fmt(result.market.price, result.market.asset === 'BTC' ? 0 : 2)}</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2 py-1.5 text-center">
                <div className="text-[9px] text-gray-500">RSI</div>
                <div className={`text-xs font-bold ${(result.indicators.rsi ?? 50) > 70 ? 'text-red-400' : (result.indicators.rsi ?? 50) < 30 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {result.indicators.rsi ?? '—'}
                </div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2 py-1.5 text-center">
                <div className="text-[9px] text-gray-500">24h</div>
                <div className={`text-xs font-bold ${result.market.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.market.change24h >= 0 ? '+' : ''}{(result.market.change24h * 100).toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Signals */}
            <div className="space-y-1">
              <div className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold">{agent.strategy} Signals</div>
              {result.signals.map((sig, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px]">
                  <span className={`w-3 h-3 rounded-full flex items-center justify-center text-[8px] shrink-0 ${sig.bullish ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {sig.bullish ? '↑' : '↓'}
                  </span>
                  <span className="text-gray-400">{sig.label}</span>
                </div>
              ))}
            </div>

            {/* Decision */}
            <div className="rounded-xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: `${agent.color}40`, background: `${agent.color}0e` }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${agent.color}25`, border: `2px solid ${agent.color}60` }}>
                {result.decision.direction === 'UP'
                  ? <ArrowUp className="w-5 h-5" style={{ color: agent.color }} />
                  : <ArrowDown className="w-5 h-5" style={{ color: agent.color }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black" style={{ color: agent.color }}>{result.decision.direction}</span>
                  <span className="text-xs text-gray-500">conf: <span className="text-white font-bold">{(result.decision.confidence / 10).toFixed(1)}%</span></span>
                </div>
                <div className="text-[10px] text-gray-500 truncate">{result.decision.reasoning}</div>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>Confidence</span>
                <span>{(result.decision.confidence / 10).toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: agent.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(result.decision.confidence / 10, 100)}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
