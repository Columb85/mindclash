'use client';

import { useState, useEffect } from 'react';
import { useAIAgent } from '@/contexts/AIAgentContext';
import { LiveAgentDemo } from './LiveAgentDemo';
import { showToast } from '@/components/ui/ProgressToast';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimeAgo(timestamp: number): string {
  const s = Math.floor((Date.now() - timestamp) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function formatPrice(price: number, symbol: string): string {
  if (symbol === 'MNT') return `$${price.toFixed(4)}`;
  if (symbol === 'SOL') return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const EXPLORER_URL = process.env.NEXT_PUBLIC_EXPLORER_URL || 'https://sepolia.mantlescan.xyz';
const NFT_ADDRESS  = process.env.NEXT_PUBLIC_AGENT_NFT_ADDRESS || '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';

const BOT_TOKEN_IDS: Record<string, number> = {
  AlphaPredict: 5, MomentumMaster: 6, NeuralTrader: 7,
};

function getMantleScanUrl(agentName: string): string {
  const tid = BOT_TOKEN_IDS[agentName];
  return tid ? `${EXPLORER_URL}/token/${NFT_ADDRESS}?a=${tid}` : '';
}

// Avatar colour key: blue | purple | green
const AGENT_COLOR: Record<string, 'blue' | 'purple' | 'green'> = {
  AlphaPredict: 'blue', MomentumMaster: 'purple', NeuralTrader: 'green',
};
const AGENT_EMOJI: Record<string, string> = {
  AlphaPredict: '🤖', MomentumMaster: '⚡', NeuralTrader: '🧠',
};
const STRATEGY_ICON: Record<string, string> = {
  'momentum': 'fa-microchip', 'mean-reversion': 'fa-microchip', 'neural': 'fa-microchip',
};
const STRATEGY_LABEL: Record<string, string> = {
  'momentum': 'Momentum', 'mean-reversion': 'Mean Rev.', 'neural': 'Neural Net',
};
const STRATEGY_COLOR: Record<string, 'blue' | 'purple' | 'green'> = {
  'momentum': 'blue', 'mean-reversion': 'purple', 'neural': 'green',
};

// ── Session Timer ─────────────────────────────────────────────────────────────

function SessionTimer({ endTime }: { endTime: number }) {
  const [left, setLeft] = useState(endTime - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(endTime - Date.now()), 1000);
    return () => clearInterval(t);
  }, [endTime]);
  if (left <= 0) return <span style={{ color: 'var(--hud-red)' }}>Ended</span>;
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  return <>{h > 0 && `${h}h `}{m}m {s}s</>;
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AIAgentMonitor() {
  const { agents, currentSession, livePrices, startAgent, stopAgent } = useAIAgent();
  const [selectedId, setSelectedId] = useState<string | null>(agents[0]?.id ?? null);

  useEffect(() => {
    if (!selectedId && agents.length > 0) setSelectedId(agents[0].id);
  }, [agents, selectedId]);

  const selectedAgent = agents.find(a => a.id === selectedId) ?? null;

  if (!currentSession) {
    return (
      <div className="aim-inner">
        <div className="aim-session" style={{ textAlign: 'center', padding: 32 }}>
          <i className="fa-solid fa-brain" style={{ fontSize: 32, color: 'var(--hud-text-dim)', marginBottom: 12, display: 'block' }} />
          <div className="aim-session-title">No Active Session</div>
          <div className="aim-session-sub" style={{ justifyContent: 'center', marginTop: 8 }}>AI competition session not started</div>
        </div>
      </div>
    );
  }

  const totalDecisions = agents.reduce((s, a) => s + a.totalDecisions, 0);
  const avgWinRate     = agents.length > 0 ? agents.reduce((s, a) => s + a.winRate, 0) / agents.length : 0;
  const totalPnL       = agents.reduce((s, a) => s + a.totalPnL, 0);
  const activeCount    = agents.filter(a => a.isActive).length;

  return (
    <div className="aim-inner">

      {/* ── Session header + stats ─────────────────────────────────────── */}
      <div className="aim-session">
        <div className="aim-session-hdr">
          <div className="aim-session-left">
            <div className="aim-session-icon">
              <i className="fa-solid fa-brain" />
            </div>
            <div>
              <div className="aim-session-title">AI Agent Monitor</div>
              <div className="aim-session-sub">
                <span className="live-dot" style={{ width: 5, height: 5 }} />
                Turing Test Competition · Mantle Sepolia
              </div>
            </div>
          </div>
          <div className="aim-session-timer">
            <div className="lbl">Session ends in</div>
            <div className="val"><SessionTimer endTime={currentSession.endTime} /></div>
          </div>
        </div>
        <div className="aim-stats">
          <div className="aim-stat">
            <div className="aim-stat-hdr"><i className="fa-solid fa-robot" style={{ color: '#60a5fa' }} />Active Agents</div>
            <div className="aim-stat-val">{activeCount}/{agents.length}</div>
          </div>
          <div className="aim-stat">
            <div className="aim-stat-hdr"><i className="fa-solid fa-bullseye" style={{ color: 'var(--hud-green)' }} />Total Decisions</div>
            <div className="aim-stat-val">{totalDecisions.toLocaleString()}</div>
          </div>
          <div className="aim-stat">
            <div className="aim-stat-hdr"><i className="fa-solid fa-chart-column" style={{ color: 'var(--hud-gold)' }} />Avg Win Rate</div>
            <div className="aim-stat-val">{avgWinRate.toFixed(1)}%</div>
          </div>
          <div className="aim-stat">
            <div className="aim-stat-hdr"><i className="fa-solid fa-bolt" style={{ color: 'var(--hud-purple)' }} />Total PnL</div>
            <div className={`aim-stat-val${totalPnL < 0 ? ' neg' : ' pos'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(0)} CLASH
            </div>
          </div>
        </div>
      </div>

      {/* ── Agents grid + Live prices ──────────────────────────────────── */}
      <div className="aim-layout">
        <div>
          <div className="aim-agents-label">AI Agents</div>
          <div className="aim-agents-grid">
            {agents.map(agent => {
              const color  = AGENT_COLOR[agent.name] ?? 'blue';
              const emoji  = AGENT_EMOJI[agent.name] ?? '🤖';
              const strat  = (agent as any).strategy as string | undefined;
              const stratColor = strat ? (STRATEGY_COLOR[strat] ?? 'blue') : 'blue';
              const stratLabel = strat ? (STRATEGY_LABEL[strat] ?? strat) : '—';
              const isActive = agent.isActive;
              const isSel    = selectedId === agent.id;
              const last     = agent.lastDecision;
              const wrPct    = Math.min(agent.winRate, 100);
              const scanUrl  = getMantleScanUrl(agent.name);

              return (
                <div
                  key={agent.id}
                  onClick={() => setSelectedId(agent.id)}
                  className={`agent-card${isActive ? ' active' : ''}${isSel ? ' sel' : ''}`}
                >
                  <div className="agent-card-hdr">
                    <div className="agent-card-id">
                      <div className={`agent-av ${color}`}>
                        {emoji}
                        {isActive && <span className="dot" />}
                      </div>
                      <div>
                        <div className="agent-name">{agent.name}</div>
                        <div className="agent-ver">v{agent.version}</div>
                        {scanUrl && (
                          <a
                            href={scanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="agent-scan"
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square" />
                            MantleScan
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); isActive ? stopAgent(agent.id) : startAgent(agent.id); }}
                      className={`agent-play ${isActive ? 'pause' : 'run'}`}
                    >
                      <i className={`fa-solid ${isActive ? 'fa-pause' : 'fa-play'}`} />
                    </button>
                  </div>

                  {strat && (
                    <span className={`agent-strat ${stratColor}`}>
                      <i className="fa-solid fa-microchip" />{stratLabel}
                    </span>
                  )}

                  <div className="agent-wr-lbl">
                    <span>Win Rate</span>
                    <span className="agent-wr-val"
                      style={agent.winRate < 50 ? { color: 'var(--hud-gold)' } : undefined}>
                      {agent.winRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="agent-wr-track">
                    <div className="agent-wr-fill" style={{ width: `${wrPct}%` }} />
                  </div>

                  <div className="agent-mini-grid">
                    <div className="agent-mini">
                      <div className="k">Decisions</div>
                      <div className="v">{agent.totalDecisions}</div>
                    </div>
                    <div className="agent-mini">
                      <div className="k">PnL</div>
                      <div className={`v${agent.totalPnL < 0 ? ' neg' : ''}`}>
                        {agent.totalPnL >= 0 ? '+' : ''}{agent.totalPnL.toFixed(0)}
                      </div>
                    </div>
                  </div>

                  {last && last.direction !== 'HOLD' && (
                    <div className="agent-signal">
                      <div className="agent-signal-hdr">
                        <span>Last signal</span>
                        <span>{formatTimeAgo(last.timestamp)}</span>
                      </div>
                      <div className="agent-signal-tags">
                        <span className={`agent-tag ${last.direction === 'UP' ? 'up' : 'dn'}`}>
                          <i className={`fa-solid fa-arrow-trend-${last.direction === 'UP' ? 'up' : 'down'}`} />
                          {last.direction}
                        </span>
                        {(last as any).asset && (
                          <span className="agent-tag asset">{(last as any).asset}</span>
                        )}
                        <span className="agent-tag conf">
                          <i className="fa-solid fa-bolt" /> {last.confidence}%
                        </span>
                      </div>
                      {last.reasoning && (
                        <div className="agent-reason">"{last.reasoning}"</div>
                      )}
                    </div>
                  )}

                  <div className="agent-ctas">
                    <button
                      className="agent-cta follow"
                      onClick={e => { e.stopPropagation(); showToast('Follow feature coming soon!', { icon: '🔔' }); }}
                    >
                      <i className="fa-solid fa-signal" />Follow
                    </button>
                    <button
                      className="agent-cta copy"
                      onClick={e => { e.stopPropagation(); showToast('Copy Signals coming soon!', { icon: '⚡' }); }}
                    >
                      <i className="fa-solid fa-bolt" />Copy Signals
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live prices sidebar */}
        <div className="aim-prices">
          <div className="aim-prices-hdr">
            <i className="fa-solid fa-wifi" />
            <span>Live Prices</span>
            <span className="aim-prices-via">via Bybit</span>
          </div>
          {Object.keys(livePrices).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', fontFamily: 'var(--hud-font-mono)', fontSize: 9, color: 'var(--hud-text-dim)' }}>
              Connecting to Bybit…
            </div>
          ) : (
            (['BTC', 'ETH', 'SOL', 'MNT'] as const).map(sym => {
              const tick = livePrices[sym];
              if (!tick) return null;
              const isUp = tick.change24h >= 0;
              return (
                <div key={sym} className="price-row">
                  <div className="price-row-left">
                    <img
                      src={
                        sym === 'BTC' ? 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png'
                        : sym === 'ETH' ? 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
                        : sym === 'SOL' ? 'https://assets.coingecko.com/coins/images/4128/small/solana.png'
                        : 'https://assets.coingecko.com/coins/images/30980/small/token-logo.png'
                      }
                      alt={sym}
                    />
                    <div>
                      <div className="price-sym">{sym}</div>
                      <div className={`price-chg ${isUp ? 'up' : 'dn'}`}>
                        {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{tick.change24h.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="price-val">{formatPrice(tick.price, sym)}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Selected agent detail ──────────────────────────────────────── */}
      {selectedAgent && (
        <div className="aim-detail">
          <div className="aim-detail-hdr">
            <div className="aim-detail-icon">
              <i className="fa-solid fa-robot" />
            </div>
            <div>
              <div className="aim-detail-name">{selectedAgent.name}</div>
              <div className="aim-detail-meta">
                {(selectedAgent as any).strategy && (
                  <span className={`agent-strat ${STRATEGY_COLOR[(selectedAgent as any).strategy] ?? 'blue'}`} style={{ margin: 0 }}>
                    <i className="fa-solid fa-microchip" />
                    {STRATEGY_LABEL[(selectedAgent as any).strategy] ?? (selectedAgent as any).strategy}
                  </span>
                )}
                <span>·</span>
                <span style={{ fontFamily: 'var(--hud-font-mono)' }}>v{selectedAgent.version}</span>
              </div>
            </div>
            <div className="aim-detail-addr">
              <div className="lbl">On-chain address</div>
              <div className="val">
                {selectedAgent.address.slice(0, 10)}…{selectedAgent.address.slice(-6)}
              </div>
            </div>
          </div>

          <div className="aim-detail-stats">
            <div className="aim-dstat">
              <div className="lbl">Total Decisions</div>
              <div className="val">{selectedAgent.totalDecisions}</div>
            </div>
            <div className="aim-dstat">
              <div className="lbl">Correct</div>
              <div className="val grn">{selectedAgent.correctDecisions}</div>
            </div>
            <div className="aim-dstat">
              <div className="lbl">Win Rate</div>
              <div className={`val${selectedAgent.winRate >= 55 ? ' grn' : ' ylw'}`}>
                {selectedAgent.winRate.toFixed(1)}%
              </div>
            </div>
          </div>

          {selectedAgent.lastDecision?.reasoning && (
            <div className="aim-reasoning">
              <div className="aim-reasoning-hdr">
                <span><i className="fa-solid fa-brain" />Latest Reasoning</span>
                <span style={{ fontFamily: 'var(--hud-font-mono)' }}>
                  {selectedAgent.lastDecision.timestamp ? formatTimeAgo(selectedAgent.lastDecision.timestamp) : '—'}
                </span>
              </div>
              <p>{selectedAgent.lastDecision.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Live AI Demo ───────────────────────────────────────────────── */}
      <LiveAgentDemo />

    </div>
  );
}
