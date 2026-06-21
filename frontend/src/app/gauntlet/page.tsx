'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Navigation, View } from '@/components/layout/Navigation';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { OnlineCounter } from '@/components/ui/OnlineCounter';
import { analyzeBotDecision, BotAnalysis } from '@/lib/bot-indicators';

const CHAMPIONS = [
  { tokenId: 5 as const, name: 'AlphaPredict',   strategy: 'Momentum',       color: '#3b82f6', title: 'The Trendsetter' },
  { tokenId: 6 as const, name: 'MomentumMaster', strategy: 'Mean-Reversion', color: '#a855f7', title: 'The Contrarian' },
  { tokenId: 7 as const, name: 'NeuralTrader',   strategy: 'Neural Net',     color: '#22c55e', title: 'The Mind' },
];

const ASSETS = ['BTC', 'ETH', 'SOL'] as const;
const ROUND_DURATION = 60;

type Phase = 'intro' | 'picking' | 'analyzing' | 'fighting' | 'round-result' | 'final';

interface RoundResult {
  championIdx: number;
  humanDirection: string;
  agentDirection: string;
  agentConfidence: number;
  agentReasoning: string;
  startPrice: number;
  endPrice: number;
  winner: 'human' | 'agent' | 'tie';
  priceChange: string;
}

