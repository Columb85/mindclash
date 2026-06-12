'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, X, Trophy, Frown, Bot, Zap, Loader2, CheckCircle2, Lock, Radio, Calculator, Coins } from 'lucide-react';
import { Direction } from '@/types/room';
import type { BotResult } from './GameRoundInterface';

interface ResolutionRevealProps {
  open: boolean;
  onClose: () => void;
  winner: Direction | 'TIE';
  startPrice: number;
  endPrice: number;
  token: string;
  userOutcome?: 'win' | 'loss' | 'tie' | null;
  userPayout?: number;
  userStake?: number;
  botResults?: BotResult[];
  ptsGained?: number;
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
  token,
  userOutcome,
  userPayout = 0,
  userStake = 0,
  botResults = [],
  ptsGained = 0,
}: ResolutionRevealProps) {
  const diff = endPrice - startPrice;
  const diffPct = startPrice ? (diff / startPrice) * 100 : 0;

  // ── Resolving → Reveal phase machine ──
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

  // Animated PTS counter (starts when results are revealed)
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

  const beatenBots = botResults.filter(b => b.beat);
  const showBots = botResults.length > 0;

  const winnerConfig = {
    UP:   { color: '#22c55e', glow: 'rgba(34,197,94,0.35)', icon: TrendingUp, label: 'UP WINS' },
    DOWN: { color: '#ef4444', glow: 'rgba(239,68,68,0.35)', icon: TrendingDown, label: 'DOWN WINS' },
    TIE:  { color: '#9ca3af', glow: 'rgba(156,163,175,0.25)', icon: X, label: 'TIE' },
  }[winner];
  const Icon = winnerConfig.icon;

  const isResolving = phase === 'resolving';
  const totalSteps = RESOLVE_STEPS.length;
  const progress = Math.min(100, (currentStep / totalSteps) * 100);

  const resolveBorder = '#4f46e5';
  const resolveGlow = 'rgba(79,70,229,0.30)';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={isResolving ? undefined : onClose}
        >
          <motion.div
            key={phase}
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 260 }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border-2 p-8 overflow-hidden"
            style={{
              borderColor: isResolving ? resolveBorder : winnerConfig.color,
              background: `radial-gradient(ellipse at top, ${isResolving ? resolveGlow : winnerConfig.glow}, #0a0a0f 70%)`,
              boxShadow: `0 0 60px ${isResolving ? resolveGlow : winnerConfig.glow}`,
            }}
          >
            {/* Animated rays background — only in reveal */}
            {!isResolving && (
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-0"
                  style={{
                    background: `conic-gradient(from 0deg, transparent 0deg, ${winnerConfig.color}20 30deg, transparent 60deg, ${winnerConfig.color}20 120deg, transparent 150deg, ${winnerConfig.color}20 210deg, transparent 240deg, ${winnerConfig.color}20 300deg, transparent 330deg)`,
                  }}
                />
              </div>
            )}

            {/* Close button — hidden during resolve */}
            {!isResolving && (
              <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white z-10">
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="relative text-center">
              {isResolving ? (
                <ResolvingView
                  steps={RESOLVE_STEPS}
                  currentStep={currentStep}
                  progress={progress}
                />
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', delay: 0.15, damping: 12 }}
                    className="w-24 h-24 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{
                      background: `${winnerConfig.color}20`,
                      border: `2px solid ${winnerConfig.color}`,
                      boxShadow: `0 0 40px ${winnerConfig.glow}`,
                    }}
                  >
                    <Icon className="w-14 h-14" style={{ color: winnerConfig.color }} />
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-4xl font-black tracking-wider mb-2"
                    style={{ color: winnerConfig.color, textShadow: `0 0 20px ${winnerConfig.glow}` }}
                  >
                    {winnerConfig.label}
                  </motion.div>

                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-sm text-gray-300 mb-6"
                  >
                    <div className="flex items-center justify-center gap-4">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">Start</div>
                        <div className="font-bold">${startPrice.toFixed(2)}</div>
                      </div>
                      <div className="text-gray-600">→</div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase">End</div>
                        <div className="font-bold">${endPrice.toFixed(2)}</div>
                      </div>
                      <div
                        className="ml-2 px-2 py-1 rounded-lg text-xs font-bold"
                        style={{ background: `${winnerConfig.color}20`, color: winnerConfig.color }}
                      >
                        {diff >= 0 ? '+' : ''}{diffPct.toFixed(2)}%
                      </div>
                    </div>
                  </motion.div>

              {/* ── Bot Results ── */}
              {showBots && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.65 }}
                  className="mb-4 rounded-xl border border-dark-border bg-dark-bg/60 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-dark-border/60">
                    <Bot className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">AI Agents</span>
                    {beatenBots.length > 0 && (
                      <span className="ml-auto text-xs font-bold text-green-400">
                        You beat {beatenBots.length}/{botResults.length}
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-dark-border/40">
                    {botResults.map((bot, i) => {
                      const strategyLabel: Record<string, string> = {
                        'momentum': 'Momentum',
                        'mean-reversion': 'Mean Rev.',
                        'neural': 'Neural',
                      };
                      return (
                        <motion.div
                          key={bot.name}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.7 + i * 0.08 }}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
                            style={{
                              background: bot.beat ? '#22c55e20' : '#ef444420',
                              border: `1.5px solid ${bot.beat ? '#22c55e60' : '#ef444440'}`,
                              color: bot.beat ? '#22c55e' : '#ef4444',
                            }}
                          >
                            {bot.beat ? '✓' : '✗'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{bot.name}</div>
                            <div className="text-[10px] text-gray-500">{strategyLabel[bot.strategy] ?? bot.strategy}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {bot.direction === 'UP' && <TrendingUp className="w-3.5 h-3.5 text-green-400" />}
                            {bot.direction === 'DOWN' && <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
                            {bot.direction === null && <span className="text-[10px] text-gray-500">HELD</span>}
                            <span className={`text-[10px] font-bold ${
                              bot.direction === 'UP' ? 'text-green-400' :
                              bot.direction === 'DOWN' ? 'text-red-400' : 'text-gray-500'
                            }`}>{bot.direction ?? ''}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            bot.beat
                              ? 'bg-green-500/15 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}>
                            {bot.beat ? 'BEAT' : 'SAFE'}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ── User outcome ── */}
              {userOutcome && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: showBots ? 0.85 : 0.7 }}
                  className={`p-4 rounded-xl border-2 ${
                    userOutcome === 'win'
                      ? 'bg-green-500/10 border-green-500/40'
                      : userOutcome === 'tie'
                        ? 'bg-gray-500/10 border-gray-500/40'
                        : 'bg-red-500/10 border-red-500/40'
                  }`}
                >
                  {userOutcome === 'win' ? (
                    <div className="flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-green-500" />
                      <div className="text-left flex-1">
                        <div className="text-sm text-green-400 font-semibold">You won</div>
                        <div className="text-2xl font-black text-white">
                          +{(userPayout - userStake).toFixed(2)} {token}
                        </div>
                        <div className="text-xs text-gray-400">Total: {userPayout.toFixed(2)} {token}</div>
                      </div>
                      {ptsGained > 0 && (
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: showBots ? 1.0 : 0.85, type: 'spring', damping: 10 }}
                          className="flex flex-col items-center px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30"
                        >
                          <Zap className="w-4 h-4 text-blue-400 mb-0.5" />
                          <span className="text-lg font-black text-blue-400 tabular-nums">+{displayPts}</span>
                          <span className="text-[10px] text-blue-500 font-bold">PTS</span>
                        </motion.div>
                      )}
                    </div>
                  ) : userOutcome === 'tie' ? (
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <div className="text-sm font-semibold text-gray-300">Stake refunded</div>
                        <div className="text-xl font-bold text-white">{userStake.toFixed(2)} {token}</div>
                      </div>
                      {ptsGained > 0 && (
                        <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                          <Zap className="w-4 h-4 text-blue-400 mb-0.5" />
                          <span className="text-lg font-black text-blue-400 tabular-nums">+{displayPts}</span>
                          <span className="text-[10px] text-blue-500 font-bold">PTS</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Frown className="w-8 h-8 text-red-500" />
                      <div className="text-left flex-1">
                        <div className="text-sm text-red-400 font-semibold">You lost</div>
                        <div className="text-2xl font-black text-white">-{userStake.toFixed(2)} {token}</div>
                      </div>
                      {ptsGained > 0 && (
                        <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30">
                          <Zap className="w-4 h-4 text-blue-400 mb-0.5" />
                          <span className="text-lg font-black text-blue-400 tabular-nums">+{displayPts}</span>
                          <span className="text-[10px] text-blue-500 font-bold">PTS</span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: showBots ? 1.1 : 0.9 }}
                    onClick={onClose}
                    className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold hover:opacity-90 transition"
                  >
                    Continue
                  </motion.button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════════════
   RESOLVING VIEW — animated step-by-step progress
   ════════════════════════════════════════════════════════════════ */
function ResolvingView({
  steps,
  currentStep,
  progress,
}: {
  steps: typeof RESOLVE_STEPS;
  currentStep: number;
  progress: number;
}) {
  return (
    <div className="py-6 space-y-6">
      {/* Spinner + Title */}
      <div className="flex flex-col items-center gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-10 h-10 text-indigo-400" />
        </motion.div>
        <div>
          <div className="text-lg font-black text-white tracking-wide">Resolving Round</div>
          <div className="text-xs text-gray-500 mt-0.5">Please wait while we settle on-chain</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: 'linear-gradient(90deg, #6366f1, #818cf8)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ type: 'spring', damping: 20, stiffness: 150 }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-3 text-left">
        {steps.map((step, i) => {
          const done = currentStep > i;
          const active = currentStep === i;
          const StepIcon = step.icon;
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors"
              style={{
                borderColor: active ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)',
                background: active ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-indigo-400" />
                ) : active ? (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    <StepIcon className="w-5 h-5 text-indigo-400" />
                  </motion.div>
                ) : (
                  <StepIcon className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <span className={`text-sm font-semibold ${done ? 'text-gray-300' : active ? 'text-white' : 'text-gray-500'}`}>
                {step.label}
              </span>
              {active && (
                <motion.div
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400"
                  animate={{ scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
