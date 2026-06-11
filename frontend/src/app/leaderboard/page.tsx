'use client';

import { useState, useEffect, useCallback } from 'react';
import { providers, Contract } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, Clock, ExternalLink, RefreshCw, Activity, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';

// ── Constants ─────────────────────────────────────────────────────────────────
const RPC_URL  = 'https://rpc.sepolia.mantle.xyz';
const NFT_ADDR = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';
const EXPLORER = 'https://sepolia.mantlescan.xyz';

const AGENT_NFT_ABI = [
  'function agentProfiles(uint256) view returns (string name, string version, uint256 createdAt, uint256 totalDecisions, uint256 correctDecisions, uint256 totalPnL, bool isActive)',
  'function getAgentStats(uint256 tokenId) view returns (uint256 totalDecisions, uint256 correctDecisions, uint256 totalPnL, uint256 winRate, bool isActive)',
  'function getRecentDecisions(uint256 tokenId, uint256 limit) view returns (tuple(string direction, uint256 confidence, uint256 stake, uint256 timestamp, bool wasCorrect, int256 pnl, string reasoning, bytes32 decisionHash)[])',
];

const AGENTS = [
  { tokenId: 5, name: 'AlphaPredict',   strategy: 'Momentum',       color: '#3b82f6', wallet: '0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74' },
  { tokenId: 6, name: 'MomentumMaster', strategy: 'Mean-Reversion', color: '#a855f7', wallet: '0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59' },
  { tokenId: 7, name: 'NeuralTrader',   strategy: 'Neural Net',     color: '#22c55e', wallet: '0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39' },
];

interface AgentStats {
  tokenId: number;
  name: string;
  strategy: string;
  color: string;
  wallet: string;
  totalDecisions: number;
  correctDecisions: number;
  winRate: number;
  totalPnL: number;
  isActive: boolean;
}

interface Decision {
  direction: string;
  confidence: number;
  stake: number;
  timestamp: number;
  wasCorrect: boolean;
  pnl: number;
  reasoning: string;
}

// ── Provider (singleton) ──────────────────────────────────────────────────────
const getContract = () => {
  const provider = new providers.JsonRpcProvider(RPC_URL);
  return new Contract(NFT_ADDR, AGENT_NFT_ABI, provider);
};

