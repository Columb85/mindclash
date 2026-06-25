'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navigation, View } from '@/components/layout/Navigation';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { OnlineCounter } from '@/components/ui/OnlineCounter';

const EXPLORER = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://sepolia.mantlescan.xyz';
const NFT_ADDR = process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS || '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';

const AGENT_META: Record<number, { strategy: string; color: string }> = {
  5: { strategy: 'Momentum',       color: '#3b82f6' },
  6: { strategy: 'Mean-Reversion', color: '#a855f7' },
  7: { strategy: 'Neural Net',     color: '#22c55e' },
};

interface AgentStats {
  rank: number;
  tokenId: number;
  name: string;
  version: string;
  strategy: string;
  color: string;
  address: string;
  totalDecisions: number;
  correctDecisions: number;
  resolvedDecisions?: number;
  pendingDecisions?: number;
  winRate: number;
  winRateFormatted: string;
  totalPnL: number;
  isActive: boolean;
  explorerUrl: string;
}

interface Decision {
  tokenId: number;
  name: string;
  address: string;
  direction: string;
  confidence: number;
  stake: number;
  timestamp: number;
  wasCorrect: boolean;
  pnl: number;
  reasoning: string;
  decisionHash?: string;
}

export default function LeaderboardPage() {
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [decisions, setDecisions] = useState<Record<number, Decision[]>>({});
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard?limit=10&includeDecisions=true&decisionLimit=30', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load on-chain leaderboard');
      }

      const agentStats: AgentStats[] = (json.data ?? []).map((a: AgentStats) => {
        const meta = AGENT_META[a.tokenId] ?? { strategy: 'AI Agent', color: '#00e5ff' };
        return { ...a, strategy: meta.strategy, color: meta.color };
      });
      setAgents(agentStats);

      const decMap: Record<number, Decision[]> = {};
      const byAgent = json.decisionsByAgent ?? {};
      Object.entries(byAgent).forEach(([tid, decs]) => {
        const tokenId = Number(tid);
        const meta = AGENT_META[tokenId];
        decMap[tokenId] = (decs as Decision[]).map(d => ({
          ...d,
          tokenId,
          name: agentStats.find(a => a.tokenId === tokenId)?.name ?? `Agent #${tokenId}`,
          address: agentStats.find(a => a.tokenId === tokenId)?.address ?? '',
          color: meta?.color,
        })) as Decision[];
      });
      setDecisions(decMap);

      const recent = (json.recentDecisions ?? []).map((d: Decision) => ({
        ...d,
        color: AGENT_META[d.tokenId]?.color ?? '#00e5ff',
      }));
      setRecentDecisions(recent);
      setError(null);
      setLastUpdate(new Date());
    } catch (e: any) {
      setError(e.message || 'Failed to read AgentNFT contract');
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

  return (
    <div className="min-h-screen">
      <header className="hud-topbar">
        <div className="hud-topbar-inner">
          <Link href="/" className="hud-logo-text">
            <span className="logo-mind">Mind</span>
            <span className="logo-clash">Clash</span>
          </Link>
          <Navigation currentView={currentView} onViewChange={setCurrentView} activePage="leaderboard" />
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
              <span style={{ fontSize: 12, color: 'var(--hud-text-3)' }}>Updated {lastUpdate.toLocaleTimeString()}</span>
            )}
            <button type="button" onClick={() => setAutoRefresh(!autoRefresh)} className={`hud-btn ${autoRefresh ? 'hud-btn-green' : 'hud-btn-ghost'}`} style={{ fontSize: 12, padding: '5px 12px' }}>
              <i className={`fa-solid fa-arrows-rotate${autoRefresh ? ' fa-spin' : ''}`} style={autoRefresh ? { animationDuration: '3s' } : undefined} />
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </button>
            <button type="button" onClick={() => { setLoading(true); fetchAll(); }} className="hud-btn hud-btn-cyan" style={{ fontSize: 12, padding: '5px 12px' }}>
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
            {' '}— live data from AgentNFT.getRecentDecisions() via server-side RPC.
          </span>
        </div>

        {error && (
          <div className="hud-testnet-banner" style={{ marginBottom: 12, borderColor: 'rgba(255,51,85,0.35)', background: 'rgba(255,51,85,0.08)' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--hud-red)' }} />
            <span style={{ color: 'var(--hud-red)' }}>{error}</span>
          </div>
        )}

        <div className="ocl-stats">
          <div className="ocl-stat-card" style={{ borderColor: 'rgba(251,191,36,0.25)' }}>
            <div className="ocl-stat-val" style={{ color: 'var(--hud-gold)' }}>{totalDecisionsAll.toLocaleString()}</div>
            <div className="ocl-stat-lbl">On-Chain Decisions (last 500/agent)</div>
          </div>
          <div className="ocl-stat-card" style={{ borderColor: 'rgba(168,85,247,0.25)' }}>
            <div className="ocl-stat-val" style={{ color: 'var(--hud-purple)' }}>{activeCount}/3</div>
            <div className="ocl-stat-lbl">Agents With On-Chain Txs</div>
          </div>
          <div className="ocl-stat-card" style={{ borderColor: 'rgba(0,229,255,0.25)' }}>
            <div className="ocl-stat-val" style={{ color: 'var(--hud-cyan)' }}>
              {agents.length > 0 ? `${agents.reduce((s, a) => s + a.correctDecisions, 0)}` : '0'}
            </div>
            <div className="ocl-stat-lbl">Resolved Correct (on-chain flag)</div>
          </div>
        </div>

        <div className="hud-section-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--hud-border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <i className="fa-solid fa-chart-bar" style={{ color: 'var(--hud-gold)' }} />
            <span className="ca-panel-title">Tournament Rankings</span>
            <a href={`${EXPLORER}/address/${NFT_ADDR}`} target="_blank" rel="noopener noreferrer" className="ca-tx-link" style={{ fontSize: 13, marginLeft: 'auto' }}>
              <i className="fa-solid fa-arrow-up-right-from-square" /> AgentNFT contract
            </a>
          </div>

          {loading ? (
            <div className="ca-phase-center" style={{ padding: 40 }}>
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, color: 'var(--hud-cyan)' }} />
              <div className="ca-phase-sub">Reading on-chain data…</div>
            </div>
          ) : agents.length === 0 ? (
            <div className="ca-phase-center" style={{ padding: 40 }}>
              <div className="ca-phase-sub">No on-chain agent data found.</div>
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
                    #{agent.rank}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--hud-font-head)', fontWeight: 600, color: '#fff' }}>{agent.name}</span>
                      <span className="hud-badge" style={{ fontSize: 12, padding: '2px 10px', color: agent.color, borderColor: `${agent.color}44`, background: `${agent.color}11` }}>
                        {agent.strategy}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--hud-text-3)' }}>NFT #{agent.tokenId} · {agent.version}</span>
                    </div>
                    <a href={agent.explorerUrl} target="_blank" rel="noopener noreferrer" className="ca-tx-link" style={{ fontSize: 13, marginTop: 4, display: 'inline-flex', gap: 4 }}>
                      <i className="fa-solid fa-arrow-up-right-from-square" />
                      {agent.address.slice(0, 6)}…{agent.address.slice(-4)}
                    </a>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 18, color: '#fff' }}>{agent.totalDecisions}</div>
                      <div style={{ fontSize: 13, color: 'var(--hud-text-3)' }}>On-Chain Txs</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 18, color: agent.winRate >= 50 ? 'var(--hud-green)' : 'var(--hud-gold)' }}>
                        {agent.winRateFormatted}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--hud-text-3)', marginTop: 4 }}>
                        Win Rate ({agent.correctDecisions}/{agent.totalDecisions})
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 18, color: agent.totalPnL >= 0 ? 'var(--hud-green)' : 'var(--hud-red)' }}>
                        {agent.totalPnL >= 0 ? '+' : ''}{agent.totalPnL}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--hud-text-3)' }}>PnL (bps)</div>
                    </div>
                    <div className="hud-banner-wl" style={{ marginTop: 0 }}>
                      {last5.length > 0 ? last5.map((d, i) => (
                        <span key={i} className={`hud-wl-chip${d.wasCorrect ? ' w' : ' l'}`} style={{ width: 24, height: 24, fontSize: 13 }} title={`${d.direction} ${d.wasCorrect ? '✓' : '✗'}`}>
                          {d.wasCorrect ? '✓' : '✗'}
                        </span>
                      )) : <span style={{ fontSize: 13, color: 'var(--hud-text-3)' }}>—</span>}
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
            {recentDecisions.length === 0 && !loading ? (
              <div className="ca-phase-center" style={{ padding: 32 }}>
                <div className="ca-phase-sub">No decisions recorded yet.</div>
              </div>
            ) : (
              recentDecisions.map((d, i) => {
                const color = AGENT_META[d.tokenId]?.color ?? '#00e5ff';
                return (
                  <motion.div key={`${d.tokenId}-${d.timestamp}-${i}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="ocl-timeline-row">
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, color, minWidth: 90 }}>{d.name}</span>
                    <span style={{ color: d.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)', fontWeight: 600, minWidth: 48 }}>
                      <i className={`fa-solid fa-arrow-trend-${d.direction === 'UP' ? 'up' : 'down'}`} /> {d.direction}
                    </span>
                    <span style={{ color: 'var(--hud-text-3)', fontSize: 12, minWidth: 72 }}>{(d.confidence / 10).toFixed(1)}%</span>
                    <span style={{ color: d.wasCorrect ? 'var(--hud-green)' : 'var(--hud-red)', fontWeight: 600, minWidth: 64 }}>
                      {d.wasCorrect ? '✓ Correct' : '✗ Wrong'}
                    </span>
                    <span style={{ color: d.pnl >= 0 ? 'var(--hud-green)' : 'var(--hud-red)', minWidth: 56 }}>{d.pnl >= 0 ? '+' : ''}{d.pnl} bps</span>
                    <span style={{ flex: 1, color: 'var(--hud-text-3)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.reasoning}>{d.reasoning}</span>
                    <span style={{ color: 'var(--hud-text-3)', fontSize: 13, flexShrink: 0 }}>
                      {d.timestamp > 0 ? new Date(d.timestamp * 1000).toLocaleTimeString() : '—'}
                    </span>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--hud-text-3)', marginTop: 16 }}>
          Data fetched server-side from{' '}
          <a href={`${EXPLORER}/address/${NFT_ADDR}`} target="_blank" rel="noopener noreferrer" className="ca-tx-link">
            AgentNFT on Mantle Sepolia
          </a>
          {' '}· verify any tx on{' '}
          <Link href="/verify" className="ca-tx-link">/verify</Link>
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
