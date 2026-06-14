'use client';

import { useState, useEffect, useCallback } from 'react';
import { providers, Contract } from 'ethers';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navigation, View } from '@/components/layout/Navigation';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { OnlineCounter } from '@/components/ui/OnlineCounter';

const RPC_URL  = 'https://rpc.sepolia.mantle.xyz';
const NFT_ADDR = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';
const EXPLORER = 'https://sepolia.mantlescan.xyz';

const AGENT_NFT_ABI = [
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

const getContract = () => {
  const provider = new providers.JsonRpcProvider(RPC_URL);
  return new Contract(NFT_ADDR, AGENT_NFT_ABI, provider);
};

export default function LeaderboardPage() {
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [decisions, setDecisions] = useState<Record<number, Decision[]>>({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const allResults = await Promise.all(AGENTS.map(async (a) => {
        try {
          const c = getContract();
          const raw = await c.getRecentDecisions(a.tokenId, 500);
          const decs = raw.map((d: { direction: string; confidence: { toString: () => string }; stake: { toString: () => string }; timestamp: { toString: () => string }; wasCorrect: boolean; pnl: { toString: () => string }; reasoning: string }) => ({
            direction: d.direction,
            confidence: Number(d.confidence),
            stake: Number(d.stake),
            timestamp: Number(d.timestamp),
            wasCorrect: d.wasCorrect,
            pnl: Number(d.pnl),
            reasoning: d.reasoning,
          }));
          const total = decs.length;
          const correct = decs.filter((d: Decision) => d.wasCorrect).length;
          const totalPnL = decs.reduce((s: number, d: Decision) => s + d.pnl, 0);
          return {
            agent: { ...a, totalDecisions: total, correctDecisions: correct, winRate: total > 0 ? (correct / total) * 100 : 0, totalPnL, isActive: total > 0 },
            decisions: decs,
          };
        } catch {
          return { agent: { ...a, totalDecisions: 0, correctDecisions: 0, winRate: 0, totalPnL: 0, isActive: false }, decisions: [] };
        }
      }));

      const agentStats = allResults.map(r => r.agent);
      agentStats.sort((a, b) => b.winRate - a.winRate || b.totalDecisions - a.totalDecisions);
      setAgents(agentStats);

      const decMap: Record<number, Decision[]> = {};
      allResults.forEach(r => { decMap[r.agent.tokenId] = r.decisions; });
      setDecisions(decMap);
      setLastUpdate(new Date());
    } catch {
      // fetch error handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    if (!autoRefresh) return;
    const id = setInterval(fetchAll, 60_000);
    return () => clearInterval(id);
  }, [fetchAll, autoRefresh]);

  const totalDecisionsAll = agents.reduce((s, a) => s + a.totalDecisions, 0);
  const activeCount = agents.filter(a => a.totalDecisions > 0).length;

  const rankColors = ['var(--hud-gold)', '#e5e7eb', '#f97316'];

  const mergedDecisions = (() => {
    const all: (Decision & { tokenId: number; name: string; color: string })[] = [];
    Object.entries(decisions).forEach(([tid, decs]) => {
      const agent = AGENTS.find(a => a.tokenId === Number(tid));
      if (!agent) return;
      decs.forEach(d => all.push({ ...d, tokenId: agent.tokenId, name: agent.name, color: agent.color }));
    });
    all.sort((a, b) => b.timestamp - a.timestamp);
    return all.slice(0, 30);
  })();

  return (
    <div className="min-h-screen">
      <header className="hud-topbar">
        <div className="hud-topbar-inner">
          <Link href="/" className="hud-logo-text">
            <span className="logo-mind">Mind</span>
            <span className="logo-clash">Clash</span>
          </Link>
          <Navigation currentView={currentView} onViewChange={setCurrentView} />
          <div className="hud-topbar-right">
            <OnlineCounter />
            <ClashBalance />
            <ModeIndicator />
            <HudConnectButton />
          </div>
        </div>
      </header>

      <div className="hud-ticker-bar">
        <div className="hud-shell"><LiveTicker /></div>
      </div>

      <div className="hud-breadcrumb">
        <div className="hud-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <span className="bc-cur">
            <i className="fa-solid fa-trophy" style={{ marginRight: 6 }} />
            On-Chain Agent Leaderboard
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {lastUpdate && (
              <span style={{ fontSize: 10, color: 'var(--hud-text-3)' }}>Updated {lastUpdate.toLocaleTimeString()}</span>
            )}
            <button type="button" onClick={() => setAutoRefresh(!autoRefresh)} className={`hud-btn ${autoRefresh ? 'hud-btn-green' : 'hud-btn-ghost'}`} style={{ fontSize: 10, padding: '5px 10px' }}>
              <i className={`fa-solid fa-arrows-rotate${autoRefresh ? ' fa-spin' : ''}`} style={autoRefresh ? { animationDuration: '3s' } : undefined} />
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button type="button" onClick={() => { setLoading(true); fetchAll(); }} className="hud-btn hud-btn-cyan" style={{ fontSize: 10, padding: '5px 10px' }}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <main className="hud-shell" style={{ paddingTop: 16, paddingBottom: 24 }}>
        <div className="hud-testnet-banner" style={{ marginBottom: 12 }}>
          <span className="hud-testnet-dot" />
          <span>
            <strong style={{ color: 'var(--hud-gold)' }}>Mantle Sepolia Testnet</strong>
            {' '}— AI decisions recorded on-chain in real time. Win/Loss outcomes pending oracle resolution.
          </span>
        </div>

        <div className="ocl-stats">
          <div className="ocl-stat-card" style={{ borderColor: 'rgba(251,191,36,0.25)' }}>
            <div className="ocl-stat-val" style={{ color: 'var(--hud-gold)' }}>{totalDecisionsAll.toLocaleString()}</div>
            <div className="ocl-stat-lbl">Total On-Chain Decisions</div>
          </div>
          <div className="ocl-stat-card" style={{ borderColor: 'rgba(168,85,247,0.25)' }}>
            <div className="ocl-stat-val" style={{ color: 'var(--hud-purple)' }}>{activeCount}/3</div>
            <div className="ocl-stat-lbl">Agents Active On-Chain</div>
          </div>
          <div className="ocl-stat-card" style={{ borderColor: 'rgba(0,229,255,0.25)' }}>
            <div className="ocl-stat-val" style={{ color: 'var(--hud-cyan)' }}>{agents.filter(a => a.isActive).length}/3</div>
            <div className="ocl-stat-lbl">Agents Online</div>
          </div>
        </div>

        <div className="hud-section-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--hud-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-chart-bar" style={{ color: 'var(--hud-gold)' }} />
            <span className="ca-panel-title">Tournament Rankings</span>
            <span style={{ fontSize: 9, color: 'var(--hud-text-3)', marginLeft: 4 }}>Data from AgentNFT contract</span>
          </div>

          {loading ? (
            <div className="ca-phase-center" style={{ padding: 40 }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, color: 'var(--hud-cyan)' }} />
              <div className="ca-phase-sub">Reading on-chain data…</div>
            </div>
          ) : (
            agents.map((agent, rank) => {
              const decs = decisions[agent.tokenId] || [];
              const last5 = decs.slice(-5);
              return (
                <motion.div key={agent.tokenId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: rank * 0.08 }} className="ocl-agent-row">
                  <div
                    className="ocl-rank-badge"
                    style={{
                      background: `${rankColors[rank] || 'var(--hud-text-3)'}22`,
                      border: `1px solid ${rankColors[rank] || 'var(--hud-border)'}`,
                      color: rankColors[rank] || 'var(--hud-text-dim)',
                    }}
                  >
                    #{rank + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--hud-font-head)', fontWeight: 600, color: '#fff' }}>{agent.name}</span>
                      <span className="hud-badge" style={{ fontSize: 8, padding: '2px 6px', color: agent.color, borderColor: `${agent.color}44`, background: `${agent.color}11` }}>
                        {agent.strategy}
                      </span>
                      <span style={{ fontSize: 9, color: 'var(--hud-text-3)' }}>NFT #{agent.tokenId}</span>
                    </div>
                    <a href={`${EXPLORER}/address/${agent.wallet}`} target="_blank" rel="noopener noreferrer" className="ca-tx-link" style={{ fontSize: 9, marginTop: 4, display: 'inline-flex', gap: 4 }}>
                      <i className="fa-solid fa-arrow-up-right-from-square" />
                      {agent.wallet.slice(0, 6)}…{agent.wallet.slice(-4)}
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 18, color: '#fff' }}>{agent.totalDecisions}</div>
                      <div style={{ fontSize: 9, color: 'var(--hud-text-3)' }}>On-Chain Txs</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <span className="hud-badge hud-badge-gold" style={{ fontSize: 9 }}>Pending</span>
                      <div style={{ fontSize: 9, color: 'var(--hud-text-3)', marginTop: 4 }}>Win Rate</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 18, color: agent.totalPnL >= 0 ? 'var(--hud-green)' : 'var(--hud-red)' }}>
                        {agent.totalPnL >= 0 ? '+' : ''}{agent.totalPnL}
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--hud-text-3)' }}>PnL (bps)</div>
                    </div>
                    <div className="hud-banner-wl" style={{ marginTop: 0 }}>
                      {last5.length > 0 ? last5.map((d, i) => (
                        <span key={i} className={`hud-wl-chip${d.wasCorrect ? ' w' : ' l'}`} style={{ width: 24, height: 24, fontSize: 9 }} title={`${d.direction} ${d.wasCorrect ? '✓' : '✗'}`}>
                          {d.wasCorrect ? '✓' : '✗'}
                        </span>
                      )) : <span style={{ fontSize: 9, color: 'var(--hud-text-3)' }}>—</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        <div className="hud-section-panel" style={{ padding: 0, overflow: 'hidden', marginTop: 12 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--hud-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--hud-cyan)' }} />
            <span className="ca-panel-title">Recent On-Chain Decisions</span>
          </div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {mergedDecisions.length === 0 && !loading ? (
              <div className="ca-phase-center" style={{ padding: 32 }}>
                <div className="ca-phase-sub">No decisions recorded yet.</div>
              </div>
            ) : (
              mergedDecisions.map((d, i) => (
                <motion.div key={`${d.tokenId}-${d.timestamp}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="ocl-timeline-row">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: d.color, minWidth: 90 }}>{d.name}</span>
                  <span style={{ color: d.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)', fontWeight: 600, minWidth: 48 }}>
                    <i className={`fa-solid fa-arrow-trend-${d.direction === 'UP' ? 'up' : 'down'}`} /> {d.direction}
                  </span>
                  <span style={{ color: 'var(--hud-text-3)', fontSize: 10, minWidth: 72 }}>{(d.confidence / 10).toFixed(1)}%</span>
                  <span style={{ color: d.wasCorrect ? 'var(--hud-green)' : 'var(--hud-red)', fontWeight: 600, minWidth: 64 }}>
                    {d.wasCorrect ? '✓ Correct' : '✗ Wrong'}
                  </span>
                  <span style={{ color: d.pnl >= 0 ? 'var(--hud-green)' : 'var(--hud-red)', minWidth: 56 }}>{d.pnl >= 0 ? '+' : ''}{d.pnl} bps</span>
                  <span style={{ flex: 1, color: 'var(--hud-text-3)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.reasoning}>{d.reasoning}</span>
                  <span style={{ color: 'var(--hud-text-3)', fontSize: 9, flexShrink: 0 }}>
                    {d.timestamp > 0 ? new Date(d.timestamp * 1000).toLocaleTimeString() : '—'}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--hud-text-3)', marginTop: 16 }}>
          All data read directly from{' '}
          <a href={`${EXPLORER}/address/${NFT_ADDR}`} target="_blank" rel="noopener noreferrer" className="ca-tx-link">
            AgentNFT on Mantle Sepolia
          </a>
          {' '}— no backend required
        </p>
      </main>

      <footer className="hud-footer">
        <div className="hud-footer-inner">
          <span>MindClash · Mantle Turing Test Hackathon 2026</span>
        </div>
      </footer>
    </div>
  );
}
