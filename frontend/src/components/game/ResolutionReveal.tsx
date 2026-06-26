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
import { ShareOnXButton } from '@/components/ui/ShareOnXButton';
import { buildRoundResultShareText, type ShareCardParams } from '@/lib/share-x';
import { ASSETS } from '@/lib/web3-config';
import { CryptoIcon } from '@/components/icons/CryptoIcons';

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
  payoutError?: string | null;
  onRetryPayout?: () => void;
}

const RESOLVE_STEPS = [
  { label: 'Locking final price', icon: Lock },
  { label: 'Fetching oracle feed', icon: Radio },
  { label: 'Computing winning side', icon: Calculator },
  { label: 'Distributing payouts', icon: Coins },
];
const STEP_MS = 700;

const CRACKS = [
  'M50 50 L8 12', 'M50 50 L92 8', 'M50 50 L98 45', 'M50 50 L88 92',
  'M50 50 L55 98', 'M50 50 L12 88', 'M50 50 L2 52', 'M50 50 L18 28',
  'M50 50 L72 18', 'M50 50 L38 6', 'M50 50 L62 94', 'M50 50 L94 68',
];

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
  payoutError = null,
  onRetryPayout,
}: ResolutionRevealProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const diff = endPrice - startPrice;
  const diffPct = startPrice ? (diff / startPrice) * 100 : 0;
  const assetKey = asset.toUpperCase() as keyof typeof ASSETS;
  const assetMeta = ASSETS[assetKey] ?? ASSETS.BTC;

  const [phase, setPhase] = useState<'resolving' | 'reveal'>('resolving');
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!open) { setPhase('resolving'); setCurrentStep(0); return; }
    setPhase('resolving');
    setCurrentStep(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    RESOLVE_STEPS.forEach((_, i) => {
      timers.push(setTimeout(() => setCurrentStep(i + 1), STEP_MS * (i + 1)));
    });
    timers.push(setTimeout(() => setPhase('reveal'), STEP_MS * (RESOLVE_STEPS.length + 0.6)));
    return () => timers.forEach(clearTimeout);
  }, [open]);

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

  const fireConfetti = useCallback(() => {
    const colors = ['#00ff88', '#fbbf24', '#00e5ff', '#a855f7'];
    const end = Date.now() + 2800;
    const frame = () => {
      confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors, zIndex: 10002 });
      confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors, zIndex: 10002 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    setTimeout(() => confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors, zIndex: 10002 }), 150);
  }, []);

  useEffect(() => {
    if (phase === 'reveal' && userOutcome === 'win') fireConfetti();
  }, [phase, userOutcome, fireConfetti]);

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
  const accentColor = isWin ? '#00ff88' : isLoss ? '#ff3355' : winnerConfig.color;
  const displayToken = `$${token.toUpperCase()}`;

  const shareText = userOutcome
    ? buildRoundResultShareText({ asset, winner, outcome: userOutcome, stake: userStake, profit: isWin ? resultAmount : undefined, token, payoutTxHash })
    : '';

  const ogParams: ShareCardParams | undefined = userOutcome ? {
    outcome: userOutcome,
    amount: resultAmount.toFixed(0),
    asset,
    entry: fmtPrice(startPrice),
    exit: fmtPrice(endPrice),
    pct: diffPct.toFixed(2),
    xp: String(ptsGained),
  } : undefined;

  const sparkD = diffPct >= 0
    ? 'M2 14 L8 11 L14 12 L20 8 L26 9 L32 4 L38 2'
    : 'M2 4 L8 7 L14 6 L20 10 L26 9 L32 13 L38 14';

  function fmtPrice(p: number) {
    return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="rr-overlay"
          onClick={isResolving ? undefined : onClose}
        >
          {/* Red flash + cracks for loss */}
          {isLoss && !isResolving && (
            <>
              <motion.div
                className="rr-red-flash"
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
              <svg className="rr-cracks" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                {CRACKS.map((d, i) => (
                  <motion.path
                    key={d}
                    d={d}
                    fill="none"
                    stroke="rgba(255,255,255,0.7)"
                    strokeWidth={0.5}
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: [0, 1, 0.6] }}
                    transition={{ duration: 0.35, delay: i * 0.025, ease: 'easeOut' }}
                  />
                ))}
              </svg>
            </>
          )}

          <motion.div
            key={phase}
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            className={`rr-modal ${isLoss && !isResolving ? 'rr-modal--shake' : ''}`}
            style={{
              borderColor: isResolving ? '#4f46e5' : accentColor,
              boxShadow: `0 0 60px ${isResolving ? 'rgba(79,70,229,0.25)' : accentColor + '30'}, 0 20px 40px rgba(0,0,0,0.5)`,
            }}
          >
            {!isResolving && (
              <button onClick={onClose} className="rr-close" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            )}

            {isResolving ? (
              /* ── RESOLVE ── */
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
            ) : (
              /* ── REVEAL ── */
              <div className="rr-reveal-inner">
                {/* Title */}
                <motion.div
                  className="rr-result-title"
                  style={{ color: accentColor, textShadow: `0 0 24px ${accentColor}66` }}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 14, stiffness: 260 }}
                >
                  {isWin ? 'YOU WIN!' : isLoss ? 'YOU LOSE' : 'TIE'}
                </motion.div>

                <motion.div
                  className="rr-result-amount"
                  style={{ color: isWin ? '#a7f3d0' : isLoss ? '#fca5a5' : '#d1d5db' }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  {isWin ? '+' : isLoss ? '-' : ''}{resultAmount.toFixed(0)} {displayToken}
                </motion.div>

                {/* Asset row */}
                <motion.div
                  className="rr-asset-row"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <div className="rr-asset-left">
                    <div className="rr-asset-badge" style={{ background: `${assetMeta.color}22`, border: `1px solid ${assetMeta.color}55` }}>
                      <CryptoIcon symbol={assetMeta.symbol} className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="rr-asset-symbol">{assetMeta.symbol}</div>
                      <div className="rr-asset-name">{assetMeta.name}</div>
                    </div>
                  </div>
                  <div className="rr-asset-price">
                    <span className="rr-price-val">${fmtPrice(endPrice)}</span>
                    <span className="rr-price-change" style={{ color: winnerConfig.color }}>
                      {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%
                      {diffPct >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    </span>
                  </div>
                  <svg className="rr-sparkline" viewBox="0 0 40 16" aria-hidden>
                    <path d={sparkD} fill="none" stroke={winnerConfig.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>

                {/* Entry / Exit prices */}
                <motion.div
                  className="rr-prices-row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="rr-price-block">
                    <span className="rr-price-label">ENTRY</span>
                    <span className="rr-price-num">${fmtPrice(startPrice)}</span>
                  </div>
                  <div className="rr-price-arrow">→</div>
                  <div className="rr-price-block">
                    <span className="rr-price-label">EXIT</span>
                    <span className="rr-price-num">${fmtPrice(endPrice)}</span>
                  </div>
                  <div className="rr-price-pct" style={{ background: `${winnerConfig.color}18`, color: winnerConfig.color }}>
                    {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%
                  </div>
                </motion.div>

                {/* Stats */}
                <motion.div
                  className={`rr-stats ${ptsGained <= 0 ? 'rr-stats--solo' : ''}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <div className={`rr-stat ${isWin ? 'rr-stat--win' : 'rr-stat--loss'}`}>
                    <div className="rr-stat-label">{isWin ? 'YOU WON' : 'YOU LOST'}</div>
                    <div className="rr-stat-value">{isWin ? '+' : '-'}{resultAmount.toFixed(0)} {displayToken}</div>
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
                </motion.div>

                {/* On-chain status */}
                {isWin && (payoutStatus === 'claiming' || payoutStatus === 'paid' || payoutStatus === 'failed' || payoutTxHash) && (
                  <div className="rr-payout">
                    {payoutStatus === 'claiming' && (
                      <span className="flex items-center gap-1 text-cyan-400"><Loader2 className="w-3 h-3 animate-spin" />Sending on-chain payout…</span>
                    )}
                    {payoutStatus === 'paid' && (
                      <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" />{userPayout.toFixed(0)} {displayToken} received on-chain</span>
                    )}
                    {payoutStatus === 'failed' && (
                      <span className="flex flex-col items-center gap-1 text-red-400">
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          On-chain payout failed
                        </span>
                        {payoutError && (
                          <span className="text-[11px] text-red-300/80 text-center max-w-xs">{payoutError}</span>
                        )}
                        {onRetryPayout && (
                          <button type="button" onClick={onRetryPayout} className="text-[11px] text-cyan-400 hover:underline mt-1">
                            Retry payout
                          </button>
                        )}
                      </span>
                    )}
                    {payoutTxHash && (
                      <a href={`https://sepolia.mantlescan.xyz/tx/${payoutTxHash}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">View payout tx ↗</a>
                    )}
                  </div>
                )}

                {/* Buttons */}
                <motion.div
                  className="rr-actions"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                >
                  <button type="button" onClick={onClose} className={`rr-btn-primary ${isWin ? 'rr-btn--win' : isLoss ? 'rr-btn--loss' : 'rr-btn--tie'}`}>
                    {isWin ? 'CLAIM & CONTINUE' : 'CONTINUE'}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {shareText && <ShareOnXButton text={shareText} className="rr-btn-share" ogParams={ogParams} />}
                </motion.div>

                {isWin && <p className="rr-footer">Your rewards have been credited to your account.</p>}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
