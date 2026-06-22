'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Navigation, View } from '@/components/layout/Navigation';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { OnlineCounter } from '@/components/ui/OnlineCounter';

const STAGES = [
  {
    id: 'fetch',
    icon: 'fa-solid fa-database',
    title: 'Fetch Market Data',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.15)',
    description: 'Bybit REST API — klines, order book, 24h ticker',
    code: `klines = bybit.get_klines(symbol="BTCUSDT", interval="1", limit=30)\nticker = bybit.get_tickers(symbol="BTCUSDT")`,
    duration: 2000,
  },
  {
    id: 'indicators',
    icon: 'fa-solid fa-chart-bar',
    title: 'Compute Indicators',
    color: '#a855f7',
    bg: 'var(--hud-purple-dim)',
    description: 'RSI(14), SMA(10/20), Bollinger Bands, volume, momentum',
    code: `rsi = calc_rsi(closes, 14)\nsma10 = calc_sma(closes, 10)\nboll = calc_bollinger(closes, 20, 2)`,
    duration: 1500,
  },
  {
    id: 'strategy',
    icon: 'fa-solid fa-brain',
    title: 'Apply Strategy',
    color: '#22c55e',
    bg: 'var(--hud-green-dim)',
    description: 'Momentum / Mean-Reversion / Neural weighted signals',
    code: `signals = strategy.evaluate(indicators)\ndirection = "UP" if bull_count >= threshold else "DOWN"\nconfidence = min(950, base + bull_count * weight)`,
    duration: 2000,
  },
  {
    id: 'decide',
    icon: 'fa-solid fa-bolt',
    title: 'Decide',
    color: '#eab308',
    bg: 'var(--hud-gold-dim)',
    description: 'Final direction, confidence 0–100%, reasoning string',
    code: `decision = Decision(\n  direction="UP", confidence=780,\n  reasoning="Momentum: 4/5 bullish signals"\n)`,
    duration: 1000,
  },
  {
    id: 'submit',
    icon: 'fa-solid fa-circle-check',
    title: 'Record On-Chain',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.15)',
    description: 'AgentNFT.recordDecision() on Mantle Sepolia',
    code: `tx = contract.recordDecision(\n  tokenId=5, direction="UP",\n  confidence=780, stake=250,\n  reasoning="Momentum: 4/5 bullish"\n)`,
    duration: 3000,
  },
  {
    id: 'resolve',
    icon: 'fa-solid fa-arrows-rotate',
    title: 'Resolve',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.15)',
    description: 'resolveDecision() with actual price — updates win rate & PnL',
    code: `contract.resolveDecision(\n  tokenId=5, decisionIndex=42,\n  wasCorrect=True, pnl=125\n)`,
    duration: 2000,
  },
];

const NFT_ADDR = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';
const EXPLORER = 'https://sepolia.mantlescan.xyz';