export default function LeaderboardPage() {
  const [agents, setAgents]         = useState<AgentStats[]>([]);
  const [decisions, setDecisions]   = useState<Record<number, Decision[]>>({});
  const [loading, setLoading]       = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      // Fetch all decisions first (workaround: contract recordDecision doesn't increment totalDecisions)
      const allResults = await Promise.all(AGENTS.map(async (a) => {
        try {
          const c = getContract();
          const raw = await c.getRecentDecisions(a.tokenId, 500);
          const decs = raw.map((d: any) => ({
            direction:  d.direction,
            confidence: Number(d.confidence),
            stake:      Number(d.stake),
            timestamp:  Number(d.timestamp),
            wasCorrect: d.wasCorrect,
            pnl:        Number(d.pnl),
            reasoning:  d.reasoning,
          }));
          const total   = decs.length;
          const correct = decs.filter((d: Decision) => d.wasCorrect).length;
          const totalPnL = decs.reduce((s: number, d: Decision) => s + d.pnl, 0);
          return {
            agent: {
              ...a,
              totalDecisions: total,
              correctDecisions: correct,
              winRate: total > 0 ? (correct / total) * 100 : 0,
              totalPnL,
              isActive: total > 0,
            },
            decisions: decs,
          };
        } catch {
          return {
            agent: { ...a, totalDecisions: 0, correctDecisions: 0, winRate: 0, totalPnL: 0, isActive: false },
            decisions: [],
          };
        }
      }));

      const agentStats = allResults.map(r => r.agent);
      agentStats.sort((a, b) => b.winRate - a.winRate || b.totalDecisions - a.totalDecisions);
      setAgents(agentStats);

      const decMap: Record<number, Decision[]> = {};
      allResults.forEach(r => { decMap[r.agent.tokenId] = r.decisions; });
      setDecisions(decMap);

      setLastUpdate(new Date());
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + auto-refresh every 60s
  useEffect(() => {
    fetchAll();
    if (!autoRefresh) return;
    const id = setInterval(fetchAll, 60_000);
    return () => clearInterval(id);
  }, [fetchAll, autoRefresh]);

  const totalDecisionsAll = agents.reduce((s, a) => s + a.totalDecisions, 0);
  const totalCorrectAll   = agents.reduce((s, a) => s + a.correctDecisions, 0);
  const overallWinRate    = totalDecisionsAll > 0 ? (totalCorrectAll / totalDecisionsAll) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#06060a]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-white transition text-sm">
              ← Back
            </Link>
            <div className="w-px h-5 bg-gray-800" />
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h1 className="text-lg font-black">On-Chain Agent Leaderboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Updated {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                autoRefresh
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : 'border-gray-700 bg-gray-800 text-gray-400'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => { setLoading(true); fetchAll(); }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
            >
              Refresh Now
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">

        {/* ── Testnet notice ─────────────────────────────────────────────── */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300">
          <Activity className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <span className="font-bold">Mantle Sepolia Testnet — AI decisions are recorded on-chain in real time.</span>
            <span className="text-amber-400/70 ml-2">
              Win/Loss outcomes are pending resolution (oracle price comparison happens at round close). Decisions count is live.
            </span>
          </div>
        </div>

        {/* ── Global Stats Banner ──────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center">
            <div className="text-3xl font-black text-yellow-400">{totalDecisionsAll.toLocaleString()}</div>
            <div className="text-xs text-gray-400 mt-1">Total On-Chain Decisions</div>
          </div>
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 text-center">
            <div className="text-3xl font-black text-purple-400">{agents.filter(a => a.totalDecisions > 0).length}/3</div>
            <div className="text-xs text-gray-400 mt-1">Agents Active On-Chain</div>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-center">
            <div className="text-3xl font-black text-blue-400">{agents.filter(a => a.isActive).length}/3</div>
            <div className="text-xs text-gray-400 mt-1">Agents Online</div>
          </div>
        </div>

        {/* ── Tournament Table ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800/50 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold">Tournament Rankings</h2>
            <span className="text-xs text-gray-500 ml-2">Data read directly from AgentNFT contract</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex items-center gap-3 text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm">Reading on-chain data...</span>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/50">
              {agents.map((agent, rank) => {
                const decs = decisions[agent.tokenId] || [];
                const last5 = decs.slice(-5);
                return (
                  <motion.div
                    key={agent.tokenId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rank * 0.1 }}
                    className="p-5 hover:bg-gray-800/20 transition"
                  >
                    <div className="flex items-center gap-5">
                      {/* Rank badge */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                        rank === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 ring-2 ring-yellow-500/20'
                        : rank === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/40'
                        : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                      }`}>
                        #{rank + 1}
                      </div>

                      {/* Agent info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: agent.color }} />
                          <span className="font-bold text-white">{agent.name}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full border" style={{
                            color: agent.color,
                            borderColor: `${agent.color}40`,
                            background: `${agent.color}10`,
                          }}>
                            {agent.strategy}
                          </span>
                          <span className="text-[10px] text-gray-600">NFT #{agent.tokenId}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <a
                            href={`${EXPLORER}/address/${agent.wallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            {agent.wallet.slice(0, 6)}...{agent.wallet.slice(-4)}
                          </a>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-center">
                          <div className="text-xl font-black text-white">
                            {agent.totalDecisions}
                          </div>
                          <div className="text-[10px] text-gray-500">On-Chain Txs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            Pending
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1">Win Rate</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-xl font-black ${agent.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {agent.totalPnL >= 0 ? '+' : ''}{agent.totalPnL}
                          </div>
                          <div className="text-[10px] text-gray-500">PnL (bps)</div>
                        </div>

                        {/* Last 5 decisions streak */}
                        <div className="flex items-center gap-1">
                          {last5.length > 0 ? last5.map((d, i) => (
                            <div
                              key={i}
                              className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${
                                d.wasCorrect
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
                              }`}
                              title={`${d.direction} ${d.wasCorrect ? '✓' : '✗'} ${d.pnl > 0 ? '+' : ''}${d.pnl}bps`}
                            >
                              {d.wasCorrect ? '✓' : '✗'}
                            </div>
                          )) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                          <span className="text-[9px] text-gray-600 ml-1">last 5</span>
                        </div>
                      </div>
                    </div>

                    {/* Win rate bar */}
                    <div className="mt-3 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: agent.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(agent.winRate, 100)}%` }}
                        transition={{ duration: 1, delay: rank * 0.15 }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Decision History Timeline ─────────────────────────────────── */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800/50 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold">Recent On-Chain Decisions</h2>
            <span className="text-xs text-gray-500 ml-2">from getRecentDecisions()</span>
          </div>

          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-800/30">
            {(() => {
              // Merge all decisions across agents, sort by timestamp desc
              const all: (Decision & { tokenId: number; name: string; color: string })[] = [];
              Object.entries(decisions).forEach(([tid, decs]) => {
                const agent = AGENTS.find(a => a.tokenId === Number(tid));
                if (!agent) return;
                decs.forEach(d => all.push({ ...d, tokenId: agent.tokenId, name: agent.name, color: agent.color }));
              });
              all.sort((a, b) => b.timestamp - a.timestamp);
              return all.slice(0, 30);
            })().map((d, i) => (
              <motion.div
                key={`${d.tokenId}-${d.timestamp}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="px-5 py-3 flex items-center gap-4 hover:bg-gray-800/10 transition"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-xs font-bold w-28 shrink-0" style={{ color: d.color }}>{d.name}</span>
                <span className={`text-xs font-bold w-12 shrink-0 flex items-center gap-1 ${
                  d.direction === 'UP' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {d.direction === 'UP' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {d.direction}
                </span>
                <span className="text-[10px] text-gray-500 w-20 shrink-0">
                  conf: {(d.confidence / 10).toFixed(1)}%
                </span>
                <span className={`text-xs font-bold w-16 shrink-0 ${d.wasCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {d.wasCorrect ? '✓ Correct' : '✗ Wrong'}
                </span>
                <span className={`text-xs w-16 shrink-0 ${d.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {d.pnl >= 0 ? '+' : ''}{d.pnl} bps
                </span>
                <span className="text-[10px] text-gray-600 flex-1 truncate" title={d.reasoning}>
                  {d.reasoning}
                </span>
                <span className="text-[10px] text-gray-600 shrink-0">
                  {d.timestamp > 0 ? new Date(d.timestamp * 1000).toLocaleTimeString() : '—'}
                </span>
              </motion.div>
            ))}
            {Object.values(decisions).every(d => d.length === 0) && !loading && (
              <div className="py-12 text-center text-gray-600 text-sm">
                No decisions recorded yet. Run an agent analysis to create the first one!
              </div>
            )}
          </div>
        </div>

        {/* ── Correctness Growth Chart (CSS-only) ──────────────────────── */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800/50 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <h2 className="text-sm font-bold">Cumulative Correct Decisions</h2>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-3 h-40">
              {agents.map(agent => {
                const decs = decisions[agent.tokenId] || [];
                // Build cumulative correct over time
                const maxDecisions = Math.max(...agents.map(a => (decisions[a.tokenId] || []).length), 1);
                let cumCorrect = 0;
                const points = decs.map((d, i) => {
                  if (d.wasCorrect) cumCorrect++;
                  return cumCorrect;
                });
                const maxCorrect = Math.max(...agents.map(a => {
                  const dd = decisions[a.tokenId] || [];
                  return dd.filter(d => d.wasCorrect).length;
                }), 1);

                return (
                  <div key={agent.tokenId} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full flex items-end justify-center gap-px h-32">
                      {decs.length === 0 ? (
                        <div className="w-full h-1 rounded" style={{ background: `${agent.color}30` }} />
                      ) : (
                        decs.map((d, i) => {
                          const barHeight = Math.max(2, (points[i] / maxCorrect) * 100);
                          return (
                            <motion.div
                              key={i}
                              className="rounded-t"
                              style={{
                                background: d.wasCorrect ? agent.color : `${agent.color}30`,
                                width: `${Math.max(2, 100 / Math.max(decs.length, 1))}%`,
                                minWidth: '2px',
                              }}
                              initial={{ height: 0 }}
                              animate={{ height: `${barHeight}%` }}
                              transition={{ delay: i * 0.02, duration: 0.3 }}
                            />
                          );
                        })
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-bold" style={{ color: agent.color }}>
                        {agent.correctDecisions}
                      </div>
                      <div className="text-[10px] text-gray-500">{agent.name}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Contract info footer ─────────────────────────────────────── */}
        <div className="text-center text-xs text-gray-600 space-y-1 py-4">
          <p>
            All data read directly from{' '}
            <a href={`${EXPLORER}/address/${NFT_ADDR}`} target="_blank" className="text-blue-400 hover:text-blue-300">
              AgentNFT ({NFT_ADDR.slice(0, 8)}...{NFT_ADDR.slice(-6)})
            </a>
            {' '}on Mantle Sepolia
          </p>
          <p>No backend required — pure on-chain reads via ethers.js</p>
        </div>

      </main>
    </div>
  );
}
