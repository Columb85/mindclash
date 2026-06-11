'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot, Sparkles, ExternalLink, Loader2, CheckCircle2,
  Cpu, BarChart3, Brain, Zap, Shield, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useCreateAgent } from '@/hooks/useAgentContract';

const EXPLORER = 'https://sepolia.mantlescan.xyz';

const STRATEGIES = [
  {
    id: 'momentum',
    name: 'Momentum',
    icon: Zap,
    color: '#3b82f6',
    description: 'Follows trends — buys strength, sells weakness. Best in trending markets.',
    weights: 'Price trend 35%, SMA cross 25%, Volume 15%, RSI 15%, BB 10%',
  },
  {
    id: 'mean-reversion',
    name: 'Mean-Reversion',
    icon: BarChart3,
    color: '#a855f7',
    description: 'Fades extremes — buys dips, sells rallies. Best in range-bound markets.',
    weights: 'RSI 30%, Bollinger 30%, SMA 15%, Volume 15%, Momentum -10%',
  },
  {
    id: 'neural',
    name: 'Neural Net',
    icon: Brain,
    color: '#22c55e',
    description: 'Weighted composite of all signals. Balanced, adaptive approach.',
    weights: 'All signals equally weighted at 20% each',
  },
] as const;

type Phase = 'design' | 'minting' | 'success';

