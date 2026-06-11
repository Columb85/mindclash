'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, ExternalLink, ChevronRight, Cpu, GitBranch, Shield } from 'lucide-react';
import { BotThinkingPanel } from '@/components/ai/BotThinkingPanel';

const BOTS = [
  {
    tokenId:  5,
    name:     'AlphaPredict',
    strategy: 'Momentum',
    color:    '#3b82f6',
    wallet:   '0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74',
    desc:     'Trend-following: trades in the direction of 24h momentum. Goes UP when price is above moving averages and momentum is positive.',
  },
  {
    tokenId:  6,
    name:     'MomentumMaster',
    strategy: 'Mean-Reversion',
    color:    '#a855f7',
    wallet:   '0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59',
    desc:     'Contrarian: fades overextended moves. Shorts when RSI is overbought, buys when oversold. Uses Bollinger Band extremes.',
  },
  {
    tokenId:  7,
    name:     'NeuralTrader',
    strategy: 'Neural Net',
    color:    '#22c55e',
    wallet:   '0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39',
    desc:     'Multi-factor weighted model: SMA crossover, RSI, momentum, and Bollinger position combined via learned weights.',
  },
];

const EXPLORER = 'https://sepolia.mantlescan.xyz';
const NFT_ADDR  = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';

const ASSETS = ['BTC', 'ETH', 'SOL'] as const;

export default function DemoPage() {
  const [selectedAsset, setSelectedAsset] = useState<'BTC'|'ETH'|'SOL'>('BTC');

  return (
    <div className="min-h-screen bg-dark-bg text-white">
      {/* ── Hero ── */}
      <div className="border-b border-dark-border bg-gradient-to-b from-dark-surface/40 to-transparent">
        <div className="max-w-5xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
            <Cpu className="w-3.5 h-3.5" />
            ERC-8004 AI Agents · Mantle Sepolia · Judge Demo
          </div>
          <h1 className="text-3xl font-black text-white mb-3">
            Watch AI Agents Think
          </h1>
          <p className="text-gray-400 text-sm max-w-2xl leading-relaxed">
            Each agent fetches live market data, computes technical indicators (RSI, SMA, Bollinger Bands),
            applies its strategy, and submits a verifiable decision on-chain via{' '}
            <code className="text-blue-400 font-mono text-xs">AgentNFT.recordDecision()</code>.
            Every step is transparent and auditable.
          </p>

          {/* How it works */}
          <div className="flex flex-wrap items-center gap-2 mt-6 text-xs text-gray-500">
            {['Fetch klines (Bybit REST)', 'RSI · SMA · Bollinger', 'Strategy signal', 'Weighted decision', 'recordDecision() on Mantle', 'resolveDecision() on resolve'].map((step, i, arr) => (
              <span key={i} className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-md bg-dark-surface border border-dark-border text-gray-400">{step}</span>
                {i < arr.length - 1 && <ChevronRight className="w-3 h-3 text-gray-700" />}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">

        {/* ── Asset selector ── */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide">Analyze asset</span>
          {ASSETS.map(a => (
            <button
              key={a}
              onClick={() => setSelectedAsset(a)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition ${
                selectedAsset === a
                  ? 'bg-blue-500 text-white'
                  : 'bg-dark-surface border border-dark-border text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {a}/USDT
            </button>
          ))}
        </div>

        {/* ── Bot cards + thinking panels ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {BOTS.map((bot, i) => (
            <motion.div
              key={bot.tokenId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="space-y-3"
            >
              {/* Strategy description card */}
              <div
                className="rounded-xl border p-4 space-y-3"
                style={{ borderColor: `${bot.color}25`, background: `${bot.color}08` }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${bot.color}22`, border: `1px solid ${bot.color}44` }}
                  >
                    <Bot className="w-4 h-4" style={{ color: bot.color }} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{bot.name}</div>
                    <div className="text-[10px]" style={{ color: `${bot.color}cc` }}>ERC-8004 · Token #{bot.tokenId}</div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{bot.desc}</p>
                <div className="flex gap-2">
                  <a
                    href={`${EXPLORER}/address/${bot.wallet}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition"
                  >
                    <ExternalLink className="w-2.5 h-2.5" /> Wallet
                  </a>
                  <span className="text-gray-700">·</span>
                  <a
                    href={`${EXPLORER}/token/${NFT_ADDR}?a=${bot.tokenId}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-purple-400 hover:text-purple-300 transition"
                  >
                    <Shield className="w-2.5 h-2.5" /> NFT Identity
                  </a>
                  <span className="text-gray-700">·</span>
                  <a
                    href={`${EXPLORER}/address/${NFT_ADDR}#events`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 transition"
                  >
                    <GitBranch className="w-2.5 h-2.5" /> All decisions
                  </a>
                </div>
              </div>

              {/* The thinking panel */}
              <BotThinkingPanel
                tokenId={bot.tokenId}
                name={bot.name}
                strategy={bot.strategy}
                color={bot.color}
                asset={selectedAsset}
              />
            </motion.div>
          ))}
        </div>

        {/* ── Resolution explanation ── */}
        <div className="rounded-2xl border border-dark-border bg-dark-surface/30 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-yellow-400" />
            <h2 className="text-sm font-bold text-white">How resolution works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-400">
            <div className="space-y-1">
              <div className="font-semibold text-white">1. Round ends</div>
              <p>When a prediction round closes, the final price is locked. The platform compares <code className="text-blue-300">startPrice</code> vs <code className="text-blue-300">endPrice</code>.</p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-white">2. Win/Loss determined</div>
              <p>If the bot predicted UP and price increased → <code className="text-green-400">wasCorrect = true</code>. PnL is calculated based on pool share.</p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-white">3. resolveDecision() on-chain</div>
              <p>The bot calls <code className="text-purple-400">AgentNFT.resolveDecision(tokenId, index, wasCorrect, pnl)</code>. Win rate and PnL update permanently on-chain.</p>
            </div>
          </div>
          <a
            href={`${EXPLORER}/address/${NFT_ADDR}#writeContract`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition"
          >
            <ExternalLink className="w-3 h-3" />
            Verify AgentNFT contract on MantleScan
          </a>
        </div>
      </div>
    </div>
  );
}
