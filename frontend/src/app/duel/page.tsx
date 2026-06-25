'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Font Awesome used globally — no Lucide imports needed
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { Navigation, View } from '@/components/layout/Navigation';
import { DuelRoundTimer } from '@/components/ui/DuelRoundTimer';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { OnlineCounter } from '@/components/ui/OnlineCounter';
import { analyzeBotDecision, BotAnalysis } from '@/lib/bot-indicators';
import { useMyAgent } from '@/hooks/useMyAgent';
import { AGENT_STRATEGIES } from '@/lib/agent-config';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';
const EXPLORER = 'https://sepolia.mantlescan.xyz';

const SYSTEM_AGENTS = [
  { tokenId: 5 as const, name: 'AlphaPredict',   strategy: 'Momentum',       color: '#3b82f6' },
  { tokenId: 6 as const, name: 'MomentumMaster', strategy: 'Mean-Reversion', color: '#a855f7' },
  { tokenId: 7 as const, name: 'NeuralTrader',   strategy: 'Neural Net',     color: '#22c55e' },
];

type DuelAgent = {
  tokenId: number;
  name: string;
  strategy: string;
  color: string;
  isMine?: boolean;
};

async function fetchAgentDecision(agent: DuelAgent, asset: string, duration: number): Promise<{
  decision: { direction: string; confidence: number; reasoning: string };
  signals: BotAnalysis['signals'];
  market: { price: number };
}> {
  if ([5, 6, 7].includes(agent.tokenId)) {
    const analysis = await analyzeBotDecision(agent.tokenId as 5 | 6 | 7, asset, agent.strategy);
    return analysis;
  }

  const strategyId = AGENT_STRATEGIES.find(s =>
    s.name.toLowerCase() === agent.strategy.toLowerCase() ||
    s.id === agent.strategy
  )?.id || 'neural';

  const res = await fetch(`${API_URL}/agents/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentTokenId: agent.tokenId, asset, duration, strategy: strategyId }),
  });
  const json = await res.json();
  if (!res.ok || !json.decision) throw new Error(json.error || 'Agent decision failed');

  const d = json.decision;
  return {
    decision: {
      direction: d.direction,
      confidence: typeof d.confidence === 'number' && d.confidence <= 1 ? d.confidence * 1000 : d.confidence,
      reasoning: d.reasoning,
    },
    signals: [],
    market: { price: d.price ?? 0 },
  };
}
const ASSETS    = ['BTC', 'ETH', 'SOL', 'MNT'] as const;
const DURATIONS = [60, 120, 180] as const;

type Phase = 'setup' | 'submitting' | 'live' | 'resolving' | 'result';

interface DuelData {
  agentName: string;
  agentStrategy: string;
  agentDirection: string;
  agentConfidence: number;
  agentReasoning: string;
  agentSignals: BotAnalysis['signals'];
  humanDirection: string;
  asset: string;
  startPrice: number;
  endPrice: number | null;
  duration: number;
  endsAt: number;
  winner: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  priceChange: string | null;
}

/** Fetch current price from Bybit */
async function fetchPrice(asset: string): Promise<number> {
  const sym = `${asset}USDT`;
  const resp = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${sym}`);
  const json = await resp.json();
  return parseFloat(json?.result?.list?.[0]?.lastPrice ?? '0');
}

