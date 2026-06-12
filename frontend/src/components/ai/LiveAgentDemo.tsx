'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Zap, ExternalLink, TrendingUp, TrendingDown, RefreshCw, CheckCircle2, AlertCircle, Brain } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const EXPLORER = 'https://sepolia.mantlescan.xyz';

const BOTS = [
  { tokenId: 5, name: 'AlphaPredict',   strategy: 'Momentum',       color: '#3b82f6', wallet: '0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74' },
  { tokenId: 6, name: 'MomentumMaster', strategy: 'Mean-Reversion', color: '#a855f7', wallet: '0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59' },
  { tokenId: 7, name: 'NeuralTrader',   strategy: 'Neural Net',      color: '#22c55e', wallet: '0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39' },
];

const ASSETS = ['BTC', 'ETH', 'SOL'] as const;

interface DemoResult {
  bot:       { tokenId: number; name: string; strategy: string };
  decision:  { asset: string; direction: string; confidence: number; price: number; reasoning: string };
  txHash:    string;
  explorerUrl: string;
  timestamp: number;
}

interface OnChainDecision {
  direction: string;
  confidence: number;
  timestamp: number;
  wasCorrect: boolean;
  reasoning: string;
}

interface BotDecisions {
  tokenId: number;
  name: string;
  strategy: string;
  decisions: OnChainDecision[];
}

export function LiveAgentDemo() {
  const [loading, setLoading] = useState<number | null>(null);
  const [results, setResults] = useState<DemoResult[]>([]);
  const [onChain, setOnChain] = useState<BotDecisions[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<'BTC' | 'ETH' | 'SOL'>('BTC');
  const [chainLoading, setChainLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOnChain = async () => {
    setChainLoading(true);
    try {
      const r = await fetch(`${API_URL}/agents/demo/decisions`);
      const j = await r.json();
      if (j.success) setOnChain(j.bots);
    } catch { /* ignore */ }
    finally { setChainLoading(false); }
  };

  useEffect(() => { fetchOnChain(); }, []);

  const triggerDemo = async (tokenId: number) => {
    setLoading(tokenId);
    setError(null);
    try {
      const r = await fetch(`${API_URL}/agents/demo`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ tokenId, asset: selectedAsset }),
      });
      const j = await r.json();
      if (j.success) {
        setResults(prev => [j as DemoResult, ...prev].slice(0, 10));
        setTimeout(fetchOnChain, 4000);
      } else {
        setError(j.error ?? 'Request failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Live AI Demo</h2>
            <p className="text-[10px] text-gray-500">Trigger real on-chain decisions · Verified on MantleScan</p>
          </div>
        </div>
        <button
          onClick={fetchOnChain}
          disabled={chainLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-surface border border-dark-border text-xs text-gray-400 hover:text-white hover:border-gray-500 transition disabled:opacity-40"
        >
          <RefreshCw className={`w-3 h-3 ${chainLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Asset selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-gray-500 uppercase font-semibold">Asset</span>
        {ASSETS.map(a => (
          <button
            key={a}
            onClick={() => setSelectedAsset(a)}
            className={`px-3 py-1 rounded-md text-xs font-bold transition ${
              selectedAsset === a
                ? 'bg-blue-500 text-white'
                : 'bg-dark-surface border border-dark-border text-gray-400 hover:text-white'
            }`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Bot cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BOTS.map(bot => {
          const chain = onChain.find(b => b.tokenId === bot.tokenId);
          const lastDecision = chain?.decisions?.[0];
          const isLoading = loading === bot.tokenId;

          return (
            <div
              key={bot.tokenId}
              className="rounded-xl border border-dark-border bg-dark-surface/50 p-4 flex flex-col gap-3"
              style={{ borderColor: `${bot.color}22` }}
            >
              {/* Bot header */}
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${bot.color}20`, border: `1px solid ${bot.color}40` }}
                >
                  <Bot className="w-4 h-4" style={{ color: bot.color }} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{bot.name}</div>
                  <div className="text-[10px]" style={{ color: `${bot.color}cc` }}>{bot.strategy}</div>
                </div>
                <a
                  href={`${EXPLORER}/address/${bot.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-gray-600 hover:text-blue-400 transition"
                  title="View wallet on MantleScan"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Last on-chain decision */}
              {lastDecision ? (
                <div className="rounded-lg bg-dark-bg/60 px-3 py-2 text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Last decision</span>
                    <span className={`font-bold flex items-center gap-1 ${lastDecision.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                      {lastDecision.direction === 'UP'
                        ? <TrendingUp className="w-3 h-3" />
                        : <TrendingDown className="w-3 h-3" />}
                      {lastDecision.direction}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Confidence</span>
                    <span className="text-white font-mono">{(lastDecision.confidence / 10).toFixed(1)}%</span>
                  </div>
                  <div className="text-gray-600 truncate" title={lastDecision.reasoning}>
                    {lastDecision.reasoning}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-dark-bg/60 px-3 py-2 text-[10px] text-gray-600 italic">
                  No decisions yet
                </div>
              )}

              {/* Trigger button */}
              <button
                onClick={() => triggerDemo(bot.tokenId)}
                disabled={isLoading || loading !== null}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition disabled:opacity-40"
                style={{
                  background: isLoading ? `${bot.color}30` : `${bot.color}20`,
                  border: `1px solid ${bot.color}50`,
                  color: bot.color,
                }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Submitting on-chain…
                  </>
                ) : (
                  <>
                    <Zap className="w-3 h-3" />
                    Trigger {selectedAsset} Decision
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Live result feed */}
      <AnimatePresence>
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] text-gray-500 uppercase font-semibold tracking-wide">On-chain confirmations</div>
            {results.map((r, i) => (
              <motion.div
                key={`${r.txHash}-${i}`}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-green-500/20 bg-green-500/5"
              >
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-white">{r.bot.name}</span>
                    <span className={`font-bold ${r.decision.direction === 'UP' ? 'text-green-400' : 'text-red-400'}`}>
                      {r.decision.direction}
                    </span>
                    <span className="text-gray-500">{r.decision.asset} · {(r.decision.confidence / 10).toFixed(1)}% conf</span>
                  </div>
                  <div className="text-[10px] text-gray-600 truncate">{r.decision.reasoning}</div>
                </div>
                <a
                  href={r.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded-md bg-dark-surface border border-dark-border text-[10px] text-blue-400 hover:text-blue-300 transition flex-shrink-0"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  MantleScan
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
