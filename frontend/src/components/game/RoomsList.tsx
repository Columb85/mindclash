'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Play, Eye, Bot } from 'lucide-react';
import { useRooms } from '@/contexts/RoomsContext';
import { ASSETS } from '@/lib/web3-config';
import { Room, PricePoint } from '@/types/room';

// AI Bot profiles keyed by wallet address (lowercase)
const BOT_PROFILES_MAP: Record<string, { name: string; avatar: string; gradient: string; taunts: Record<'UP'|'DOWN', string[]> }> = {
  '0xd33744400ed8211f7a5900926df22cd8c2a2ad74': {
    name: 'AlphaPredict', avatar: '🤖', gradient: 'from-blue-500 to-cyan-500',
    taunts: {
      UP:   ['Trend locked. Riding UP while humans hesitate. 📈', 'Momentum doesn\'t lie. UP. Can you beat that?', 'The trend is your friend — if you\'re smart enough to follow it. 🔥'],
      DOWN: ['The fall is inevitable, like sunrise 📉', 'Get your parachutes ready!', 'Pattern: clear. Signal: DOWN. Execution: instant.'],
    }
  },
  '0x62bc9ab4dcdd43ec1f6fda4f71220f6f85b80a59': {
    name: 'MomentumMaster', avatar: '⚡', gradient: 'from-purple-500 to-pink-500',
    taunts: {
      UP:   ['RSI oversold. The herd goes DOWN. I go UP. That\'s alpha.', 'Classic mean reversion setup. UP incoming.', 'The crowd is always wrong at extremes. I go UP.'],
      DOWN: ['Overbought crowd chasing UP. My model says DOWN.', 'Bollinger Band screams reversal. Going DOWN.', 'Fade the crowd. DOWN. History agrees with me.'],
    }
  },
  '0x508eaddf521ae4887aecfec2d7d7c43f94bd7c39': {
    name: 'NeuralTrader', avatar: '🧠', gradient: 'from-green-500 to-emerald-500',
    taunts: {
      UP:   ['5 signals processed. Consensus: UP. Logic, not luck.', 'While you guess, I compute. Result: UP. Q.E.D.', 'My training data: 50 000 patterns. This one says UP.'],
      DOWN: ['Multi-signal divergence analysis complete. Direction: DOWN.', '5/5 signals agree: DOWN. Probability beats intuition.', 'Neural consensus: DOWN. Uncertainty: minimal.'],
    }
  },
};

/** Deterministic index from a string seed — avoids random on every re-render */
function seedIndex(seed: string, length: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) { h = Math.imul(31, h) + seed.charCodeAt(i) | 0; }
  return Math.abs(h) % length;
}

/** Extract real bot predictions from a room and return display-ready data */
function getRealBotPredictions(room: Room) {
  return room.predictions
    .map(p => {
      const profile = BOT_PROFILES_MAP[p.address.toLowerCase()];
      if (!profile) return null;
      const tauntList = profile.taunts[p.direction as 'UP' | 'DOWN'];
      // Stable selection keyed on room.id + address → same taunt every render for this round
      const taunt = tauntList[seedIndex(`${room.id}:${p.address}`, tauntList.length)];
      return {
        name: profile.name,
        avatar: profile.avatar,
        gradient: profile.gradient,
        direction: p.direction as 'UP' | 'DOWN',
        amount: p.amount,
        taunt,
      };
    })
    .filter(Boolean) as Array<{ name: string; avatar: string; gradient: string; direction: 'UP'|'DOWN'; amount: number; taunt: string }>;
}

// ── Typing taunt component ────────────────────────────────────────────────────