async function fetchPrice(asset: string): Promise<number> {
  const r = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${asset}USDT`);
  const j = await r.json();
  return parseFloat(j?.result?.list?.[0]?.lastPrice ?? '0');
}

export default function GauntletPage() {
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [phase, setPhase] = useState<Phase>('intro');
  const [asset, setAsset] = useState<typeof ASSETS[number]>('BTC');
  const [roundIdx, setRoundIdx] = useState(0);
  const [direction, setDirection] = useState<'UP' | 'DOWN' | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [currentAnalysis, setCurrentAnalysis] = useState<BotAnalysis | null>(null);
  const [startPrice, setStartPrice] = useState(0);

  const endsAtRef = useRef(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [error, setError] = useState<string | null>(null);
  const champ = CHAMPIONS[roundIdx] ?? CHAMPIONS[0];
  const wins = results.filter(r => r.winner === 'human').length;

  const begin = () => {
    setPhase('picking');
    setRoundIdx(0);
    setResults([]);
    setDirection(null);
    setError(null);
  };

  const submitPick = useCallback(async () => {
    if (!direction) return;
    setError(null);
    setPhase('analyzing');
    try {
      const analysis = await analyzeBotDecision(champ.tokenId, asset, champ.strategy);
      setCurrentAnalysis(analysis);
      setStartPrice(analysis.market.price);
      endsAtRef.current = Math.floor(Date.now() / 1000) + ROUND_DURATION;
      setCountdown(ROUND_DURATION);
      setPhase('fighting');
    } catch (e) {
      setError('Failed to fetch market data. Please try again.');
      setPhase('picking');
    }
  }, [direction, champ, asset]);

  const resolveRound = async () => {
    const endP = await fetchPrice(asset);
    const actualDir = endP > startPrice ? 'UP' : endP < startPrice ? 'DOWN' : 'TIE';
    const agentDir = currentAnalysis?.decision.direction ?? 'UP';

    let winner: 'human' | 'agent' | 'tie';
    if (actualDir === 'TIE') winner = 'tie';
    else if (direction === actualDir && agentDir !== actualDir) winner = 'human';
    else if (agentDir === actualDir && direction !== actualDir) winner = 'agent';
    else winner = 'tie';

    const r: RoundResult = {
      championIdx: roundIdx,
      humanDirection: direction!,
      agentDirection: agentDir,
      agentConfidence: currentAnalysis?.decision.confidence ?? 0,
      agentReasoning: currentAnalysis?.decision.reasoning ?? '',
      startPrice,
      endPrice: endP,
      winner,
      priceChange: ((endP - startPrice) / startPrice * 100).toFixed(3),
    };

    setResults(prev => [...prev, r]);
    setPhase('round-result');
  };

  useEffect(() => {
    if (phase !== 'fighting') return;
    timerRef.current = setInterval(() => {
      const rem = Math.max(0, endsAtRef.current - Math.floor(Date.now() / 1000));
      setCountdown(rem);
      if (rem <= 0) {
        clearInterval(timerRef.current!);
        resolveRound();
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const nextRound = () => {
    if (roundIdx + 1 >= CHAMPIONS.length) setPhase('final');
    else {
      setRoundIdx(roundIdx + 1);
      setDirection(null);
      setPhase('picking');
    }
  };

  const restart = () => {
    setPhase('intro');
    setRoundIdx(0);
    setResults([]);
    setDirection(null);
  };

  const currentResult = results[roundIdx];

  const wlChip = (r: RoundResult | undefined) => {
    if (!r) return <span className="hud-wl-chip empty">?</span>;
    if (r.winner === 'human') return <span className="hud-wl-chip w">W</span>;
    if (r.winner === 'agent') return <span className="hud-wl-chip l">L</span>;
    return <span className="hud-wl-chip t">T</span>;
  };

  return (
    <div className="min-h-screen">
      <header className="hud-topbar">
        <div className="hud-topbar-inner">
          <Link href="/" className="hud-logo-text">
            <span className="logo-mind">Mind</span>
            <span className="logo-clash">Clash</span>
          </Link>
          <Navigation currentView={currentView} onViewChange={setCurrentView} activePage="gauntlet" />
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
        <div className="hud-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span className="bc-cur">
            <i className="fa-solid fa-shield-halved" style={{ marginRight: 6 }} />
            The Gauntlet
          </span>
          {phase !== 'intro' && phase !== 'final' && (
            <span className="hud-badge hud-badge-cyan">
              Round {roundIdx + 1} / {CHAMPIONS.length}
            </span>
          )}
        </div>
      </div>

      <main className="hud-shell hud-page-main-narrow">
        <AnimatePresence mode="wait">
          {phase === 'intro' && (
            <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="hud-section-panel">
                <div className="gnt-intro-hero">
                  <i className="fa-solid fa-shield-halved" />
                  <h2>The Agent Gauntlet</h2>
                  <p>Face all 3 AI champions in sequence. Predict price direction better than each bot to win. Beat all 3 to prove human supremacy.</p>
                </div>
                <div style={{ fontSize: 9, color: 'var(--hud-text-3)', textAlign: 'center', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Your opponents (in order)
                </div>
                <div className="gnt-champ-grid">
                  {CHAMPIONS.map((c, i) => (
                    <div key={c.tokenId} className="gnt-champ-card" style={{ borderColor: `${c.color}44` }}>
                      <div style={{ fontSize: 8, color: 'var(--hud-text-3)', marginBottom: 4 }}>Round {i + 1}</div>
                      <i className="fa-solid fa-robot" style={{ color: c.color, fontSize: 20 }} />
                      <div className="cn" style={{ color: c.color }}>{c.name}</div>
                      <div className="ct">{c.title}</div>
                      <div className="cs">{c.strategy}</div>
                    </div>
                  ))}
                </div>
                <div className="ca-field-lbl" style={{ textAlign: 'center' }}>Select Asset for all rounds</div>
                <div className="hud-chip-row" style={{ justifyContent: 'center', marginBottom: 12 }}>
                  {ASSETS.map(a => (
                    <button key={a} type="button" onClick={() => setAsset(a)} className={`hud-chip${asset === a ? ' active' : ''}`}>{a}</button>
                  ))}
                </div>
                <button type="button" onClick={begin} className="hud-btn hud-btn-gold hud-btn-full" style={{ padding: 12, fontSize: 12 }}>
                  <i className="fa-solid fa-shield-halved" /> Enter The Gauntlet
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'picking' && (
            <motion.div key="picking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="hud-section-panel">
                <div className="gnt-round-hdr">
                  <div className="rn">Round {roundIdx + 1} / {CHAMPIONS.length}</div>
                  <h3>vs <span style={{ color: champ.color }}>{champ.name}</span></h3>
                  <div style={{ fontSize: 10, color: 'var(--hud-text-3)' }}>{champ.title} — {champ.strategy} · {asset}/USDT · {ROUND_DURATION}s</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <button type="button" onClick={() => setDirection('UP')} className={`hud-dir-btn up${direction === 'UP' ? ' active' : ''}`}>
                    <i className="fa-solid fa-arrow-trend-up" />
                    <div className="dir-lbl">UP</div>
                  </button>
                  <button type="button" onClick={() => setDirection('DOWN')} className={`hud-dir-btn dn${direction === 'DOWN' ? ' active' : ''}`}>
                    <i className="fa-solid fa-arrow-trend-down" />
                    <div className="dir-lbl">DOWN</div>
                  </button>
                </div>
                {error && (
                  <div style={{ fontSize: 10, color: 'var(--hud-red)', textAlign: 'center', marginBottom: 8 }}>
                    <i className="fa-solid fa-exclamation-triangle" /> {error}
                  </div>
                )}
                <button type="button" onClick={submitPick} disabled={!direction} className="hud-btn hud-btn-gold hud-btn-full">
                  Lock In &amp; Fight
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="ca-phase-center">
              <i className="fa-solid fa-robot" style={{ fontSize: 40, color: champ.color }} />
              <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: 24, color: '#f97316' }} />
              <div className="ca-phase-sub">{champ.name} is analyzing {asset}/USDT…</div>
            </motion.div>
          )}

          {phase === 'fighting' && currentAnalysis && (
            <motion.div key="fighting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="hud-section-panel">
                <motion.div key={countdown} initial={{ scale: 1.05 }} animate={{ scale: 1 }} className="hud-countdown-big">
                  {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                </motion.div>
                <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--hud-text-3)', marginBottom: 14 }}>
                  Round {roundIdx + 1} — {asset}/USDT
                </div>
                <div className="hud-vs-row">
                  <div className="hud-vs-card you">
                    <div style={{ fontSize: 10, color: 'var(--hud-text-3)' }}>You</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)' }}>{direction}</div>
                  </div>
                  <div className="hud-vs-mid">VS</div>
                  <div className="hud-vs-card ai">
                    <div style={{ fontSize: 10, color: champ.color }}>{champ.name}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: currentAnalysis.decision.direction === 'UP' ? 'var(--hud-green)' : 'var(--hud-red)' }}>
                      {currentAnalysis.decision.direction}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 9, color: 'var(--hud-text-3)', fontFamily: 'var(--hud-font-mono)', textAlign: 'center', marginTop: 10, fontStyle: 'italic' }}>
                  &ldquo;{currentAnalysis.decision.reasoning}&rdquo;
                </p>
              </div>
            </motion.div>
          )}

          {phase === 'round-result' && currentResult && (
            <motion.div key="round-result" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className={`hud-result-banner ${currentResult.winner === 'human' ? 'win' : currentResult.winner === 'agent' ? 'loss' : 'tie'}`}>
                <div style={{ fontSize: 18, fontWeight: 600, color: currentResult.winner === 'human' ? 'var(--hud-green)' : currentResult.winner === 'agent' ? 'var(--hud-red)' : 'var(--hud-gold)' }}>
                  {currentResult.winner === 'human' && `You beat ${CHAMPIONS[currentResult.championIdx].name}!`}
                  {currentResult.winner === 'agent' && `${CHAMPIONS[currentResult.championIdx].name} wins this round`}
                  {currentResult.winner === 'tie' && 'Tie!'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--hud-text-3)', marginTop: 4 }}>
                  ${currentResult.startPrice.toLocaleString()} → ${currentResult.endPrice.toLocaleString()} ({currentResult.priceChange}%)
                </div>
                <div className="hud-banner-wl">
                  {CHAMPIONS.map((_, i) => wlChip(results[i]))}
                </div>
                <button type="button" onClick={nextRound} className="hud-btn hud-btn-gold" style={{ marginTop: 12 }}>
                  {roundIdx + 1 >= CHAMPIONS.length ? 'See Final Results' : `Next: ${CHAMPIONS[roundIdx + 1].name}`}
                </button>
              </div>
            </motion.div>
          )}

          {phase === 'final' && (
            <motion.div key="final" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="hud-section-panel" style={{ textAlign: 'center' }}>
                <i className="fa-solid fa-crown" style={{ fontSize: 40, color: 'var(--hud-gold)', marginBottom: 8 }} />
                <h2 style={{ fontFamily: 'var(--hud-font-head)', fontSize: 22, fontWeight: 600, color: '#fff', textTransform: 'uppercase' }}>
                  {wins === 3 && 'Flawless Victory!'}
                  {wins === 2 && 'You Conquered The Gauntlet!'}
                  {wins === 1 && 'Close Fight!'}
                  {wins === 0 && 'The Machines Win… This Time'}
                </h2>
                <div className="gnt-final-score">{wins} / {CHAMPIONS.length}</div>
                <div style={{ fontSize: 10, color: 'var(--hud-text-3)', marginBottom: 14 }}>rounds won</div>
                <div className="gnt-round-list">
                  {results.map((r, i) => (
                    <div key={i} className="gnt-round-item">
                      <i className="fa-solid fa-robot" style={{ color: CHAMPIONS[i].color }} />
                      <div>
                        <div className="ri-name" style={{ color: CHAMPIONS[i].color }}>{CHAMPIONS[i].name}</div>
                        <div className="ri-meta">You: {r.humanDirection} vs Agent: {r.agentDirection}</div>
                      </div>
                      <span className={`hud-wl-chip wide ${r.winner === 'human' ? 'w' : r.winner === 'agent' ? 'l' : 't'}`}>
                        {r.winner === 'human' ? 'WIN' : r.winner === 'agent' ? 'LOSS' : 'TIE'}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14, flexWrap: 'wrap' }}>
                  <button type="button" onClick={restart} className="hud-btn hud-btn-ghost">
                    <i className="fa-solid fa-rotate-right" /> Try Again
                  </button>
                  <Link href="/duel" className="hud-btn hud-btn-red">
                    <i className="fa-solid fa-bolt" /> Quick Duel
                  </Link>
                </div>
              </div>
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
