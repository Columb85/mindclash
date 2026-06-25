'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, X, Star, ChevronRight,
  Loader2, CheckCircle2, Lock, Radio, Calculator, Coins, AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Direction } from '@/types/room';
import type { BotResult } from './GameRoundInterface';
import { MindClashLogo } from '@/components/ui/MindClashLogo';
import { ShareOnXButton } from '@/components/ui/ShareOnXButton';
import { buildRoundResultShareText } from '@/lib/share-x';
import { ASSETS } from '@/lib/web3-config';

interface ResolutionRevealProps {
  open: boolean;
  onClose: () => void;
  winner: Direction | 'TIE';
  startPrice: number;
  endPrice: number;
  asset?: string;
  token: string;
  userOutcome?: 'win' | 'loss' | 'tie' | null;
  userPayout?: number;
  userStake?: number;
  botResults?: BotResult[];
  ptsGained?: number;
  payoutTxHash?: string | null;
  payoutStatus?: 'idle' | 'claiming' | 'paid' | 'failed';
}

const RESOLVE_STEPS = [
  { label: 'Locking final price', icon: Lock },
  { label: 'Fetching oracle feed', icon: Radio },
  { label: 'Computing winning side', icon: Calculator },
  { label: 'Distributing payouts', icon: Coins },
];
const STEP_MS = 700;