export default function CreateAgentPage() {
  const { address, isConnected } = useAccount();
  const { createAgent, isLoading, isSuccess, txHash } = useCreateAgent();

  const [name, setName]           = useState('');
  const [strategyId, setStrategyId] = useState<string>('momentum');
  const [version, setVersion]     = useState('1.0.0');
  const [phase, setPhase]         = useState<Phase>('design');

  const strategy = STRATEGIES.find(s => s.id === strategyId) ?? STRATEGIES[0];
  const StrategyIcon = strategy.icon;

  const canMint = isConnected && name.trim().length >= 3 && name.trim().length <= 32;

  const handleMint = () => {
    if (!canMint || !address) return;

    const tokenURI = JSON.stringify({
      name: name.trim(),
      strategy: strategyId,
      version,
      creator: address,
      createdAt: new Date().toISOString(),
      description: `MindClash AI Agent — ${strategy.name} strategy`,
    });

    setPhase('minting');
    createAgent(address, name.trim(), version, tokenURI);
  };

  // Track success
  useEffect(() => {
    if (isSuccess && txHash) {
      setPhase('success');
    }
  }, [isSuccess, txHash]);

  return (
    <div className="min-h-screen bg-[#06060a] text-white">
      {/* Header */}
      <header className="border-b border-gray-800/50 bg-[#06060a]/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-500 hover:text-white transition text-sm">← Back</Link>
          <div className="w-px h-5 bg-gray-800" />
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h1 className="text-lg font-black">Agent Creator</h1>
          <span className="text-[10px] text-gray-500 font-mono">ERC-8004 NFT Mint</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <AnimatePresence mode="wait">

          {/* ════ DESIGN ═══════════════════════════════════════════════════════ */}
          {phase === 'design' && (
            <motion.div key="design" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="space-y-8">

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black">Design Your AI Agent</h2>
                <p className="text-sm text-gray-500">
                  Create a unique on-chain AI agent with its own identity, strategy, and NFT. Mint as ERC-8004 on Mantle.
                </p>
              </div>

              {/* Wallet status */}
              {!isConnected && (
                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 text-center">
                  <div className="text-sm text-yellow-400 font-bold">Connect your wallet to mint</div>
                  <div className="text-[10px] text-gray-500 mt-1">Your wallet address will be the agent&apos;s identity on-chain</div>
                </div>
              )}

              {/* Agent Name */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Agent Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. AlphaHunter, TrendSniper..."
                  maxLength={32}
                  className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition text-sm"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>{name.length < 3 ? 'Min 3 characters' : '✓ Valid'}</span>
                  <span>{name.length}/32</span>
                </div>
              </div>

              {/* Strategy selector */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Trading Strategy</label>
                <div className="space-y-3">
                  {STRATEGIES.map(s => {
                    const Icon = s.icon;
                    const isSelected = strategyId === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setStrategyId(s.id)}
                        className={`w-full rounded-xl border p-4 text-left transition ${isSelected ? 'ring-1' : ''}`}
                        style={{
                          borderColor: isSelected ? `${s.color}60` : 'rgba(255,255,255,0.06)',
                          background:  isSelected ? `${s.color}08` : 'rgba(255,255,255,0.02)',
                          ...(isSelected ? { boxShadow: `0 0 12px ${s.color}10` } : {}),
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${s.color}15` }}>
                            <Icon className="w-5 h-5" style={{ color: s.color }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold" style={{ color: isSelected ? s.color : '#d1d5db' }}>{s.name}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5" style={{ color: s.color }} />}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                            <div className="text-[10px] text-gray-700 mt-1 font-mono">{s.weights}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Version */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Version</label>
                <input
                  type="text"
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500/50 transition"
                />
              </div>

              {/* Preview card */}
              <div className="rounded-2xl border-2 p-6 text-center space-y-3" style={{ borderColor: `${strategy.color}30`, background: `${strategy.color}05` }}>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Preview</div>
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `${strategy.color}15`, border: `2px solid ${strategy.color}40` }}>
                  <Bot className="w-8 h-8" style={{ color: strategy.color }} />
                </div>
                <div className="text-lg font-black" style={{ color: strategy.color }}>
                  {name.trim() || 'Your Agent'}
                </div>
                <div className="text-xs text-gray-500">{strategy.name} • v{version}</div>
                {isConnected && address && (
                  <div className="text-[10px] text-gray-700 font-mono">{address.slice(0, 6)}...{address.slice(-4)}</div>
                )}
              </div>

              {/* Mint button */}
              <button
                onClick={handleMint}
                disabled={!canMint}
                className="w-full py-4 rounded-xl font-black text-lg transition flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: `${strategy.color}20`,
                  borderWidth: 1,
                  borderColor: `${strategy.color}40`,
                  color: strategy.color,
                }}
              >
                <Sparkles className="w-5 h-5" />
                Mint Agent NFT on Mantle
              </button>

              <div className="text-center text-[10px] text-gray-600 space-y-1">
                <p>Mints an ERC-8004 Agent NFT on Mantle Sepolia. Your wallet signs the transaction.</p>
                <p>Gas fee: ~0.001 MNT. The agent identity is permanent and verifiable on-chain.</p>
              </div>
            </motion.div>
          )}

          {/* ════ MINTING ══════════════════════════════════════════════════════ */}
          {phase === 'minting' && (
            <motion.div key="minting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: `${strategy.color}20`, border: `2px solid ${strategy.color}50` }}>
                  <Bot className="w-10 h-10" style={{ color: strategy.color }} />
                </div>
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin absolute -top-2 -right-2" />
              </div>
              <div className="text-center space-y-1">
                <div className="text-lg font-bold">Minting {name.trim()}...</div>
                <div className="text-xs text-gray-500">Confirm the transaction in your wallet</div>
                <div className="text-[10px] text-gray-700 font-mono mt-2">AgentNFT.createAgent({name.trim()}, {strategy.name})</div>
              </div>

              {/* If user rejects or it fails, allow retry */}
              {!isLoading && !isSuccess && (
                <button onClick={() => setPhase('design')}
                  className="text-xs text-gray-500 hover:text-white transition">
                  ← Back to editor
                </button>
              )}
            </motion.div>
          )}

          {/* ════ SUCCESS ══════════════════════════════════════════════════════ */}
          {phase === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="space-y-6 text-center py-8">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                <div className="w-20 h-20 rounded-2xl mx-auto flex items-center justify-center" style={{ background: `${strategy.color}20`, border: `2px solid ${strategy.color}50` }}>
                  <CheckCircle2 className="w-10 h-10" style={{ color: strategy.color }} />
                </div>
              </motion.div>

              <h2 className="text-2xl font-black" style={{ color: strategy.color }}>{name.trim()} is Live!</h2>
              <p className="text-sm text-gray-500">Your AI agent has been minted as an ERC-8004 NFT on Mantle Sepolia.</p>

              {/* Agent card */}
              <div className="rounded-2xl border-2 p-6 max-w-sm mx-auto space-y-3" style={{ borderColor: `${strategy.color}30`, background: `${strategy.color}05` }}>
                <Bot className="w-12 h-12 mx-auto" style={{ color: strategy.color }} />
                <div className="text-lg font-black" style={{ color: strategy.color }}>{name.trim()}</div>
                <div className="text-xs text-gray-500">{strategy.name} Strategy • v{version}</div>
                <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600">
                  <span>0 decisions</span>
                  <span>•</span>
                  <span>0% win rate</span>
                  <span>•</span>
                  <span>Just born</span>
                </div>
              </div>

              {txHash && (
                <a
                  href={`${EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on MantleScan: {txHash.slice(0, 10)}...
                </a>
              )}

              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                <Shield className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400">Agent Creator Badge Earned</span>
              </div>

              <div className="flex gap-3 justify-center">
                <Link href="/duel"
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition text-sm">
                  Challenge AI <ChevronRight className="w-4 h-4" />
                </Link>
                <button onClick={() => { setPhase('design'); setName(''); }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold border border-gray-700 text-gray-300 hover:bg-gray-800/50 transition text-sm">
                  <Sparkles className="w-4 h-4" /> Create Another
                </button>
              </div>

              <p className="text-[10px] text-gray-600">
                Your agent&apos;s identity is permanently recorded on Mantle blockchain. All future decisions will be linked to this NFT.
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
