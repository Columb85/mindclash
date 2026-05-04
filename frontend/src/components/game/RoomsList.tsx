'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, Play, Eye, Bot, Flame, Zap } from 'lucide-react';
import { useRooms } from '@/contexts/RoomsContext';
import { useAIAgent } from '@/contexts/AIAgentContext';
import { ASSETS } from '@/lib/web3-config';
import { Room, PricePoint } from '@/types/room';
import Image from 'next/image';

// AI Agent avatars and taunts
const AI_AGENTS = {
  'alpha-predict': {
    name: 'AlphaPredict',
    avatar: '🤖',
    gradient: 'from-blue-500 to-cyan-500',
    taunts: {
      UP: ['The upward trend is obvious even to my junior algorithm', 'Moon? No, we\'re going higher! 🚀', 'Bears on vacation, bulls in charge'],
      DOWN: ['The fall is inevitable, like sunrise', 'Get your parachutes ready! 📉', 'Gravity is my best friend'],
    }
  },
  'momentum-master': {
    name: 'MomentumMaster',
    avatar: '⚡',
    gradient: 'from-purple-500 to-pink-500',
    taunts: {
      UP: ['Momentum says: UP!', 'The trend is your friend, and I\'m its best analyst', 'Those who aren\'t with the bulls are with the losses'],
      DOWN: ['Momentum exhausted, time to fall', 'Bearish reversal activated', 'Sell or cry later'],
    }
  },
  'neural-trader': {
    name: 'NeuralTrader',
    avatar: '🧠',
    gradient: 'from-green-500 to-emerald-500',
    taunts: {
      UP: ['42 neural network layers agree: growth!', 'My neurons are dancing the bullish dance', 'Probability of growth: 73.42%'],
      DOWN: ['Neural network sees a red future', 'My algorithms don\'t make mistakes... almost', 'Statistics are against the optimists'],
    }
  }
};

