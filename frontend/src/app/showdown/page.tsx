'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Navigation, View } from '@/components/layout/Navigation';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { OnlineCounter } from '@/components/ui/OnlineCounter';
import { analyzeBotDecision, BotAnalysis } from '@/lib/bot-indicators';

const AGENTS = [
  { tokenId: 5 as const, name: 'AlphaPredict',   strategy: 'Momentum',       color: '#3b82f6' },
  { tokenId: 6 as const, name: 'MomentumMaster', strategy: 'Mean-Reversion', color: '#a855f7' },
  { tokenId: 7 as const, name: 'NeuralTrader',   strategy: 'Neural Net',     color: '#22c55e' },
];

const ASSETS = ['BTC', 'ETH', 'SOL'] as const;

function fmtPrice(n: number, asset: string) {
  return n.toLocaleString('en-US', { minimumFractionDigits: asset === 'BTC' ? 0 : 2, maximumFractionDigits: asset === 'BTC' ? 0 : 2 });
}

export default function ShowdownPage() {
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [agentA, setAgentA] = useState(0);
  const [agentB, setAgentB] = useState(2);
  const [asset, setAsset] = useState<typeof ASSETS[number]>('BTC');
  const [running, setRunning] = useState(false);
  const [resultA, setResultA] = useState<BotAnalysis | null>(null);
  const [resultB, setResultB] = useState<BotAnalysis | null>(null);

  const runShowdown = useCallback(async () => {
    setRunning(true);
    setResultA(null);
    setResultB(null);
    const a = AGENTS[agentA];
    const b = AGENTS[agentB];
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
  const agree = resultA && resultB && resultA.decision.direction === resultB.decision.direction;

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
        <div className="hud-shell">
          <span className="bc-cur">
            <i className="fa-solid fa-fire" style={{ marginRight: 6 }} />
            Strategy Showdown
          </span>
        </div>
      </div>

      <main className="hud-shell hud-page-main-wide">
        <div className="sd-hero">
          <h2>Compare AI Strategies Head-to-Head</h2>
          <p>Pick two agents, one asset — see how different strategies interpret the same market data</p>
        </div>

        <div className="sd-config-row">
          <div className="sd-config-block">
            <div className="lbl">Agent A</div>
            <div className="hud-chip-row" style={{ justifyContent: 'center' }}>
              {AGENTS.map((ag, i) => (
                <button
                  key={ag.tokenId}
                  type="button"
                  onClick={() => { if (i !== agentB) setAgentA(i); }}
                  disabled={i === agentB}
                  className="sd-agent-chip"
                  style={agentA === i ? { borderColor: `${ag.color}80`, background: `${ag.color}22`, color: ag.color } : undefined}
                >
                  {ag.name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--hud-text-3)', paddingBottom: 6 }}>VS</div>

          <div className="sd-config-block">
            <div className="lbl">Agent B</div>
            <div className="hud-chip-row" style={{ justifyContent: 'center' }}>
              {AGENTS.map((ag, i) => (
                <button
                  key={ag.tokenId}
                  type="button"
                  onClick={() => { if (i !== agentA) setAgentB(i); }}
                  disabled={i === agentA}
                  className="sd-agent-chip"
                  style={agentB === i ? { borderColor: `${ag.color}80`, background: `${ag.color}22`, color: ag.color } : undefined}
                >
                  {ag.name}
                </button>
              ))}
            </div>
          </div>

          <div className="sd-config-block">
            <div className="lbl">Asset</div>
            <div className="hud-chip-row" style={{ justifyContent: 'center' }}>
              {ASSETS.map(sym => (
                <button key={sym} type="button" onClick={() => setAsset(sym)} className={`hud-chip${asset === sym ? ' active' : ''}`}>{sym}</button>
              ))}
            </div>
          </div>

          <button type="button" onClick={runShowdown} disabled={running} className="hud-btn hud-btn-gold">
            {running ? (
              <><i className="fa-solid fa-circle-notch fa-spin" /> Analyzing…</>
            ) : (
              <><i className="fa-solid fa-fire" /> Run Showdown</>
            )}
          </button>
        </div>

        {(resultA || resultB || running) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 14 }}>
            <AgentPanel agent={a} result={resultA} loading={running && !resultA} asset={asset} />
            <AgentPanel agent={b} result={resultB} loading={running && !resultB} asset={asset} />
          </div>
        )}

        {resultA && resultB && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="sd-verdict-card">
            <i className="fa-solid fa-scale-balanced" style={{ fontSize: 28, color: 'var(--hud-gold)', marginBottom: 8 }} />
            <h3 style={{ fontFamily: 'var(--hud-font-head)', fontSize: 18, fontWeight: 600, color: '#fff' }}>
              {agree ? (
                <>Agents Agree: <span style={{ color: resultA.decision.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)' }}>{resultA.decision.direction}</span></>
              ) : (
                'Agents Disagree!'
              )}
            </h3>
            <div className="sd-verdict-vs">
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: a.color }}>{a.name}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: resultA.decision.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)' }}>
                  {resultA.decision.direction} ({(resultA.decision.confidence / 10).toFixed(1)}%)
                </div>
              </div>
              <div style={{ fontSize: 18, color: 'var(--hud-text-3)' }}>vs</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: b.color }}>{b.name}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: resultB.decision.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)' }}>
                  {resultB.decision.direction} ({(resultB.decision.confidence / 10).toFixed(1)}%)
                </div>
              </div>
            </div>
            {resultA.decision.confidence !== resultB.decision.confidence && (
              <p style={{ fontSize: 10, color: 'var(--hud-text-3)', marginTop: 12 }}>
                Higher confidence:{' '}
                <span style={{ color: resultA.decision.confidence > resultB.decision.confidence ? a.color : b.color }}>
                  {resultA.decision.confidence > resultB.decision.confidence ? a.name : b.name}
                </span>
                {' '}({(Math.max(resultA.decision.confidence, resultB.decision.confidence) / 10).toFixed(1)}%)
              </p>
            )}
            <p style={{ fontSize: 9, color: 'var(--hud-text-3)', marginTop: 6 }}>
              Same market snapshot · different strategy logic · both verifiable on-chain
            </p>
          </motion.div>
        )}
      </main>

      <footer className="hud-footer">
        <div className="hud-footer-inner">
          <span>MindClash · Mantle Turing Test Hackathon 2026</span>
        </div>
      </footer>
    </div>
  );
}