export function ResolutionReveal({
  open,
  onClose,
  winner,
  startPrice,
  endPrice,
  asset = 'BTC',
  token,
  userOutcome,
  userPayout = 0,
  userStake = 0,
  botResults = [],
  ptsGained = 0,
  payoutTxHash = null,
  payoutStatus = 'idle',
}: ResolutionRevealProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const diff = endPrice - startPrice;
  const diffPct = startPrice ? (diff / startPrice) * 100 : 0;
  const assetKey = asset.toUpperCase() as keyof typeof ASSETS;
  const assetMeta = ASSETS[assetKey] ?? ASSETS.BTC;

  // Phase machine
  const [phase, setPhase] = useState<'resolving' | 'reveal'>('resolving');
  const [currentStep, setCurrentStep] = useState(0);
  const [showCard, setShowCard] = useState(false);

  useEffect(() => {
    if (!open) { setPhase('resolving'); setCurrentStep(0); setShowCard(false); return; }
    setPhase('resolving');
    setCurrentStep(0);
    setShowCard(false);
    const timers: ReturnType<typeof setTimeout>[] = [];
    RESOLVE_STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setCurrentStep(i + 1), STEP_MS * (i + 1)));
    });
    timers.push(setTimeout(() => setPhase('reveal'), STEP_MS * (RESOLVE_STEPS.length + 0.6)));
    return () => timers.forEach(clearTimeout);
  }, [open]);

  useEffect(() => {
    if (phase !== 'reveal' || !open) return;
    const t = setTimeout(() => setShowCard(true), 1200);
    return () => clearTimeout(t);
  }, [phase, open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Animated PTS counter
  const [displayPts, setDisplayPts] = useState(0);
  useEffect(() => {
    if (!open || phase !== 'reveal' || ptsGained <= 0) { setDisplayPts(0); return; }
    let frame = 0;
    const frames = 36;
    const timer = setInterval(() => {
      frame++;
      setDisplayPts(Math.floor((ptsGained * frame) / frames));
      if (frame >= frames) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [open, phase, ptsGained]);

  // Confetti
  const fireConfetti = useCallback((burst = false) => {
    const duration = burst ? 3200 : 2500;
    const end = Date.now() + duration;
    const colors = ['#00ff88', '#fbbf24', '#00e5ff', '#a855f7'];
    const frame = () => {
      confetti({ particleCount: burst ? 5 : 3, angle: 60, spread: 55, origin: { x: 0, y: 0.55 }, colors, zIndex: 9999 });
      confetti({ particleCount: burst ? 5 : 3, angle: 120, spread: 55, origin: { x: 1, y: 0.55 }, colors, zIndex: 9999 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    setTimeout(() => {
      confetti({ particleCount: burst ? 140 : 100, spread: burst ? 90 : 70, origin: { y: 0.45 }, colors, zIndex: 9999 });
    }, burst ? 80 : 200);
  }, []);

  useEffect(() => {
    if (phase === 'reveal' && userOutcome === 'win') fireConfetti();
  }, [phase, userOutcome, fireConfetti]);

  useEffect(() => {
    if (showCard && userOutcome === 'win') fireConfetti(true);
  }, [showCard, userOutcome, fireConfetti]);

  const winnerConfig = {
    UP:   { color: '#22c55e', glow: 'rgba(34,197,94,0.35)', label: 'UP' },
    DOWN: { color: '#ef4444', glow: 'rgba(239,68,68,0.35)', label: 'DOWN' },
    TIE:  { color: '#9ca3af', glow: 'rgba(156,163,175,0.25)', label: 'TIE' },
  }[winner];

  const isResolving = phase === 'resolving';
  const isWin = userOutcome === 'win';
  const isLoss = userOutcome === 'loss';
  const totalSteps = RESOLVE_STEPS.length;
  const progress = Math.min(100, (currentStep / totalSteps) * 100);
  const resultAmount = isWin ? userPayout - userStake : userStake;

  const shareText = userOutcome
    ? buildRoundResultShareText({ asset, winner, outcome: userOutcome, stake: userStake, profit: isWin ? resultAmount : undefined, token, payoutTxHash })
    : '';

  const sparkD = diffPct >= 0
    ? 'M2 14 L8 11 L14 12 L20 8 L26 9 L32 4 L38 2'
    : 'M2 4 L8 7 L14 6 L20 10 L26 9 L32 13 L38 14';

  const accentColor = isWin ? '#00ff88' : isLoss ? '#ff3355' : winnerConfig.color;

  function formatPrice(p: number) {
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 9000 }}
          className="rr-backdrop"
        >
          {/* ── PHASE 1: RESOLVE ── */}
          {isResolving && (
            <div className="rr-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                className="rr-resolve-card"
              >
                <div className="rr-resolve-inner">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Loader2 className="w-10 h-10 text-indigo-400" />
                  </motion.div>
                  <div className="rr-resolve-title">Resolving Round</div>

                  <div className="rr-progress-track">
                    <motion.div
                      className="rr-progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                    />
                  </div>
                  <div className="rr-progress-pct">{Math.round(progress)}%</div>

                  <div className="rr-steps">
                    {RESOLVE_STEPS.map((step, i) => {
                      const done = currentStep > i;
                      const active = currentStep === i;
                      return (
                        <motion.div
                          key={step.label}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`rr-step ${done ? 'rr-step--done' : active ? 'rr-step--active' : ''}`}
                        >
                          <div className="rr-step-icon">
                            {done ? <CheckCircle2 className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                          </div>
                          <span>{step.label}</span>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── PHASE 2: REVEAL ── */}
          {!isResolving && (
            <div className="rr-reveal" onClick={showCard ? onClose : undefined}>
              {/* Glow background */}
              <div className="rr-glow" style={{
                background: `radial-gradient(ellipse 80% 60% at 50% 30%, ${accentColor}30 0%, transparent 60%), radial-gradient(ellipse 100% 100% at 50% 50%, transparent 20%, rgba(0,0,0,0.9) 100%)`,
              }} />

              {/* Hero section */}
              <div className="rr-hero">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <MindClashLogo size="overlay" />
                </motion.div>

                <motion.div
                  className="rr-hero-title"
                  style={{ color: accentColor, textShadow: `0 0 40px ${accentColor}88, 0 0 80px ${accentColor}44` }}
                  initial={{ scale: 1.4, opacity: 0, y: 16 }}
                  animate={{ scale: showCard ? 0.75 : 1, opacity: 1, y: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 260, delay: 0.08 }}
                >
                  {isWin ? 'YOU WIN' : isLoss ? 'YOU LOSE' : 'TIE'}
                </motion.div>

                <motion.div
                  className="rr-hero-amount"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25, duration: 0.35 }}
                >
                  {isWin ? '+' : isLoss ? '-' : ''}{resultAmount.toFixed(0)} {token}
                </motion.div>

                <motion.div
                  className="rr-hero-market"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  MARKET WENT {winnerConfig.label} {diffPct >= 0 ? '↑' : '↓'}
                </motion.div>
              </div>

              {/* Detail card */}
              <AnimatePresence>
                {showCard && (
                  <motion.div
                    className="rr-card-wrap"
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 60, opacity: 0 }}
                    transition={{ type: 'spring', damping: 24, stiffness: 280 }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div className={`rr-card ${isWin ? 'rr-card--win' : isLoss ? 'rr-card--loss' : 'rr-card--tie'}`}>
                      {/* Asset row */}
                      <div className="rr-asset-row">
                        <div className="rr-asset-left">
                          <div className="rr-asset-badge" style={{ background: `${assetMeta.color}22`, color: assetMeta.color, border: `1px solid ${assetMeta.color}55` }}>
                            {assetMeta.icon}
                          </div>
                          <div>
                            <div className="rr-asset-symbol">{assetMeta.symbol}</div>
                            <div className="rr-asset-name">{assetMeta.name}</div>
                          </div>
                        </div>
                        <div className="rr-asset-price">
                          <span className="rr-price-val">${formatPrice(endPrice)}</span>
                          <span className="rr-price-change" style={{ color: winnerConfig.color }}>
                            {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%
                            {diffPct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          </span>
                        </div>
                        <svg className="rr-sparkline" viewBox="0 0 40 16" aria-hidden>
                          <path d={sparkD} fill="none" stroke={winnerConfig.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>

                      {/* Stats */}
                      <div className="rr-stats">
                        <div className={`rr-stat ${isWin ? 'rr-stat--win' : 'rr-stat--loss'}`}>
                          <div className="rr-stat-label">{isWin ? 'YOU WON' : 'YOU LOST'}</div>
                          <div className="rr-stat-value">{isWin ? '+' : '-'}{resultAmount.toFixed(0)} {token}</div>
                        </div>
                        {ptsGained > 0 && (
                          <div className="rr-stat rr-stat--xp">
                            <div className="rr-stat-xp-head">
                              <span className="rr-stat-label rr-stat-label--xp">XP EARNED</span>
                              <Star className="w-4 h-4 text-purple-400" />
                            </div>
                            <div className="rr-stat-value rr-stat-value--xp">+{displayPts} XP</div>
                          </div>
                        )}
                      </div>

                      {/* On-chain status */}
                      {isWin && (payoutStatus === 'claiming' || payoutStatus === 'paid' || payoutStatus === 'failed' || payoutTxHash) && (
                        <div className="rr-payout">
                          {payoutStatus === 'claiming' && (
                            <span className="flex items-center gap-1 text-cyan-400"><Loader2 className="w-3 h-3 animate-spin" />Sending on-chain payout…</span>
                          )}
                          {payoutStatus === 'paid' && (
                            <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" />{userPayout.toFixed(0)} {token} received on-chain</span>
                          )}
                          {payoutStatus === 'failed' && (
                            <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-3 h-3" />On-chain payout failed</span>
                          )}
                          {payoutTxHash && (
                            <a href={`https://sepolia.mantlescan.xyz/tx/${payoutTxHash}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">View payout tx ↗</a>
                          )}
                        </div>
                      )}

                      {/* Buttons */}
                      <div className="rr-actions">
                        <button type="button" onClick={onClose} className={`rr-btn-primary ${isWin ? 'rr-btn--win' : 'rr-btn--loss'}`}>
                          {isWin ? 'CLAIM & CONTINUE' : 'CONTINUE'}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        {shareText && <ShareOnXButton text={shareText} className="rr-btn-share" />}
                      </div>

                      {isWin && <p className="rr-footer">Your rewards have been credited to your account.</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tie fallback — no card, just continue button */}
              {userOutcome === 'tie' && showCard && (
                <motion.div
                  className="rr-card-wrap"
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="rr-card rr-card--tie">
                    <div className="text-center text-sm text-gray-400 mb-3">Stake refunded: {userStake.toFixed(0)} {token}</div>
                    <button type="button" onClick={onClose} className="rr-btn-primary rr-btn--tie">CONTINUE <ChevronRight className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
