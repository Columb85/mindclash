'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Icons via Font Awesome (loaded globally for hud-app pages)
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
    <span style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 10, color: 'var(--hud-text-dim)', fontStyle: 'italic' }}>
      &ldquo;
      {phase === 'waiting' ? (
        <span className="inline-flex gap-0.5 items-end ml-0.5">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="inline-block w-1 h-1 rounded-full"
              style={{ background: 'var(--hud-text-dim)' }}
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
              className="inline-block w-[1px] h-[10px] ml-[1px] align-middle"
              style={{ background: 'var(--hud-text-dim)' }}
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

// Local crypto logos from /public/crypto/
const CRYPTO_LOGOS: Record<string, string> = {
  BTC: '/crypto/btc.png',
  ETH: '/crypto/eth.png',
  SOL: '/crypto/sol.png',
  MNT: '/crypto/mnt.svg',
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
  const prices = priceHistory.map(p => p.price);
  
  // Show loading spinner until we have enough data points for a meaningful chart
  if (prices.length < 5) {
    return (
      <div className="chart-loading">
        <div className="chart-spinner" />
      </div>
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
  const lineColor = isUp ? 'var(--hud-green, #39ff90)' : 'var(--hud-red, #ff3355)';
  const fillColor = isUp ? 'var(--hud-green, #39ff90)' : 'var(--hud-red, #ff3355)';

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

const INITIAL_ROOMS_SHOWN = 4;

export function RoomsList({ onEnterRoom }: RoomsListProps) {
  const { rooms, prices } = useRooms();
  const [filter, setFilter] = useState<'all' | 'open' | 'live'>('all');
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  const visible = rooms.filter(r => r.status !== 'resolved');
  const filtered = filter === 'all' ? visible : visible.filter(r => r.status === filter);
  const displayedRooms = expanded ? filtered : filtered.slice(0, INITIAL_ROOMS_SHOWN);
  const hasMore = filtered.length > INITIAL_ROOMS_SHOWN;

  // Count by status
  const openCount = visible.filter(r => r.status === 'open').length;
  const liveCount = visible.filter(r => r.status === 'live').length;

  return (
    <div className="space-y-3">
      {/* Header with filters — matches mockup .arena-hdr */}
      <div className="arena-hdr">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className="hud-section-title">MindClash Arena</span>
          <div className="arena-counts">
            <span className="hud-badge hud-badge-gold">{openCount} Open</span>
            <span className="hud-badge hud-badge-red">{liveCount} Live</span>
          </div>
        </div>

        {/* Filter tabs — matches mockup .filters / .fp */}
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--hud-panel-2)', border: '1px solid var(--hud-border)' }}>
          {(['all', 'open', 'live'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`fp${filter === f ? ' active' : ''}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 hud-panel" style={{ border: '1px solid var(--hud-border)' }}>
          <i className="fa-solid fa-satellite-dish text-3xl mb-4 block" style={{ color: 'var(--hud-text-dim)' }} />
          <p style={{ fontFamily: 'var(--hud-font-head)', color: 'var(--hud-text-dim)', letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 13 }}>
            No active rounds
          </p>
          <p style={{ fontFamily: 'var(--hud-font-mono)', color: 'var(--hud-text-dim)', fontSize: 10, marginTop: 4 }}>
            New rounds spawn automatically
          </p>
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <AnimatePresence mode="popLayout">
            {displayedRooms.map(room => {
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
                  className="hud-room-card"
                  style={{
                    clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)',
                    ...(isLive ? { borderColor: 'rgba(255,51,85,0.45)' } : {}),
                  }}
                >
                  {/* Header row — matches mockup .rc-head */}
                  <div className="rc-head">
                    <div className="rc-head-left">
                      <div className="hud-rc-logo"><img src={logo} alt={room.asset} /></div>
                      <span className="rc-pair">{room.asset}/USDT</span>
                      <span className="rc-tag">{room.duration}s</span>
                      <span className={`rc-tag ${isOpen ? 'open' : 'live'}`}>{isOpen ? 'OPEN' : 'LIVE'}</span>
                    </div>
                    <div className="rc-head-right">
                      <span className="rc-pool">Pool: <b>{totalPool > 0 ? totalPool.toLocaleString() : '0'}</b> CLASH</span>
                      <CircularTimer timeLeft={timeLeft} maxTime={maxTime} />
                    </div>
                  </div>

                  {/* Body: chart + right panel — matches mockup .rc-body */}
                  <div className="rc-body">

                    {/* LEFT: Price + Chart — matches mockup .rc-chart */}
                    <div className="rc-chart">
                      <div className="rc-price-row">
                        <span className="rc-price">
                          ${room.currentPrice.toLocaleString(undefined, {
                            minimumFractionDigits: room.asset === 'MNT' ? 4 : 2,
                            maximumFractionDigits: room.asset === 'MNT' ? 4 : 2,
                          })}
                        </span>
                        <span className={`rc-delta ${isUp ? 'up' : 'dn'}`}>
                          <i className={`fa-solid fa-arrow-trend-${isUp ? 'up' : 'down'}`} style={{ fontSize: 9 }} />
                          {isUp ? '+' : ''}{priceDelta.toFixed(2)}%
                        </span>
                      </div>
                      <div className="spark-box">
                        <MiniChart priceHistory={room.priceHistory || []} isUp={isUp} />
                      </div>
                    </div>

                    {/* RIGHT: Predictions & Actions — matches mockup .rc-side */}
                    <div className="rc-side">

                      {/* AI prediction — matches mockup .bot-pred */}
                      {primaryBot && (
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--hud-panel-2)', border: '1px solid var(--hud-border)' }}
                        >
                          <div className={`hud-bot-av ${
                            primaryBot.gradient.includes('blue') ? 'blue'
                            : primaryBot.gradient.includes('purple') ? 'purple'
                            : 'green'
                          }`}>
                            {primaryBot.avatar}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 8, color: 'var(--hud-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Prediction</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontFamily: 'var(--hud-font-head)', fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{primaryBot.name}</span>
                              <span className={`hud-badge ${primaryBot.direction === 'UP' ? 'hud-badge-green' : 'hud-badge-red'}`}>
                                {primaryBot.direction}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Taunt */}
                      {primaryBot && <TypingTaunt text={primaryBot.taunt} delay={300} />}

                      {/* Pool bar — matches mockup .pool-bar-labels + .pool-bar */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, fontFamily: 'var(--hud-font-mono)', fontSize: 9, fontWeight: 600 }}>
                          <span style={{ color: 'var(--hud-green)' }}>UP {upPct.toFixed(0)}%</span>
                          <span style={{ color: 'var(--hud-red)' }}>DOWN {(100 - upPct).toFixed(0)}%</span>
                        </div>
                        <div className="hud-pool-bar">
                          <motion.div
                            className="up-fill h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${upPct}%` }}
                            transition={{ duration: 0.8 }}
                          />
                          <motion.div
                            className="dn-fill h-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${100 - upPct}%` }}
                            transition={{ duration: 0.8 }}
                          />
                        </div>
                      </div>

                      {/* Action buttons — matches mockup .rc-btns */}
                      {isOpen ? (
                        <div className="rc-btns">
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); onEnterRoom(room); }}
                            className="btn-up"
                          >
                            <i className="fa-solid fa-arrow-trend-up" style={{ fontSize: 10 }} />UP
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={(e) => { e.stopPropagation(); onEnterRoom(room); }}
                            className="btn-dn"
                          >
                            <i className="fa-solid fa-arrow-trend-down" style={{ fontSize: 10 }} />DOWN
                          </motion.button>
                        </div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => { e.stopPropagation(); onEnterRoom(room); }}
                          className="btn-watch"
                        >
                          <i className="fa-solid fa-eye" style={{ fontSize: 10 }} />Watch Live
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* VIEW MORE button */}
        {hasMore && !expanded && (
          <motion.button
            onClick={() => setExpanded(true)}
            className="view-more-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>VIEW MORE</span>
            <span className="view-more-count">+{filtered.length - INITIAL_ROOMS_SHOWN} rooms</span>
            <i className="fa-solid fa-chevron-down" />
          </motion.button>
        )}

        {/* Collapse button when expanded */}
        {expanded && hasMore && (
          <motion.button
            onClick={() => setExpanded(false)}
            className="view-more-btn collapsed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>SHOW LESS</span>
            <i className="fa-solid fa-chevron-up" />
          </motion.button>
        )}
        </>
      )}
    </div>
  );
}