function AgentPanel({
  agent,
  result,
  loading,
  asset,
}: {
  agent: typeof AGENTS[number];
  result: BotAnalysis | null;
  loading: boolean;
  asset: string;
}) {
  return (
    <div className="sd-result-panel" style={{ borderColor: `${agent.color}40` }}>
      <div className="sd-rp-hdr">
        <div className="ca-strat-icon" style={{ background: `${agent.color}22`, color: agent.color, width: 32, height: 32, fontSize: 14 }}>
          <i className="fa-solid fa-robot" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: agent.color }}>{agent.name}</div>
          <div style={{ fontSize: 9, color: 'var(--hud-text-3)' }}>{agent.strategy} · Token #{agent.tokenId}</div>
        </div>
      </div>

      {loading && (
        <div className="ca-phase-center" style={{ padding: '24px 0' }}>
          <i className="fa-solid fa-circle-notch fa-spin" style={{ color: agent.color }} />
          <div className="ca-phase-sub">Analyzing {agent.strategy}…</div>
        </div>
      )}

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div style={{ fontSize: 9, color: 'var(--hud-text-3)', textTransform: 'uppercase' }}>Direction</div>
          <div className="sd-rp-dir" style={{ color: result.decision.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)' }}>
            <i className={`fa-solid fa-arrow-trend-${result.decision.direction === 'UP' ? 'up' : 'down'}`} /> {result.decision.direction}
          </div>
          <div style={{ fontSize: 9, color: 'var(--hud-text-3)', textTransform: 'uppercase', marginBottom: 4 }}>Confidence</div>
          <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 18, color: '#fff' }}>{(result.decision.confidence / 10).toFixed(1)}%</div>
          <div style={{ fontSize: 9, color: 'var(--hud-text-3)', textTransform: 'uppercase', margin: '12px 0 6px' }}>Signals</div>
          <div>
            {result.signals.map((sig, i) => (
              <span key={i} className={`sd-signal-tag ${sig.bullish ? 'up' : 'dn'}`}>{sig.label}</span>
            ))}
          </div>
          <div style={{ fontSize: 9, color: 'var(--hud-text-3)', textTransform: 'uppercase', margin: '12px 0 6px' }}>Reasoning</div>
          <p style={{ fontSize: 10, color: 'var(--hud-text-dim)', fontStyle: 'italic', lineHeight: 1.4 }}>
            &ldquo;{result.decision.reasoning}&rdquo;
          </p>
          <div style={{ fontSize: 9, color: 'var(--hud-text-3)', marginTop: 10, fontFamily: 'var(--hud-font-mono)' }}>
            {asset} @ ${fmtPrice(result.market.price, asset)}
          </div>
        </motion.div>
      )}
    </div>
  );
}
