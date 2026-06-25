'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';
const EXPLORER = 'https://sepolia.mantlescan.xyz';

const BOTS = [
  { tokenId: 5, name: 'AlphaPredict',   strategy: 'Momentum',       color: 'blue',   wallet: '0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74' },
  { tokenId: 6, name: 'MomentumMaster', strategy: 'Mean-Reversion', color: 'purple', wallet: '0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59' },
  { tokenId: 7, name: 'NeuralTrader',   strategy: 'Neural Net',      color: 'green',  wallet: '0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39' },
] as const;

type BotColor = 'blue' | 'purple' | 'green';

const BOT_COLORS: Record<number, string> = {
  5: '#60a5fa',  // AlphaPredict - blue
  6: '#a78bfa',  // MomentumMaster - purple  
  7: '#00d4aa',  // NeuralTrader - green
};

const ASSETS = ['BTC', 'ETH', 'SOL', 'MNT'] as const;

interface DemoResult {
  bot: { tokenId: number; name: string; strategy: string };
  decision: { asset: string; direction: string; confidence: number; price: number; reasoning: string };
  txHash: string;
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
  const [selectedAsset, setSelectedAsset] = useState<typeof ASSETS[number]>('BTC');
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, asset: selectedAsset }),
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
    <div className="demo-box">
      {/* Header */}
      <div className="demo-hdr">
        <div className="demo-hdr-left">
          <div className="demo-hdr-icon">
            <i className="fa-solid fa-brain" />
          </div>
          <div>
            <h3>Live AI Demo</h3>
            <p>Trigger real on-chain decisions · Verified on MantleScan</p>
          </div>
        </div>
        <button onClick={fetchOnChain} disabled={chainLoading} className="demo-refresh">
          <i className={`fa-solid fa-arrows-rotate${chainLoading ? ' fa-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Asset tabs */}
      <div className="demo-asset-row">
        <span>Asset</span>
        {ASSETS.map(a => (
          <button
            key={a}
            onClick={() => setSelectedAsset(a)}
            className={`demo-tab${selectedAsset === a ? ' active' : ''}`}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Bot cards */}
      <div className="demo-grid">
        {BOTS.map(bot => {
          const chain = onChain.find(b => b.tokenId === bot.tokenId);
          const last = chain?.decisions?.[0];
          const isLoading = loading === bot.tokenId;
          const color = bot.color as BotColor;

          return (
            <div key={bot.tokenId} className="demo-card">
              <div className="demo-card-hdr">
                <div className={`demo-bot-icon ${color}`}>
                  <i className="fa-solid fa-robot" />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="demo-bot-name">{bot.name}</div>
                  <div className="demo-bot-strat">{bot.strategy}</div>
                </div>
                <a
                  href={`${EXPLORER}/address/${bot.wallet}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--hud-text-dim)', fontSize: 13 }}
                >
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                </a>
              </div>

              {/* Last on-chain decision */}
              <div className="demo-last">
                {last ? (
                  <>
                    <div className="demo-last-row">
                      <span className="lbl">Last decision</span>
                      <span className={`val ${last.direction === 'UP' ? 'up' : 'dn'}`}>
                        <i className={`fa-solid fa-arrow-trend-${last.direction === 'UP' ? 'up' : 'down'}`} /> {last.direction}
                      </span>
                    </div>
                    <div className="demo-last-row">
                      <span className="lbl">Confidence</span>
                      <span className="val">{(last.confidence / 10).toFixed(1)}%</span>
                    </div>
                    <div className="demo-last-reason" title={last.reasoning}>
                      {last.reasoning}
                    </div>
                  </>
                ) : (
                  <div className="demo-last-row">
                    <span className="lbl" style={{ fontStyle: 'italic' }}>No decisions yet</span>
                  </div>
                )}
              </div>

              <button
                onClick={() => triggerDemo(bot.tokenId)}
                disabled={isLoading || loading !== null}
                className={`demo-trigger ${color}${isLoading ? ' loading' : ''}`}
              >
                {isLoading ? (
                  <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 12 }} />Submitting…</>
                ) : (
                  <><i className="fa-solid fa-bolt" />Trigger {selectedAsset} Decision</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px', marginTop: 8, background: 'var(--hud-red-3)', border: '1px solid var(--hud-red-2)', color: 'var(--hud-red)', fontSize: 13, fontFamily: 'var(--hud-font-mono)' }}>
          <i className="fa-solid fa-circle-exclamation" />
          {error}
        </div>
      )}

      {/* Confirmed results */}
      <AnimatePresence>
        {results.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 13, color: 'var(--hud-text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              On-chain confirmations
            </div>
            {results.map((r, i) => {
              const botColor = BOT_COLORS[r.bot.tokenId] || '#fff';
              return (
                <motion.div
                  key={`${r.txHash}-${i}`}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '12px 12px',
                    background: 'var(--hud-green-3)', border: '1px solid var(--hud-green-2)',
                    clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)',
                  }}
                >
                  <i className="fa-solid fa-circle-check" style={{ color: 'var(--hud-green)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--hud-font-head)', fontSize: 13, display: 'flex', gap: 6 }}>
                      <span style={{ color: botColor, fontWeight: 600 }}>{r.bot.name}</span>
                      <span style={{ color: r.decision.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)', fontWeight: 600 }}>{r.decision.direction}</span>
                      <span style={{ color: 'var(--hud-text-dim)' }}>{r.decision.asset} · {(r.decision.confidence / 10).toFixed(1)}% conf</span>
                    </div>
                    <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 13, color: 'var(--hud-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.decision.reasoning}
                    </div>
                  </div>
                  <a
                    href={r.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 13, color: 'var(--hud-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square" />
                    MantleScan
                  </a>
                </motion.div>
              );
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
