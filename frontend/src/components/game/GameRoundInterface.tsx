'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  TrendingUp, TrendingDown, Clock, Lock, Radio,
  CheckCircle2, AlertCircle, Users, Zap, ChevronDown,
  ChevronUp, MessageCircle, Minus,
} from 'lucide-react';
import { ASSETS } from '@/lib/web3-config';
import { useRooms, BOT_PROFILES } from '@/contexts/RoomsContext';
import { useChat } from '@/contexts/ChatContext';
import { usePlayer, getRank, xpForOutcome, xpForBotBeating } from '@/contexts/PlayerContext';
import { CryptoIcon } from '@/components/icons/CryptoIcons';
import { RankIcon } from '@/components/icons/RankIcon';
import { Direction } from '@/types/room';
import { AnimatedPrice, CountdownDigits } from './AnimatedPrice';
import { ResolutionReveal } from './ResolutionReveal';
import { PriceChart } from './PriceChart';
import { AchievementToast } from '@/components/player/AchievementToast';

interface GameRoundInterfaceProps {
  roomId: string;
}

export interface BotResult {
  name: string;
  strategy: string;
  direction: Direction | null;
  beat: boolean;
}

export function GameRoundInterface({ roomId }: GameRoundInterfaceProps) {
  const { address } = useAccount();
  const { getRoom, predict, protocolFee } = useRooms();
  const { sendSystem, getMessages, sendMessage } = useChat();
  const { stats, recordPrediction, recordResult } = usePlayer();
  const [, forceTick] = useState(0);
  const [stake, setStake] = useState(50);
  const [showReveal, setShowReveal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatText, setChatText] = useState('');
  const [botResults, setBotResults] = useState<BotResult[]>([]);
  const [ptsGained, setPtsGained] = useState(0);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const resolvedRef = useRef(false);

  useEffect(() => {
    const i = setInterval(() => forceTick(n => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const room = getRoom(roomId);

  // Resolution logic
  useEffect(() => {
    if (!room) return;
    if (room.status === 'resolved' && !resolvedRef.current) {
      resolvedRef.current = true;
      const myAddr = address?.toLowerCase();
      const myPreds = myAddr ? room.predictions.filter(p => p.address.toLowerCase() === myAddr) : [];

      const resolvedWinner: Direction | 'TIE' =
        (room.endPrice ?? 0) > (room.startPrice ?? 0) ? 'UP' :
        (room.endPrice ?? 0) < (room.startPrice ?? 0) ? 'DOWN' : 'TIE';

      // Compute which bots were beaten (user won AND bot predicted wrong/held)
      const resolved: BotResult[] = BOT_PROFILES.map(bot => {
        const pred = room.predictions.find(p => p.address.toLowerCase() === bot.address.toLowerCase());
        const botDir = (pred?.direction ?? null) as Direction | null;
        const botWon = resolvedWinner !== 'TIE' && botDir === resolvedWinner;
        return { name: bot.name, strategy: bot.strategy, direction: botDir, beat: false, botWon };
      });

      if (myPreds.length > 0 && room.startPrice != null && room.endPrice != null) {
        const totalStake = myPreds.reduce((s, p) => s + p.amount, 0);

        if (resolvedWinner === 'TIE') {
          const pts = xpForOutcome('tie', 0);
          setPtsGained(pts);
          resolved.forEach(b => { b.beat = false; });
          setBotResults(resolved);
          recordResult({ outcome: 'tie', stake: totalStake, payout: totalStake, botsBeaten: 0 }).forEach(ach =>
            toast.custom(t => <AchievementToast achievement={ach} />, { duration: 5000 })
          );
        } else {
          const winnerStake = myPreds.filter(p => p.direction === resolvedWinner).reduce((s, p) => s + p.amount, 0);
          const userWon = winnerStake > 0;

          // Mark beaten bots: user won + bot predicted wrong/held
          resolved.forEach(b => { b.beat = userWon && !(b as any).botWon; });
          const botsBeatenCount = resolved.filter(b => b.beat).length;
          setBotResults(resolved);

          if (userWon) {
            const winningPool = resolvedWinner === 'UP' ? room.upPool : room.downPool;
            const losingPool  = resolvedWinner === 'UP' ? room.downPool : room.upPool;
            const multiplier  = winningPool > 0 ? 1 + (losingPool * (1 - protocolFee)) / winningPool : 1;
            const payout      = winnerStake * multiplier;
            const profit      = Math.max(0, payout - winnerStake);
            const pts         = xpForOutcome('win', profit) + xpForBotBeating(botsBeatenCount);
            setPtsGained(pts);
            recordResult({ outcome: 'win', stake: winnerStake, payout, botsBeaten: botsBeatenCount }).forEach(ach =>
              toast.custom(() => <AchievementToast achievement={ach} />, { duration: 5000 })
            );
          } else {
            const pts = xpForOutcome('loss', 0);
            setPtsGained(pts);
            recordResult({ outcome: 'loss', stake: totalStake, payout: 0, botsBeaten: 0 }).forEach(ach =>
              toast.custom(() => <AchievementToast achievement={ach} />, { duration: 5000 })
            );
          }
        }
      } else {
        // No user predictions — still show bot results
        resolved.forEach(b => { b.beat = false; });
        setBotResults(resolved);
      }

      setShowReveal(true);
      sendSystem(room.id, `Round resolved · ${
        room.endPrice! > room.startPrice! ? 'UP wins' :
        room.endPrice! < room.startPrice! ? 'DOWN wins' : 'TIE'
      }`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status]);

  if (!room) {
    return (
      <div className="glass p-8 rounded-2xl border border-dark-border text-center text-gray-400">
        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
        Round not found
      </div>
    );
  }

  const assetInfo = ASSETS[room.asset];
  const nowSec = Math.floor(Date.now() / 1000);
  const secsToStart = room.startTime - nowSec;
  const secsToEnd = room.endTime - nowSec;
  const totalPool = room.upPool + room.downPool;
  const anchorPrice = room.startPrice ?? room.currentPrice;
  const priceDelta = room.currentPrice - anchorPrice;
  const priceChangePct = anchorPrice ? (priceDelta / anchorPrice) * 100 : 0;

  const computePayoutMultiplier = (winningPool: number, losingPool: number) => {
    if (winningPool <= 0) return 0;
    return 1 + (losingPool * (1 - protocolFee)) / winningPool;
  };
  const upMultiplier = computePayoutMultiplier(room.upPool, room.downPool);
  const downMultiplier = computePayoutMultiplier(room.downPool, room.upPool);

  const myAddr = address?.toLowerCase();
  const userPredictions = myAddr ? room.predictions.filter(p => p.address.toLowerCase() === myAddr) : [];
  const userUpStake = userPredictions.filter(p => p.direction === 'UP').reduce((s, p) => s + p.amount, 0);
  const userDownStake = userPredictions.filter(p => p.direction === 'DOWN').reduce((s, p) => s + p.amount, 0);
  const userTotalStake = userUpStake + userDownStake;

  let winner: Direction | 'TIE' | null = null;
  if (room.status === 'resolved' && room.endPrice != null && room.startPrice != null) {
    if (room.endPrice > room.startPrice) winner = 'UP';
    else if (room.endPrice < room.startPrice) winner = 'DOWN';
    else winner = 'TIE';
  }

  let userOutcome: 'win' | 'loss' | 'tie' | null = null;
  let userPayout = 0;
  if (winner && userTotalStake > 0) {
    if (winner === 'TIE') {
      userOutcome = 'tie';
      userPayout = userTotalStake;
    } else {
      const winStake = winner === 'UP' ? userUpStake : userDownStake;
      const mult = winner === 'UP' ? upMultiplier : downMultiplier;
      if (winStake > 0) { userOutcome = 'win'; userPayout = winStake * mult; }
      else { userOutcome = 'loss'; userPayout = 0; }
    }
  }

  const canPredict = room.status === 'open';
  const userRank = getRank(stats.level);
  const upPct = totalPool > 0 ? (room.upPool / totalPool) * 100 : 50;
  const downPct = totalPool > 0 ? (room.downPool / totalPool) * 100 : 50;

  const handlePredict = (dir: Direction) => {
    if (!canPredict) { toast.error('Predictions closed'); return; }
    const userAddr = address || `0xDemo${Math.floor(Math.random() * 10000)}`;
    const res = predict(room.id, dir, stake, userAddr);
    if (res.ok) {
      toast.success(`${dir} · ${stake} ${room.token}`);
      recordPrediction(stake).forEach(ach =>
        toast.custom(() => <AchievementToast achievement={ach} />, { duration: 5000 })
      );
      sendSystem(room.id, `${
        address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'A predictor'
      } committed ${stake} ${room.token} on ${dir}`, {
        prediction: { direction: dir, amount: stake },
      });
    } else {
      toast.error(res.error || 'Failed');
    }
  };

  // Chat
  const messages = getMessages(room.id);
  const handleSendChat = () => {
    const trimmed = chatText.trim();
    if (!trimmed) return;
    const author = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : `Guest${Math.floor(Math.random() * 1000)}`;
    sendMessage(room.id, author, trimmed, {
      authorLevel: stats.level,
      authorRank: userRank.name,
      authorRankColor: userRank.color,
    });
    setChatText('');
  };
  useEffect(() => {
    if (chatOpen) chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length, chatOpen]);

  const isLive = room.status === 'live';
  const isResolved = room.status === 'resolved';

  return (
    <div className="space-y-4">
      {/* ═══════════ STATUS BAR ═══════════ */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm"
        style={{
          borderColor: isLive ? '#ef444440' : isResolved ? '#6b728040' : '#fbbf2440',
          background: isLive ? 'rgba(239,68,68,0.06)' : isResolved ? 'rgba(107,114,128,0.06)' : 'rgba(251,191,36,0.06)',
        }}
      >
        {isLive && <Radio className="w-4 h-4 text-red-500 animate-pulse" />}
        {!isLive && !isResolved && <Clock className="w-4 h-4 text-yellow-500" />}
        {isResolved && <CheckCircle2 className="w-4 h-4 text-gray-400" />}

        <span className={`text-sm font-semibold ${isLive ? 'text-red-400' : isResolved ? 'text-gray-400' : 'text-yellow-400'}`}>
          {room.status === 'open' && 'Predictions open'}
          {isLive && 'LIVE'}
          {isResolved && 'Resolved'}
        </span>

        <span className="text-white font-mono text-lg font-bold ml-2">
          {room.status === 'open' && <CountdownDigits seconds={secsToStart} />}
          {isLive && <CountdownDigits seconds={secsToEnd} />}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <RankIcon rankId={userRank.id} size={14} className="text-white" />
            LVL {stats.level}
          </span>
        </div>
      </div>

      {/* ═══════════ ASSET + PRICE HERO ═══════════ */}
      <div className="relative rounded-2xl border border-dark-border overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${assetInfo.color}08, #0a0a0f 40%, ${assetInfo.color}05)` }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10"
          style={{ background: assetInfo.color }} />

        <div className="relative z-10 px-6 py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Left: asset */}
            <div className="flex items-center gap-4">
              <motion.div
                animate={isLive ? { boxShadow: [`0 0 20px ${assetInfo.color}30`, `0 0 40px ${assetInfo.color}60`, `0 0 20px ${assetInfo.color}30`] } : {}}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ background: `${assetInfo.color}15`, border: `1.5px solid ${assetInfo.color}40` }}
              >
                <CryptoIcon symbol={room.asset} className="w-10 h-10" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{assetInfo.name}</h2>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-dark-surface border border-dark-border text-gray-300">
                    {room.duration}s
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-dark-surface border border-dark-border text-gray-300">
                    {room.token}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-3xl font-black text-white tabular-nums">
                    <AnimatedPrice value={room.currentPrice} />
                  </span>
                  {room.status !== 'open' && room.startPrice != null && (
                    <span className={`text-sm font-bold flex items-center gap-1 ${
                      priceDelta >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {priceDelta >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      {priceDelta >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: pool summary */}
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase">Prize Pool</div>
                <div className="text-xl font-bold text-white">
                  {totalPool.toLocaleString()} <span className="text-xs text-gray-400 font-normal">{room.token}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-500 uppercase">Predictors</div>
                <div className="text-xl font-bold text-white flex items-center gap-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  {room.predictions.length}
                </div>
              </div>
            </div>
          </div>

          {/* Pool ratio mini-bar */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs font-bold text-green-400 tabular-nums">{upPct.toFixed(0)}% UP</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-dark-bg border border-dark-border flex">
              <motion.div
                className="h-full bg-gradient-to-r from-green-600 to-green-400"
                animate={{ width: `${upPct}%` }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              />
              <motion.div
                className="h-full bg-gradient-to-l from-red-600 to-red-400"
                animate={{ width: `${downPct}%` }}
                transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              />
            </div>
            <span className="text-xs font-bold text-red-400 tabular-nums">{downPct.toFixed(0)}% DOWN</span>
          </div>
        </div>
      </div>

      {/* ═══════════ CHART ═══════════ */}
      <div className="rounded-2xl border border-dark-border overflow-hidden bg-dark-bg/50">
        <PriceChart
          history={room.priceHistory}
          startPrice={room.startPrice}
          anchorPrice={room.startPrice ?? room.currentPrice}
          status={room.status}
          winner={winner}
          startTime={room.startTime}
          endTime={room.endTime}
          height={280}
        />
      </div>

      {/* ═══════════ PREDICTION PANEL ═══════════ */}
      <div className="rounded-2xl border border-dark-border overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(15,15,25,0.9), rgba(10,10,15,1))' }}
      >
        {canPredict ? (
          <div className="p-5">
            {/* Stake row */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-gray-400 font-semibold whitespace-nowrap">Stake</span>
              <div className="flex items-center gap-2 flex-1">
                {[10, 25, 50, 100, 250, 500].map(v => (
                  <button
                    key={v}
                    onClick={() => setStake(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      stake === v
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                        : 'bg-dark-surface border border-dark-border text-gray-400 hover:text-white hover:border-gray-500'
                    }`}
                  >
                    {v}
                  </button>
                ))}
                <input
                  type="number"
                  value={stake}
                  onChange={e => setStake(Number(e.target.value))}
                  className="w-24 bg-dark-bg border border-dark-border rounded-lg px-3 py-1.5 text-sm text-white font-bold text-center focus:border-blue-500 focus:outline-none"
                  min={room.minStake}
                  max={room.maxStake}
                />
                <span className="text-xs text-gray-500">{room.token}</span>
              </div>
            </div>

            {/* UP / DOWN buttons */}
            <div className="grid grid-cols-2 gap-3">
              <PredictCard
                direction="UP"
                multiplier={upMultiplier}
                pool={room.upPool}
                predictors={room.predictions.filter(p => p.direction === 'UP').length}
                token={room.token}
                stake={stake}
                onClick={() => handlePredict('UP')}
                winner={winner}
                userStake={userUpStake}
              />
              <PredictCard
                direction="DOWN"
                multiplier={downMultiplier}
                pool={room.downPool}
                predictors={room.predictions.filter(p => p.direction === 'DOWN').length}
                token={room.token}
                stake={stake}
                onClick={() => handlePredict('DOWN')}
                winner={winner}
                userStake={userDownStake}
              />
            </div>
          </div>
        ) : (
          <div className="p-6 flex items-center gap-3 text-gray-400">
            <Lock className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div>
              {isLive && 'Round is live — predictions locked until resolution.'}
              {isResolved && 'Round resolved. A new round will open shortly.'}
            </div>
          </div>
        )}

        {/* Your position strip */}
        {userTotalStake > 0 && (
          <div className="px-5 py-3 border-t border-dark-border bg-dark-surface/30 flex items-center gap-4 flex-wrap text-sm">
            <span className="text-xs text-gray-500 font-semibold">YOUR POSITION</span>
            {userUpStake > 0 && (
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
                <span className="text-white font-bold">{userUpStake} {room.token}</span>
                <span className="text-green-400">UP</span>
                {winner && (
                  <span className={winner === 'UP' ? 'text-green-400' : 'text-red-400'}>
                    {winner === 'UP' ? `+${(userUpStake * upMultiplier - userUpStake).toFixed(2)}` : 'lost'}
                  </span>
                )}
              </span>
            )}
            {userDownStake > 0 && (
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                <span className="text-white font-bold">{userDownStake} {room.token}</span>
                <span className="text-red-400">DOWN</span>
                {winner && (
                  <span className={winner === 'DOWN' ? 'text-green-400' : 'text-red-400'}>
                    {winner === 'DOWN' ? `+${(userDownStake * downMultiplier - userDownStake).toFixed(2)}` : 'lost'}
                  </span>
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ═══════════ RECENT ACTIVITY + CHAT ═══════════ */}
      <div className="rounded-2xl border border-dark-border overflow-hidden bg-dark-bg/50">
        {/* Tab header */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-dark-surface/30 transition"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-white">Activity & Chat</span>
            <span className="text-xs text-gray-500">{messages.length} messages</span>
          </div>
          {chatOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {/* Messages */}
              <div ref={chatScrollRef} className="h-64 overflow-y-auto px-4 py-3 space-y-2 scroll-smooth">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                    No activity yet
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {messages.map(msg => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        {msg.isSystem ? (
                          <div className="flex items-center gap-2 py-1">
                            <span className="text-[10px] text-gray-500 tabular-nums">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {msg.prediction && (
                              msg.prediction.direction === 'UP'
                                ? <TrendingUp className="w-3 h-3 text-green-500" />
                                : <TrendingDown className="w-3 h-3 text-red-500" />
                            )}
                            <span className="text-xs text-blue-300">{msg.text}</span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2 py-1">
                            <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                              style={{ background: `linear-gradient(135deg, ${msg.authorRankColor ?? '#6b7280'}40, ${msg.authorRankColor ?? '#6b7280'}80)` }}>
                              {msg.authorLevel ?? '?'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold" style={{ color: msg.authorRankColor ?? '#9ca3af' }}>{msg.author}</span>
                              <span className="text-gray-200 text-xs ml-2 break-words">{msg.text}</span>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-dark-border flex gap-2">
                <input
                  value={chatText}
                  onChange={e => setChatText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                  placeholder="Say something..."
                  maxLength={200}
                  className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatText.trim()}
                  className="px-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white disabled:opacity-50 hover:opacity-90 transition"
                >
                  <Zap className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════ RESOLUTION MODAL ═══════════ */}
      <ResolutionReveal
        open={showReveal}
        onClose={() => setShowReveal(false)}
        winner={winner ?? 'TIE'}
        startPrice={room.startPrice ?? 0}
        endPrice={room.endPrice ?? 0}
        token={room.token}
        userOutcome={userOutcome}
        userPayout={userPayout}
        userStake={userTotalStake}
        botResults={botResults}
        ptsGained={ptsGained}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PREDICT CARD — the big UP / DOWN interactive card
   ═══════════════════════════════════════════════════════════════ */
function PredictCard({
  direction,
  multiplier,
  pool,
  predictors,
  token,
  stake,
  onClick,
  winner,
  userStake,
}: {
  direction: Direction;
  multiplier: number;
  pool: number;
  predictors: number;
  token: string;
  stake: number;
  onClick: () => void;
  winner: Direction | 'TIE' | null;
  userStake: number;
}) {
  const isUp = direction === 'UP';
  const isWinner = winner === direction;
  const baseColor = isUp ? '#22c55e' : '#ef4444';
  const potentialPayout = stake * multiplier;

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-xl border-2 p-5 text-left transition-all group"
      style={{
        borderColor: isWinner ? baseColor : `${baseColor}50`,
        background: `linear-gradient(135deg, ${baseColor}08, transparent 60%)`,
      }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(ellipse at center, ${baseColor}20, transparent 70%)` }}
      />

      {/* Winner badge */}
      {isWinner && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-black"
          style={{ background: baseColor, color: '#000' }}
        >
          WIN
        </motion.div>
      )}

      <div className="relative z-10">
        {/* Direction + icon */}
        <div className="flex items-center gap-2 mb-3">
          {isUp ? (
            <TrendingUp className="w-6 h-6" style={{ color: baseColor }} />
          ) : (
            <TrendingDown className="w-6 h-6" style={{ color: baseColor }} />
          )}
          <span className="text-lg font-black" style={{ color: baseColor }}>
            {direction}
          </span>
        </div>

        {/* Multiplier */}
        <div className="text-3xl font-black text-white mb-1">
          {multiplier.toFixed(2)}x
        </div>
        <div className="text-[10px] text-gray-500 uppercase mb-3">if correct</div>

        {/* Pool info */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            <span className="text-white font-bold">{pool.toLocaleString()}</span> {token}
          </span>
          <span className="text-gray-500">
            <Users className="w-3 h-3 inline mr-1" />{predictors}
          </span>
        </div>

        {/* Potential payout */}
        <div className="mt-3 pt-3 border-t border-dark-border/50 flex items-center justify-between">
          <span className="text-[10px] text-gray-500 uppercase">You get</span>
          <span className="text-sm font-bold" style={{ color: baseColor }}>
            +{potentialPayout.toFixed(2)} {token}
          </span>
        </div>

        {/* User stake indicator */}
        {userStake > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: baseColor }} />
            <span className="text-[10px] text-gray-400">You: {userStake} {token}</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}