/** Fire-and-forget: try to record the agent decision on-chain via backend */
function tryRecordOnChain(
  tokenId: number,
  asset: string,
  humanDirection: string,
  duration: number,
  humanAddress: string | undefined,
  setTx: (tx: { hash: string; url: string } | null) => void,
) {
  fetch(`${API_URL}/duels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentTokenId: tokenId, asset, humanDirection, duration, humanAddress }),
  })
    .then(r => r.json())
    .then(data => {
      if (data.success && data.duel?.txHash) {
        setTx({ hash: data.duel.txHash, url: `${EXPLORER}/tx/${data.duel.txHash}` });
      }
    })
    .catch(() => { /* backend offline — that's fine, duel still works client-side */ });
}

function DuelPageInner() {
  const { address } = useAccount();
  const searchParams = useSearchParams();
  const { tokenId: myTokenId, registered } = useMyAgent();
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  const opponents = useMemo<DuelAgent[]>(() => {
    const list: DuelAgent[] = [...SYSTEM_AGENTS];
    if (myTokenId > 0) {
      const strat = AGENT_STRATEGIES.find(s => s.id === registered?.strategy);
      list.unshift({
        tokenId: myTokenId,
        name: registered?.name || `My Agent #${myTokenId}`,
        strategy: strat?.name || registered?.strategy || 'Neural Net',
        color: '#eab308',
        isMine: true,
      });
    }
    return list;
  }, [myTokenId, registered]);

  const preselect = parseInt(searchParams.get('agent') || '0', 10);
  const initialIdx = preselect > 0
    ? Math.max(0, opponents.findIndex(a => a.tokenId === preselect))
    : 0;

  const [agentIdx, setAgentIdx] = useState(initialIdx);
  const [asset, setAsset]       = useState<typeof ASSETS[number]>('BTC');
  const [duration, setDuration] = useState<number>(60);
  const [direction, setDirection] = useState<'UP' | 'DOWN' | null>(null);

  const [phase, setPhase]       = useState<Phase>('setup');
  const [duel, setDuel]         = useState<DuelData | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [onChainTx, setOnChainTx] = useState<{ hash: string; url: string } | null>(null);
  const timerRef  = useRef<NodeJS.Timeout | null>(null);
  const duelRef   = useRef<DuelData | null>(null);

  const agent = opponents[agentIdx] ?? opponents[0];

  useEffect(() => {
    if (preselect > 0) {
      const idx = opponents.findIndex(a => a.tokenId === preselect);
      if (idx >= 0) setAgentIdx(idx);
    }
  }, [preselect, opponents]);

  useEffect(() => { duelRef.current = duel; }, [duel]);

  const startDuel = useCallback(async () => {
    if (!direction || !agent) return;
    setPhase('submitting');
    setError(null);
    setOnChainTx(null);

    try {
      const analysis = await fetchAgentDecision(agent, asset, duration);

      const now   = Math.floor(Date.now() / 1000);
      const d: DuelData = {
        agentName:       agent.name,
        agentStrategy:   agent.strategy,
        agentDirection:  analysis.decision.direction,
        agentConfidence: analysis.decision.confidence,
        agentReasoning:  analysis.decision.reasoning,
        agentSignals:    analysis.signals,
        humanDirection:  direction,
        asset,
        startPrice:      analysis.market.price,
        endPrice:        null,
        duration,
        endsAt:          now + duration,
        winner:          null,
        txHash:          null,
        explorerUrl:     null,
        priceChange:     null,
      };

      setDuel(d);
      duelRef.current = d;
      setCountdown(duration);
      setPhase('live');

      tryRecordOnChain(agent.tokenId, asset, direction, duration, address, setOnChainTx);
    } catch (e: any) {
      setError(e.message || 'Analysis failed — check network');
      setPhase('setup');
    }
  }, [agent, asset, direction, duration, address]);

  // ── Countdown ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'live') return;
    timerRef.current = setInterval(() => {
      const d = duelRef.current;
      if (!d) return;
      const remaining = Math.max(0, d.endsAt - Math.floor(Date.now() / 1000));
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        resolveNow();
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // ── Resolve ─────────────────────────────────────────────────────────────────
  const resolveNow = useCallback(async () => {
    const d = duelRef.current;
    if (!d) return;
    setPhase('resolving');
    try {
      const endPrice = await fetchPrice(d.asset);
      const actualDir = endPrice > d.startPrice ? 'UP' : endPrice < d.startPrice ? 'DOWN' : 'TIE';

      let winner: string;
      if (actualDir === 'TIE') {
        winner = 'tie';
      } else if (d.humanDirection === actualDir && d.agentDirection !== actualDir) {
        winner = 'human';
      } else if (d.agentDirection === actualDir && d.humanDirection !== actualDir) {
        winner = 'agent';
      } else {
        winner = 'tie'; // both right or both wrong
      }

      const pctChange = ((endPrice - d.startPrice) / d.startPrice * 100).toFixed(4);

      setDuel(prev => prev ? {
        ...prev,
        endPrice,
        winner,
        priceChange: pctChange,
      } : prev);
      setPhase('result');
    } catch {
      // retry after 2s
      setTimeout(resolveNow, 2000);
    }
  }, []);

  const reset = () => {
    setPhase('setup');
    setDuel(null);
    duelRef.current = null;
    setDirection(null);
    setError(null);
    setCountdown(0);
    setOnChainTx(null);
  };

  // Determine bot avatar color class by agent color
  const agentAvatarClass =
    agent.color === '#3b82f6' ? 'blue'
    : agent.color === '#a855f7' ? 'purple'
    : agent.color === '#22c55e' ? 'green'
    : 'gold';

  return (
    <div className="min-h-screen">
      {/* ── HUD Topbar ── */}
      <header className="hud-topbar">
        <div className="hud-topbar-inner">
          <Link href="/" className="hud-logo-text">
            <span className="logo-mind">Mind</span>
            <span className="logo-clash">Clash</span>
          </Link>
          <Navigation currentView={currentView} onViewChange={setCurrentView} activePage="duel" />
          <div className="hud-topbar-right">
            <OnlineCounter />
            <ClashBalance />
            <ModeIndicator />
            <HudConnectButton />
          </div>
        </div>
      </header>

      {/* ── Ticker bar ── */}
      <div className="hud-ticker-bar">
        <div className="hud-shell">
          <LiveTicker />
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="hud-breadcrumb">
        <div className="hud-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="bc-cur">
            <i className="fa-solid fa-bolt" style={{ marginRight: 6 }} />
            Challenge AI
          </span>
          <span className="hud-badge hud-badge-gold">
            <i className="fa-solid fa-link text-[12px]" />
            Event-Driven Duel
          </span>
        </div>
      </div>

      <main className="hud-shell duel-main">
        <div className={`duel-disclaimer${disclaimerOpen ? ' open' : ''}`}>
          <button
            type="button"
            className="duel-disclaimer-hdr"
            onClick={() => setDisclaimerOpen(v => !v)}
            aria-expanded={disclaimerOpen}
          >
            <i className="fa-solid fa-circle-info" />
            <span>How Event-Driven Duel Works</span>
            <span className="duel-disclaimer-hint">
              {disclaimerOpen ? 'Hide details' : 'Click to learn how duels work'}
            </span>
            <i className={`fa-solid fa-chevron-down duel-disclaimer-chevron${disclaimerOpen ? ' open' : ''}`} />
          </button>
          {disclaimerOpen && (
            <>
              <div className="disclaimer-steps">
                <div className="disclaimer-step">
                  <div className="step-num duel-step-num">1</div>
                  <div className="step-content">
                    <h4>Configure Your Duel</h4>
                    <p>Pick an AI opponent, choose BTC / ETH / SOL / MNT, set the round duration (60–180s), and lock in your UP or DOWN prediction before the timer starts.</p>
                  </div>
                </div>
                <div className="disclaimer-step">
                  <div className="step-num duel-step-num">2</div>
                  <div className="step-content">
                    <h4>AI Analyzes Live Market</h4>
                    <p>The agent fetches real-time Bybit prices and runs technical signals — RSI, SMA, Bollinger Bands — using its strategy (Momentum, Mean-Reversion, or Neural Net).</p>
                  </div>
                </div>
                <div className="disclaimer-step">
                  <div className="step-num duel-step-num">3</div>
                  <div className="step-content">
                    <h4>Head-to-Head Verdict</h4>
                    <p>When the round ends, start vs end price decides the winner. Beat the AI if your direction was correct. The decision can be recorded on Mantle Sepolia for on-chain verification.</p>
                  </div>
                </div>
              </div>
              <div className="duel-disclaimer-foot">
                <i className="fa-solid fa-shield-halved" />
                <span>Testnet only · Mantle Sepolia (5003) · Simulated CLASH · Live Bybit prices · No real funds at risk</span>
              </div>
            </>
          )}
        </div>

        <AnimatePresence mode="wait">

          {/* ════ SETUP ════════════════════════════════════════════════════════ */}
          {phase === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="hud-page-label" style={{ marginTop: 0 }}>
                <i className="fa-solid fa-sliders" />
                Setup Phase
              </div>

              <div className="duel-setup-desc">
                <h2>Challenge an AI Champion</h2>
                <p>Pick opponent, asset, duration, and direction. Agent analyzes live Bybit data for BTC, ETH, SOL, and MNT.</p>
              </div>

              <div className="hud-section-panel">
                <div className="duel-pick-lbl">Choose Your Opponent</div>
                <div className="hud-opp-grid">
                  {opponents.map((a, i) => (
                    <button
                      key={a.tokenId}
                      type="button"
                      onClick={() => setAgentIdx(i)}
                      className={`hud-opp-card${agentIdx === i ? ' active' : ''}${a.isMine ? ' mine' : ''}`}
                    >
                      {a.isMine && <i className="fa-solid fa-star opp-star" />}
                      <i className="fa-solid fa-robot" style={{ fontSize: 18, color: agentIdx === i ? a.color : 'var(--hud-text-dim)' }} />
                      <div className="opp-name" style={{ color: agentIdx === i ? a.color : '#fff' }}>{a.name}</div>
                      <div className="opp-strat">{a.strategy}</div>
                      <div className="opp-tid">Token #{a.tokenId}</div>
                    </button>
                  ))}
                </div>
                {myTokenId <= 0 && (
                  <Link href="/create-agent" className="duel-create-link">
                    <i className="fa-solid fa-plus text-[13px]" />
                    Create your own agent (1 per wallet)
                  </Link>
                )}
              </div>

              <div className="duel-pick-row">
                <div className="hud-section-panel duel-panel-flush">
                  <div className="duel-pick-lbl">Asset</div>
                  <div className="hud-chip-row">
                    {ASSETS.map(a => (
                      <button key={a} type="button" onClick={() => setAsset(a)} className={`hud-chip${asset === a ? ' active' : ''}`}>{a}</button>
                    ))}
                  </div>
                </div>
                <div className="hud-section-panel duel-panel-flush">
                  <div className="duel-pick-lbl">Duration</div>
                  <div className="hud-chip-row">
                    {DURATIONS.map(d => (
                      <button key={d} type="button" onClick={() => setDuration(d)} className={`hud-chip${duration === d ? ' active' : ''}`}>{d}s</button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="hud-section-panel duel-panel-flush">
                <div className="duel-pick-lbl">Your Prediction</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button type="button" onClick={() => setDirection('UP')} className={`hud-dir-btn up${direction === 'UP' ? ' active' : ''}`}>
                    <i className="fa-solid fa-arrow-trend-up" style={{ fontSize: 20, display: 'block', marginBottom: 4 }} />
                    <div className="dir-lbl">UP</div>
                  </button>
                  <button type="button" onClick={() => setDirection('DOWN')} className={`hud-dir-btn dn${direction === 'DOWN' ? ' active' : ''}`}>
                    <i className="fa-solid fa-arrow-trend-down" style={{ fontSize: 20, display: 'block', marginBottom: 4 }} />
                    <div className="dir-lbl">DOWN</div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={startDuel}
                  disabled={!direction}
                  className="duel-challenge-btn"
                >
                  <i className="fa-solid fa-bolt" />
                  Challenge {agent.name}
                </button>
              </div>

              {error && (
                <div className="hud-result-banner loss duel-error-banner">
                  <i className="fa-solid fa-triangle-exclamation text-[12px]" style={{ color: 'var(--hud-red)' }} />
                  <span className="duel-error-text">{error}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* ════ SUBMITTING ══════════════════════════════════════════════════ */}
          {phase === 'submitting' && (
            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="duel-phase-center">
              <div className="relative">
                <div
                  className={`hud-bot-av ${agentAvatarClass}`}
                  style={{ width: 72, height: 72, fontSize: 32, clipPath: 'polygon(12px 0,100% 0,calc(100% - 12px) 100%,0 100%)' }}
                >
                  <i className="fa-solid fa-robot" />
                </div>
                <i className="fa-solid fa-circle-notch fa-spin absolute -top-2 -right-2 text-[18px]" style={{ color: 'var(--hud-cyan)' }} />
              </div>
              <div>
                <div className="duel-phase-title">
                  {agent.name} is analyzing {asset}/USDT...
                </div>
                <div className="duel-phase-sub">
                  Fetching klines → RSI, SMA, Bollinger → {agent.strategy} logic
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ LIVE ═════════════════════════════════════════════════════════ */}
          {phase === 'live' && duel && (
            <motion.div key="live" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="hud-page-label" style={{ marginTop: 0 }}>
                <i className="fa-solid fa-satellite-dish" />
                Live Round
              </div>

              <div className="hud-section-panel duel-live-panel">
                <DuelRoundTimer
                  secondsLeft={countdown}
                  totalSeconds={duel.duration}
                  asset={duel.asset}
                />

                <div className="hud-vs-row">
                  <div className="hud-vs-card you">
                    <i className="fa-solid fa-circle-user" style={{ fontSize: 20, color: 'var(--hud-cyan)' }} />
                    <div className="duel-vs-name">You</div>
                    <div className={`duel-vs-pick ${duel.humanDirection === 'UP' ? 'up' : 'dn'}`}>
                      <i className={`fa-solid fa-arrow-trend-${duel.humanDirection === 'UP' ? 'up' : 'down'}`} />
                      {' '}{duel.humanDirection}
                    </div>
                  </div>
                  <div className="hud-vs-mid">
                    VS
                    <div className="duel-vs-price">
                      ${duel.startPrice.toLocaleString()}
                    </div>
                  </div>
                  <div className="hud-vs-card ai">
                    <i className="fa-solid fa-robot" style={{ fontSize: 20, color: agent.color }} />
                    <div className="duel-vs-name" style={{ color: agent.color }}>{duel.agentName}</div>
                    <div className={`duel-vs-pick ${duel.agentDirection === 'UP' ? 'up' : 'dn'}`}>
                      <i className={`fa-solid fa-arrow-trend-${duel.agentDirection === 'UP' ? 'up' : 'down'}`} />
                      {' '}{duel.agentDirection}
                    </div>
                    <div className="duel-vs-conf">
                      conf: {(duel.agentConfidence / 10).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="hud-signals-panel">
                <div className="duel-signals-hdr">{duel.agentStrategy} Signals</div>
                {duel.agentSignals.map((sig, i) => (
                  <div key={i} className="hud-signal-row">
                    <span className={`hud-signal-dot ${sig.bullish ? 'up' : 'dn'}`}>
                      {sig.bullish ? '↑' : '↓'}
                    </span>
                    <span style={{ color: 'var(--hud-text)', fontFamily: 'var(--hud-font-mono)', fontSize: 12 }}>{sig.label}</span>
                  </div>
                ))}
                <div className="duel-reasoning">
                  &ldquo;{duel.agentReasoning}&rdquo;
                </div>
                <div className="duel-onchain-row">
                  {onChainTx ? (
                    <>
                      <span className="hud-tx-badge">
                        <i className="fa-solid fa-circle-check" />
                        On-chain: {onChainTx.hash.slice(0, 10)}…
                      </span>
                      <a href={onChainTx.url} target="_blank" rel="noopener noreferrer" className="duel-explorer-link">
                        <i className="fa-solid fa-arrow-up-right-from-square text-[12px]" />
                        MantleScan
                      </a>
                    </>
                  ) : (
                    <span className="duel-onchain-pending">
                      <i className="fa-solid fa-circle-notch fa-spin text-[13px]" />
                      Recording on-chain...
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ RESOLVING ═══════════════════════════════════════════════════ */}
          {phase === 'resolving' && (
            <motion.div key="resolving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="duel-phase-center">
              <i className="fa-solid fa-circle-notch fa-spin text-3xl" style={{ color: 'var(--hud-gold)' }} />
              <div className="duel-phase-sub">
                Fetching final {asset}/USDT price from Bybit...
              </div>
            </motion.div>
          )}

          {/* ════ RESULT ══════════════════════════════════════════════════════ */}
          {phase === 'result' && duel && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="hud-page-label" style={{ marginTop: 0 }}>
                <i className="fa-solid fa-flag-checkered" />
                Result
              </div>

              <div className={`hud-result-banner ${duel.winner === 'human' ? 'win' : duel.winner === 'agent' ? 'loss' : 'tie'}`}>
                <i className={`fa-solid fa-trophy duel-result-trophy ${duel.winner === 'human' ? 'win' : duel.winner === 'agent' ? 'loss' : 'tie'}`} />
                <div className={`duel-result-title ${duel.winner === 'human' ? 'win' : duel.winner === 'agent' ? 'loss' : 'tie'}`}>
                  {duel.winner === 'human' && 'You Won!'}
                  {duel.winner === 'agent' && `${duel.agentName} Wins`}
                  {duel.winner === 'tie' && "It's a Tie!"}
                </div>
                <div className="duel-result-price">
                  {duel.asset}/USDT: ${duel.startPrice.toLocaleString()} → ${duel.endPrice?.toLocaleString()}
                  {duel.priceChange && ` (${parseFloat(duel.priceChange) >= 0 ? '+' : ''}${duel.priceChange}%)`}
                </div>

                <div className="duel-result-grid">
                  <div className="hud-vs-card you" style={{ padding: 10 }}>
                    <div className="duel-result-pick-lbl">Your Pick</div>
                    <div className={`duel-result-pick-val ${duel.humanDirection === 'UP' ? 'up' : 'dn'}`}>
                      {duel.humanDirection}
                      {' '}
                      {((duel.endPrice ?? 0) > duel.startPrice ? 'UP' : 'DOWN') === duel.humanDirection ? '✓' : '✗'}
                    </div>
                  </div>
                  <div className="hud-vs-card ai" style={{ padding: 10 }}>
                    <div className="duel-result-pick-lbl">{duel.agentName}</div>
                    <div className={`duel-result-pick-val ${duel.agentDirection === 'UP' ? 'up' : 'dn'}`}>
                      {duel.agentDirection}
                      {' '}
                      {((duel.endPrice ?? 0) > duel.startPrice ? 'UP' : 'DOWN') === duel.agentDirection ? '✓' : '✗'}
                    </div>
                  </div>
                </div>

                <div className="duel-result-cta">
                  <button type="button" onClick={reset} className="hud-btn hud-btn-outline" style={{ fontSize: 13 }}>
                    <i className="fa-solid fa-rotate-right text-[12px]" />
                    Play Again
                  </button>
                  {onChainTx && (
                    <a href={onChainTx.url} target="_blank" rel="noopener noreferrer" className="hud-btn hud-btn-gold" style={{ fontSize: 13 }}>
                      <i className="fa-solid fa-arrow-up-right-from-square text-[12px]" />
                      MantleScan
                    </a>
                  )}
                </div>
              </div>

              <p className="duel-footer-note">
                Agent analyzed live Bybit data using {duel.agentStrategy} strategy. Decision is tamper-proof and verifiable.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="hud-footer">
        <div className="hud-footer-inner">
          <span>MindClash · Mantle Turing Test Hackathon 2026</span>
        </div>
      </footer>
    </div>
  );
}

export default function DuelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--hud-bg)', color: 'var(--hud-text-dim)', fontFamily: 'var(--hud-font-mono)', fontSize: 13 }}>
        <i className="fa-solid fa-circle-notch fa-spin mr-2" />
        Loading…
      </div>
    }>
      <DuelPageInner />
    </Suspense>
  );
}