function TypingTaunt({ text, delay = 0 }: { text: string; delay?: number }) {
  const [phase, setPhase] = useState<'waiting' | 'typing' | 'done'>('waiting');
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    setPhase('waiting');
    setDisplayed('');

    // Keep both timers at effect scope so cleanup can cancel them both
    let typeTimer: ReturnType<typeof setInterval> | null = null;

    const delayTimer = setTimeout(() => {
      setPhase('typing');
      let i = 0;
      typeTimer = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(typeTimer!);
          typeTimer = null;
          setPhase('done');
        }
      }, 28);
    }, delay);

    return () => {
      clearTimeout(delayTimer);
      if (typeTimer) clearInterval(typeTimer);
    };
  }, [text, delay]);

  return (
    <span className="text-[10px] text-gray-400 italic">
      &ldquo;
      {phase === 'waiting' ? (
        // Thinking dots
        <span className="inline-flex gap-0.5 items-end ml-0.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="inline-block w-1 h-1 rounded-full bg-gray-500"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </span>
      ) : (
        <>
          {displayed}
          {phase === 'typing' && (
            <motion.span
              className="inline-block w-[1px] h-[10px] bg-gray-400 ml-[1px] align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
          {phase === 'done' && '\u201d'}
        </>
      )}
    </span>
  );
}

interface RoomsListProps {
  onEnterRoom: (room: Room) => void;
}

// Real crypto logos from CoinGecko CDN
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  SOL: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
  MNT: 'https://assets.coingecko.com/coins/images/30980/small/mantle.png',
};