// Get random AI prediction for demo
function getAIPrediction(roomId: string) {
  const agents = Object.keys(AI_AGENTS);
  const agentId = agents[Math.floor(roomId.charCodeAt(0) % agents.length)] as keyof typeof AI_AGENTS;
  const agent = AI_AGENTS[agentId];
  const direction = roomId.charCodeAt(1) % 2 === 0 ? 'UP' : 'DOWN';
  const taunts = agent.taunts[direction];
  const taunt = taunts[Math.floor(roomId.charCodeAt(2) % taunts.length)];
  const confidence = 65 + (roomId.charCodeAt(3) % 25);
  
  return { agentId, agent, direction, taunt, confidence };
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
    // Generate fake data for demo
    const base = 100;
    prices = Array.from({ length: 30 }, (_, i) =>
      base + Math.sin(i * 0.3) * 5 + (Math.random() - 0.5) * 2 + (isUp ? i * 0.2 : -i * 0.1)
    );
  }
  
  const priceData = prices;

  const width = 120;
  const height = 40;
  const padding = 2;
  
  const min = Math.min(...priceData);
  const max = Math.max(...priceData);
  const range = max - min || 1;
  
  // Create smooth path
  const points = priceData.map((price, i) => {
    const x = padding + (i / (priceData.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (price - min) / range) * (height - padding * 2);
    return { x, y };
  });

  // Create smooth curve using quadratic bezier
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` Q ${prev.x} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`;
  }
  path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;

  // Area fill path
  const areaPath = path + ` L ${width - padding} ${height} L ${padding} ${height} Z`;
  
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;
  const lineColor = isUp ? '#22c55e' : '#ef4444';
  const fillColor = isUp ? '#22c55e' : '#ef4444';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#${gradientId})`}
      />
      {/* Line */}
      <path
        d={path}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
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
        
        <div className="flex gap-1 p-1 bg-[#0d0d14] rounded-xl border border-[#1f1f2e]">
          {(['all', 'open', 'live'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize ${
                filter === f
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-[#1f1f2e]'
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

              return (
                <motion.div
                  key={room.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  onClick={() => onEnterRoom(room)}
                  className="relative rounded-2xl overflow-hidden cursor-pointer group"
                  style={{
                    background: 'linear-gradient(145deg, rgba(20, 20, 31, 0.9) 0%, rgba(13, 13, 20, 0.95) 100%)',
                  }}
                >
                  {/* Animated border gradient */}
                  <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-[#2f2f4e] via-[#1f1f2e] to-[#2f2f4e] group-hover:from-blue-500/40 group-hover:via-purple-500/30 group-hover:to-cyan-500/40 transition-all duration-500" />
                  
                  {/* Inner container */}
                  <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-[#14141f] to-[#0d0d14]" />
                  
                  {/* Ambient glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-transparent to-purple-500/0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
                  
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 overflow-hidden">
                    <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  </div>
                  
                  {/* Status indicator with glow */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${
                    isOpen
                      ? 'bg-gradient-to-r from-yellow-500/80 via-amber-400 to-yellow-500/80'
                      : 'bg-gradient-to-r from-red-500/80 via-rose-400 to-red-500/80'
                  }`}>
                    {isLive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-rose-400 to-red-500 animate-pulse" />
                    )}
                  </div>
                  
                  {/* Subtle corner accent */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="p-5 relative z-10">
                    {/* Top section: Asset info + Status */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Crypto Logo */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-xl bg-[#1f1f2e] p-2 border border-[#2f2f4e]">
                            <img 
                              src={logo} 
                              alt={room.asset}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          {isLive && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-[#14141f] animate-pulse" />
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-white">{room.asset}</span>
                            <span className="text-xs text-gray-500">/CLASH</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500">{room.duration}s round</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              isOpen
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {isOpen ? 'PREDICT NOW' : 'LIVE'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Timer */}
                      <CircularTimer timeLeft={timeLeft} maxTime={maxTime} />
                    </div>

                    {/* Price + Chart */}
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
                          ${room.currentPrice.toLocaleString(undefined, { 
                            minimumFractionDigits: room.asset === 'MNT' ? 4 : 2,
                            maximumFractionDigits: room.asset === 'MNT' ? 4 : 2 
                          })}
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-semibold ${
                          isUp ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {isUp ? '+' : ''}{priceDelta.toFixed(2)}%
                        </div>
                      </div>
                      
                      {/* Mini Chart */}
                      <div className="opacity-80">
                        <MiniChart priceHistory={room.priceHistory || []} isUp={isUp} />
                      </div>
                    </div>

                    {/* AI Prediction Indicator */}
                    {(() => {
                      const aiPrediction = getAIPrediction(room.id);
                      return (
                        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-[#1a1a2e]/80 to-[#16162a]/80 border border-[#2f2f4e]/50">
                          <div className="flex items-center gap-3">
                            {/* AI Avatar */}
                            <div className={`relative w-10 h-10 rounded-xl bg-gradient-to-br ${aiPrediction.agent.gradient} flex items-center justify-center text-xl shadow-lg`}>
                              {aiPrediction.agent.avatar}
                              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                                aiPrediction.direction === 'UP'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-red-500 text-white'
                              }`}>
                                {aiPrediction.direction === 'UP' ? '↑' : '↓'}
                              </div>
                            </div>
                            
                            {/* AI Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{aiPrediction.agent.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  aiPrediction.direction === 'UP'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {aiPrediction.direction} {aiPrediction.confidence}%
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-400 mt-0.5 truncate italic">
                                "{aiPrediction.taunt}"
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Pool distribution - compact */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[10px] mb-1.5">
                        <span className="text-green-400 font-bold">UP {upPct.toFixed(0)}%</span>
                        <span className="text-purple-400 font-mono">Pool: {totalPool > 0 ? totalPool.toLocaleString() : '0'} $CLASH</span>
                        <span className="text-red-400 font-bold">DOWN {(100 - upPct).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-[#0d0d14] flex">
                        <motion.div
                          className="h-full"
                          style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${upPct}%` }}
                          transition={{ duration: 0.8 }}
                        />
                        <motion.div
                          className="h-full"
                          style={{ background: 'linear-gradient(90deg, #f87171, #ef4444)' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${100 - upPct}%` }}
                          transition={{ duration: 0.8 }}
                        />
                      </div>
                    </div>

                    {/* Action Buttons - Two big UP/DOWN buttons */}
                    {isOpen ? (
                      <div className="flex gap-3">
                        {/* UP Button */}
                        <motion.button
                          whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(34, 197, 94, 0.5)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => { e.stopPropagation(); onEnterRoom(room); }}
                          className="flex-1 relative overflow-hidden rounded-xl py-4 font-bold text-white transition-all"
                          style={{
                            background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 50%, #4ade80 100%)',
                            boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                          }}
                        >
                          {/* Glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
                          {/* Pulse ring */}
                          <div className="absolute inset-0 rounded-xl animate-pulse opacity-30" style={{ boxShadow: 'inset 0 0 20px rgba(255,255,255,0.3)' }} />
                          
                          <div className="relative z-10 flex flex-col items-center gap-1">
                            <TrendingUp className="w-6 h-6" />
                            <span className="text-lg">UP</span>
                          </div>
                        </motion.button>
                        
                        {/* DOWN Button */}
                        <motion.button
                          whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(239, 68, 68, 0.5)' }}
                          whileTap={{ scale: 0.98 }}
                          onClick={(e) => { e.stopPropagation(); onEnterRoom(room); }}
                          className="flex-1 relative overflow-hidden rounded-xl py-4 font-bold text-white transition-all"
                          style={{
                            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
                            boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                          }}
                        >
                          {/* Glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-white/10" />
                          {/* Pulse ring */}
                          <div className="absolute inset-0 rounded-xl animate-pulse opacity-30" style={{ boxShadow: 'inset 0 0 20px rgba(255,255,255,0.3)' }} />
                          
                          <div className="relative z-10 flex flex-col items-center gap-1">
                            <TrendingDown className="w-6 h-6" />
                            <span className="text-lg">DOWN</span>
                          </div>
                        </motion.button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between pt-3 border-t border-[#1f1f2e]/60">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Users className="w-4 h-4" />
                          <span>{room.predictions.length} players</span>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); onEnterRoom(room); }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1f1f2e] text-gray-300 hover:bg-[#2a2a3e] transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="font-semibold">Watch Live</span>
                        </motion.button>
                      </div>
                    )}
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