export default function AutonomousPage() {
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [playing, setPlaying] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const [cycleCount, setCycleCount] = useState(0);
  const [barProgress, setBarProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const barRef = useRef<NodeJS.Timeout | null>(null);

  const advanceStage = () => {
    setCurrentStage(prev => {
      const next = prev + 1;
      if (next >= STAGES.length) {
        setCycleCount(c => c + 1);
        setCompletedStages(new Set());
        setBarProgress(0);
        return 0;
      }
      if (prev >= 0) {
        setCompletedStages(s => new Set([...s, STAGES[prev].id]));
      }
      setBarProgress(0);
      return next;
    });
  };

  useEffect(() => {
    if (!playing) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (barRef.current) clearInterval(barRef.current);
      return;
    }

    if (currentStage === -1) {
      setCurrentStage(0);
      return;
    }

    const stage = STAGES[currentStage];
    if (!stage) return;

    const tickMs = 80;
    const steps = stage.duration / tickMs;
    let step = 0;
    barRef.current = setInterval(() => {
      step++;
      setBarProgress(Math.min(100, (step / steps) * 100));
    }, tickMs);

    timerRef.current = setTimeout(() => {
      if (barRef.current) clearInterval(barRef.current);
      advanceStage();
    }, stage.duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (barRef.current) clearInterval(barRef.current);
    };
  }, [playing, currentStage]);

  const togglePlay = () => {
    if (!playing) {
      if (currentStage === -1 || currentStage >= STAGES.length - 1) {
        setCurrentStage(-1);
        setCompletedStages(new Set());
        setBarProgress(0);
      }
      setPlaying(true);
    } else {
      setPlaying(false);
    }
  };

  const totalCycles = cycleCount + (currentStage >= 0 && playing ? 1 : 0);

  return (
    <div className="min-h-screen">
      <header className="hud-topbar">
        <div className="hud-topbar-inner">
          <Link href="/" className="hud-logo-text">
            <span className="logo-mind">Mind</span>
            <span className="logo-clash">Clash</span>
          </Link>
          <Navigation currentView={currentView} onViewChange={setCurrentView} activePage="autonomous" />
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
            <i className="fa-solid fa-robot" style={{ marginRight: 6 }} />
            Bot Loop
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--hud-text-3)' }}>
              Cycles: <strong style={{ color: '#fff', fontFamily: 'var(--hud-font-mono)' }}>{totalCycles}</strong>
            </span>
            <button type="button" onClick={togglePlay} className={`hud-btn ${playing ? 'hud-btn-red' : 'hud-btn-cyan'}`}>
              <i className={`fa-solid fa-${playing ? 'pause' : 'play'}`} />
              {playing ? 'Pause' : 'Start Loop'}
            </button>
          </div>
        </div>
      </div>

      <main className="hud-shell hud-page-main-md">
        <div className="bot-intro">
          <h2>How the AI Bot Works</h2>
          <p>Autonomous decision loop runs every 30 minutes per bot, plus every live round. Fetches live market data, runs strategy logic, records on Mantle blockchain.</p>
        </div>

        <div id="pipeline">
          {STAGES.map((stage, i) => {
            const isCurrent = currentStage === i;
            const isCompleted = completedStages.has(stage.id);
            const isActive = isCurrent && playing;
            const barWidth = isCompleted ? 100 : isActive ? barProgress : 0;

            return (
              <div
                key={stage.id}
                className={`bot-pipeline-stage${isActive ? ' active' : ''}${isCompleted ? ' done' : ''}`}
              >
                <div className="bot-pipe-hdr">
                  <div className="bot-pipe-icon" style={{ background: stage.bg, color: stage.color }}>
                    <i className={stage.icon} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="bot-pipe-title">{i + 1}. {stage.title}</div>
                    <div className="bot-pipe-desc">{stage.description}</div>
                  </div>
                  {isCompleted && <i className="fa-solid fa-circle-check" style={{ color: 'var(--hud-green)' }} />}
                  {isActive && <i className="fa-solid fa-spinner fa-spin" style={{ color: 'var(--hud-cyan)' }} />}
                </div>
                <div className="bot-pipe-bar">
                  <div className="bot-pipe-bar-fill" style={{ width: `${barWidth}%` }} />
                </div>
                {(isActive || isCompleted) && (
                  <pre className="bot-pipe-code">{stage.code}</pre>
                )}
              </div>
            );
          })}
        </div>

        <div className="hud-section-panel" style={{ marginTop: 16 }}>
          <div className="ca-panel-title" style={{ marginBottom: 10 }}>Architecture</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, fontSize: 11 }}>
            <div>
              <div style={{ color: 'var(--hud-cyan)', fontWeight: 600, marginBottom: 4 }}>Node.js Bot</div>
              <div style={{ color: 'var(--hud-text-dim)', lineHeight: 1.45 }}>Runs every 30 min + every live round. Fetches Bybit data, computes indicators, submits to chain.</div>
            </div>
            <div>
              <div style={{ color: 'var(--hud-purple)', fontWeight: 600, marginBottom: 4 }}>Smart Contract</div>
              <div style={{ color: 'var(--hud-text-dim)', lineHeight: 1.45 }}>AgentNFT on Mantle Sepolia stores decisions &amp; win rates. ERC-8004 IdentityRegistry &amp; ReputationRegistry track canonical reputation.</div>
            </div>
            <div>
              <div style={{ color: 'var(--hud-green)', fontWeight: 600, marginBottom: 4 }}>3 Agents</div>
              <div style={{ color: 'var(--hud-text-dim)', lineHeight: 1.45 }}>AlphaPredict, MomentumMaster, NeuralTrader — Token IDs 5, 6, 7.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <a href={`${EXPLORER}/address/${NFT_ADDR}`} target="_blank" rel="noopener noreferrer" className="hud-btn hud-btn-cyan">
              <i className="fa-solid fa-arrow-up-right-from-square" /> View Contract
            </a>
            <Link href="/leaderboard" className="hud-btn hud-btn-ghost">
              <i className="fa-solid fa-trophy" /> Agent Leaderboard
            </Link>
          </div>
        </div>
      </main>

      <footer className="hud-footer">
        <div className="hud-footer-inner">
          <span>MindClash · Mantle Turing Test Hackathon 2026</span>
        </div>
      </footer>
    </div>
  );
}