// Animated Circular Timer Component
function CircularTimer({ timeLeft, maxTime }: { timeLeft: number; maxTime: number }) {
  const progress = Math.max(0, Math.min(1, timeLeft / maxTime));
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const isUrgent = timeLeft < 30;
  
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        {/* Background circle */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="#1f1f2e"
          strokeWidth="3"
        />
        {/* Progress circle */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke={isUrgent ? '#ef4444' : '#22c55e'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={`transition-all duration-1000 ${isUrgent ? 'animate-pulse' : ''}`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-mono font-bold ${isUrgent ? 'text-red-400' : 'text-white'}`}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>
    </div>
  );
}

// Professional TradingView-style Mini Chart
function MiniChart({ priceHistory, isUp }: { priceHistory: PricePoint[]; isUp: boolean }) {
  // Convert PricePoint[] to number[] for charting
  let prices = priceHistory.map(p => p.price);
  
  if (prices.length < 2) {
    const base = 100;
    prices = Array.from({ length: 30 }, (_, i) =>
      base + Math.sin(i * 0.3) * 5 + (Math.random() - 0.5) * 2 + (isUp ? i * 0.2 : -i * 0.1)
    );
  }
  
  const priceData = prices;

  const width = 200;
  const height = 56;
  const padding = 2;
  
  const min = Math.min(...priceData);
  const max = Math.max(...priceData);
  const range = max - min || 1;
  
  const points = priceData.map((price, i) => {
    const x = padding + (i / (priceData.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (price - min) / range) * (height - padding * 2);
    return { x, y };
  });

  // Smooth curve using quadratic bezier
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` Q ${prev.x} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
  }
  path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;

  const areaPath = path + ` L ${width - padding} ${height} L ${padding} ${height} Z`;
  
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
  const lineColor = isUp ? '#22c55e' : '#ef4444';
  const fillColor = isUp ? '#22c55e' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r="3"
        fill={lineColor}
        className="animate-pulse"
      />
    </svg>
  );
}

export function RoomsList({ onEnterRoom }: RoomsListProps) {
  const { rooms, prices } = useRooms();
  const [filter, setFilter] = useState<'all' | 'open' | 'live'>('all');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  const visible = rooms.filter(r => r.status !== 'resolved');
  const filtered = filter === 'all' ? visible : visible.filter(r => r.status === filter);

  // Count by status
  const openCount = visible.filter(r => r.status === 'open').length;
  const liveCount = visible.filter(r => r.status === 'live').length;

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">MindClash Arena</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              {openCount} Open
            </span>
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
              {liveCount} Live
            </span>
          </div>
        </div>
        
        <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
          {(['all', 'open', 'live'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                filter === f
                  ? 'bg-white/[0.10] text-white'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#1f1f2e] to-[#0d0d14] flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm">No active rounds</p>
          <p className="text-gray-600 text-xs mt-1">New rounds spawn automatically</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map(room => {
              const assetInfo = ASSETS[room.asset];
              const logo = CRYPTO_LOGOS[room.asset];
              const totalPool = room.upPool + room.downPool;
              const upPct = totalPool ? (room.upPool / totalPool) * 100 : 50;
              const isOpen = room.status === 'open';
              const isLive = room.status === 'live';
              
              const timeLeft = isOpen 
                ? Math.max(0, room.startTime - now)
                : Math.max(0, room.endTime - now);
              
              const maxTime = isOpen ? 30 : room.duration;
              
              const anchorPrice = room.startPrice ?? room.currentPrice;
              const priceDelta = anchorPrice ? ((room.currentPrice - anchorPrice) / anchorPrice) * 100 : 0;
              const isUp = priceDelta >= 0;
              const bots = getRealBotPredictions(room);
              const primaryBot = bots[0] || null;

              return (
                <motion.div
                  key={room.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  onClick={() => onEnterRoom(room)}
                  className="relative rounded-2xl overflow-hidden cursor-pointer group border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                  style={{ background: 'rgba(255,255,255,0.02)' }}
                >
                  {/* Status top line */}
                  <div className={`absolute top-0 left-0 right-0 h-[2px] ${
                    isOpen ? 'bg-yellow-400/60' : 'bg-red-400/60'
                  }`}>
                    {isLive && <div className="absolute inset-0 bg-red-400/80 animate-pulse" />}
                  </div>

                  {/* Header bar */}
                  <div className="flex items-center justify-between px-5 pt-4 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.05] p-1.5 border border-white/[0.08]">
                        <img src={logo} alt={room.asset} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-sm font-bold text-white">{room.asset}/USDT</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] text-gray-400 font-mono">{room.duration}s</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                        isOpen ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {isOpen ? 'OPEN' : 'LIVE'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 font-mono">
                        Pool: <span className="text-purple-400 font-bold">{totalPool > 0 ? totalPool.toLocaleString() : '0'}</span> CLASH
                      </span>
                      <CircularTimer timeLeft={timeLeft} maxTime={maxTime} />
                    </div>
                  </div>

                  {/* Main body: Left (chart) + Right (bets) */}
                  <div className="flex flex-col md:flex-row">

                    {/* LEFT: Price + Chart */}
                    <div className="flex-1 px-5 pb-4 border-r border-white/[0.04]">
                      {/* Price row */}
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-xl font-bold text-white tabular-nums">
                          ${room.currentPrice.toLocaleString(undefined, {
                            minimumFractionDigits: room.asset === 'MNT' ? 4 : 2,
                            maximumFractionDigits: room.asset === 'MNT' ? 4 : 2,
                          })}
                        </span>
                        <span className={`flex items-center gap-0.5 text-xs font-semibold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isUp ? '+' : ''}{priceDelta.toFixed(2)}%
                        </span>
                      </div>

                      {/* Sparkline chart — wider */}
                      <div className="w-full h-[56px]">
                        <MiniChart priceHistory={room.priceHistory || []} isUp={isUp} />
                      </div>
                    </div>

                    {/* RIGHT: Predictions & Actions */}
                    <div className="w-full md:w-[240px] px-4 pb-4 pt-1 flex flex-col justify-between gap-3">
                      
                      {/* AI Agent prediction */}
                      {primaryBot && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                          <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${primaryBot.gradient} flex items-center justify-center text-xs shrink-0`}>
                            {primaryBot.avatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] text-gray-500">AI Prediction</div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">{primaryBot.name}</span>
                              <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                                primaryBot.direction === 'UP' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                              }`}>{primaryBot.direction}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pool distribution bar */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1">
                          <span className="text-green-400 font-bold">UP {upPct.toFixed(0)}%</span>
                          <span className="text-red-400 font-bold">DOWN {(100 - upPct).toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.05] flex">
                          <motion.div
                            className="h-full rounded-l-full"
                            style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${upPct}%` }}
                            transition={{ duration: 0.8 }}
                          />
                          <motion.div
                            className="h-full rounded-r-full"
                            style={{ background: 'linear-gradient(90deg, #f87171, #ef4444)' }}
                            initial={{ width: 0 }}
                            animate={{ width: `${100 - upPct}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>

                      {/* Action buttons */}
                      {isOpen ? (
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); onEnterRoom(room); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-sm text-white transition-all"
                            style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}
                          >
                            <TrendingUp className="w-4 h-4" />
                            UP
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); onEnterRoom(room); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-sm text-white transition-all"
                            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}
                          >
                            <TrendingDown className="w-4 h-4" />
                            DOWN
                          </motion.button>
                        </div>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => { e.stopPropagation(); onEnterRoom(room); }}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/[0.06] text-gray-300 hover:bg-white/[0.10] transition-colors text-sm font-semibold"
                        >
                          <Eye className="w-4 h-4" />
                          Watch Live
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
