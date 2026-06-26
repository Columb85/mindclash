'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { ASSETS } from '@/lib/web3-config';
import { useRooms, BOT_PROFILES } from '@/contexts/RoomsContext';
import { useChat } from '@/contexts/ChatContext';
import { usePlayer, getRank } from '@/contexts/PlayerContext';
import { useClash, POINTS_REWARDS } from '@/contexts/ClashContext';
import { CryptoIcon } from '@/components/icons/CryptoIcons';
import { Direction, Room } from '@/types/room';
import { AnimatedPrice } from './AnimatedPrice';
import { ResolutionReveal } from './ResolutionReveal';
import { PriceChart } from './PriceChart';
import { AchievementToast } from '@/components/player/AchievementToast';
type StakeCommitment = { roundId: string; player: string; txHash: string };
import { useStakeClash } from '@/hooks/useStakeClash';
import { buildPayoutParams, ensureRoundPayout, isPayoutSuccess } from '@/lib/roundPayout';
import { useActivity } from '@/contexts/ActivityContext';
import { useActiveRound } from '@/contexts/ActiveRoundContext';
import {
  computeRoundResolution,
  tryMarkRoomProcessed,
  type BotResult,
} from '@/lib/roundResolution';

interface GameRoundInterfaceProps {
  roomId: string;
  onRoundComplete?: () => void;
}

export type { BotResult };

export function GameRoundInterface({ roomId, onRoundComplete }: GameRoundInterfaceProps) {
  const { address } = useAccount();
  const { getRoom, predict, protocolFee } = useRooms();
  const { sendSystem, getMessages, sendMessage } = useChat();
  const { stats, recordPrediction, recordResult } = usePlayer();
  const { addPoints, clashBalance, refetchBalance } = useClash();
  const { push: pushActivity } = useActivity();
  const { pinRoom } = useActiveRound();
  const [, forceTick] = useState(0);
  const [stake, setStake] = useState(50);
  const [side, setSide] = useState<Direction>('UP');
  const [showReveal, setShowReveal] = useState(false);
  const [chatText, setChatText] = useState('');
  const [botResults, setBotResults] = useState<BotResult[]>([]);
  const [ptsGained, setPtsGained] = useState(0);
  const [signedCommitment, setSignedCommitment] = useState<StakeCommitment | null>(null);
  const [payoutTxHash, setPayoutTxHash] = useState<string | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<'idle' | 'claiming' | 'paid' | 'failed'>('idle');
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const resolvedRef = useRef(false);
  // EIP-712 signing removed ? single wallet prompt (CLASH transfer only)
  const { stakeClash, isStaking } = useStakeClash();

  useEffect(() => {
    const i = setInterval(() => forceTick(n => n + 1), 1000);
    return () => clearInterval(i);
  }, []);

  const room = getRoom(roomId);

  useEffect(() => {
    resolvedRef.current = false;
    setShowReveal(false);
    setBotResults([]);
    setPtsGained(0);
    setSignedCommitment(null);
    setPayoutTxHash(null);
    setPayoutStatus('idle');
    setPayoutError(null);
  }, [roomId]);

  const requestOnChainPayout = useCallback(async (targetRoom: Room, force = false) => {
    if (!address) return;
    const params = buildPayoutParams(targetRoom, address, protocolFee);
    if (!params) return;

    setPayoutStatus('claiming');
    setPayoutError(null);
    toast.loading(`Sending ${Math.floor(params.payout)} CLASH payout\u2026`, { id: 'payout-tx' });

    const result = await ensureRoundPayout(params, { force });
    if (isPayoutSuccess(result)) {
      if (result.txHash) setPayoutTxHash(result.txHash);
      setPayoutStatus('paid');
      refetchBalance();
      toast.success(
        result.alreadyClaimed
          ? `${Math.floor(params.payout)} CLASH already paid`
          : `${Math.floor(params.payout)} CLASH received`,
        { id: 'payout-tx', duration: 4000 },
      );
    } else {
      setPayoutStatus('failed');
      setPayoutError(result.error || 'Payout failed');
      toast.error(result.error || 'Payout failed', { id: 'payout-tx' });
    }
  }, [address, protocolFee, refetchBalance]);

  // Resolution logic
  useEffect(() => {
    if (!room) return;
    if (room.status === 'resolved' && !resolvedRef.current) {
      resolvedRef.current = true;
      const resolution = computeRoundResolution(room, address, protocolFee);
      const shouldApplyRewards = tryMarkRoomProcessed(room.id);

      setBotResults(resolution.botResults);
      setPtsGained(resolution.ptsGained);

      if (shouldApplyRewards && resolution.recordPayload) {
        const { outcome, stake, payout, botsBeaten } = resolution.recordPayload;

        if (outcome === 'win') {
          addPoints(POINTS_REWARDS.ROUND_WON, 'round_won');
          if (botsBeaten >= 1) addPoints(POINTS_REWARDS.BEAT_AI, 'beat_ai');
          const newStreak = stats.currentStreak + 1;
          if (newStreak === 3) addPoints(POINTS_REWARDS.WIN_STREAK_3, 'streak_3');
          if (newStreak === 5) addPoints(POINTS_REWARDS.WIN_STREAK_5, 'streak_5');
        }

        recordResult({ outcome, stake, payout, botsBeaten }).forEach(ach =>
          toast.custom(() => <AchievementToast achievement={ach} />, { duration: 5000 }),
        );
      }

      if (address && buildPayoutParams(room, address, protocolFee)) {
        void requestOnChainPayout(room);
      }

      setShowReveal(true);
      pushActivity({
        type: 'round_end',
        asset: room.asset,
        winner: resolution.winner,
        text: `${room.asset} round ended \u2014 ${resolution.winner} won`,
      });

      sendSystem(room.id, `Round resolved \u2014 ${
        room.endPrice! > room.startPrice! ? 'UP wins' :
        room.endPrice! < room.startPrice! ? 'DOWN wins' : 'TIE'
      }`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.status]);

  // Payout when wallet connects after round already resolved
  useEffect(() => {
    if (!room || room.status !== 'resolved' || !address || !resolvedRef.current) return;
    if (payoutStatus !== 'idle') return;
    if (!buildPayoutParams(room, address, protocolFee)) return;
    void requestOnChainPayout(room);
  }, [address, room, protocolFee, payoutStatus, requestOnChainPayout]);

  const messages = room ? getMessages(room.id) : [];
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  if (!room) {
    return (
      <div className="hud-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--hud-text-dim)' }}>
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
    if (winningPool <= 0) return 1;
    return 1 + (losingPool * (1 - protocolFee)) / winningPool;
  };
  const upMultiplier = computePayoutMultiplier(room.upPool, room.downPool);
  const downMultiplier = computePayoutMultiplier(room.downPool, room.upPool);

  const stakeAmount = Number.isFinite(stake) && stake > 0 ? stake : 0;
  const previewUpMultiplier = computePayoutMultiplier(room.upPool + stakeAmount, room.downPool);
  const previewDownMultiplier = computePayoutMultiplier(room.downPool + stakeAmount, room.upPool);
  const activePreviewMultiplier = side === 'UP' ? previewUpMultiplier : previewDownMultiplier;
  const potentialPayout = stakeAmount * activePreviewMultiplier;

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
  const insufficientBalance = !!address && stake > clashBalance;
  const needsWallet = !address;
  const isBusy = isStaking;
  const userRank = getRank(stats.level);
  const upPct = totalPool > 0 ? (room.upPool / totalPool) * 100 : 50;
  const downPct = totalPool > 0 ? (room.downPool / totalPool) * 100 : 50;

  const handlePredict = async (dir: Direction) => {
    if (!canPredict) { toast.error('Predictions closed'); return; }
    if (!address) {
      toast.error('Connect wallet to stake $CLASH');
      return;
    }
    if (stake > clashBalance) {
      toast.error(`Insufficient balance (${clashBalance} CLASH)`);
      return;
    }
    if (stake < room.minStake || stake > room.maxStake) {
      toast.error(`Stake must be ${room.minStake}\u2013${room.maxStake} CLASH`);
      return;
    }

    toast.loading(`Staking ${stake} CLASH\u2026`, { id: 'stake-tx' });
    const { ok, hash } = await stakeClash(stake);
    if (!ok) {
      toast.error('Stake transfer rejected or failed', { id: 'stake-tx' });
      return;
    }
    toast.success(`${stake} CLASH \u2192 Treasury`, { id: 'stake-tx', duration: 3000 });
    refetchBalance(stake);

    const userAddr = address;
    const res = predict(room.id, dir, stake, userAddr);
    if (res.ok) {
      pinRoom(room.id);
      toast.success(`${dir} \u00B7 ${stake} ${room.token}`);
      pushActivity({
        type: 'prediction',
        actor: address ? `${address.slice(0, 6)}\u2026${address.slice(-4)}` : 'You',
        text: `${dir} on ${room.asset}`,
        amount: stake,
        token: room.token,
        asset: room.asset,
        direction: dir,
      });
      addPoints(POINTS_REWARDS.BET_PLACED, 'bet_placed');
      recordPrediction(stake).forEach(ach =>
        toast.custom(() => <AchievementToast achievement={ach} />, { duration: 5000 })
      );
      sendSystem(room.id, `${
        address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'A predictor'
      } committed ${stake} ${room.token} on ${dir}`, {
        prediction: { direction: dir, amount: stake },
      });

      if (hash) {
        setSignedCommitment({ roundId: room.id, player: address, txHash: hash });
        toast(`Tx: ${hash.slice(0, 10)}\u2026`, { icon: '\u2713', duration: 4000 });
      }
    } else {
      toast.error(res.error || 'Failed');
    }
  };

  // Chat
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

  const isLive = room.status === 'live';
  const isResolved = room.status === 'resolved';

  // Format time as MM:SS
  const fmtTime = (sec: number) => {
    const m = Math.floor(Math.abs(sec) / 60);
    const s = Math.abs(sec) % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Circular timer progress (0..1)
  const timerProgress = room.status === 'open'
    ? Math.max(0, Math.min(1, 1 - secsToStart / (room.startTime - (room.startTime - room.duration))))
    : room.status === 'live'
    ? Math.max(0, Math.min(1, 1 - secsToEnd / room.duration))
    : 1;
  const circleR = 38;
  const circleC = 2 * Math.PI * circleR;
  const strokeOff = circleC * (1 - timerProgress);

  // Format entry price label
  const entryLabel = room.startPrice != null
    ? `Entry: $${room.startPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    : 'Entry: \u2014';

  return (
    <div className="game-wrap">
      {/* Scanline overlay */}
      <div className="gr-scanline" />
      <div className="game-grid">
        {/* ------- LEFT COLUMN ------- */}
        <div className="game-left">
          {/* Asset Header */}
          <div className="gr-ah">
            <div className="gr-ah-l">
              <div className="gr-ah-icon" style={{ background: `${assetInfo.color}25`, border: `1px solid ${assetInfo.color}50` }}>
                <CryptoIcon symbol={room.asset} className="w-5 h-5" />
              </div>
              <div>
                <div className="gr-ah-name">{assetInfo.name}</div>
                <div className="gr-ah-tags">
                  <span className="gr-tag gr-tag-r">{room.duration}s</span>
                  <span className="gr-tag gr-tag-c">{room.token}</span>
                  {isLive && <span className="gr-tag gr-tag-l">LIVE</span>}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="gr-ah-price">
                <AnimatedPrice value={room.currentPrice} />
              </div>
              {room.status !== 'open' && room.startPrice != null && (
                <div className={`gr-ah-ch ${priceDelta >= 0 ? 'up' : 'dn'}`}>
                  {priceDelta >= 0 ? '\u25B2' : '\u25BC'} {priceDelta >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%
                </div>
              )}
            </div>
          </div>

          {/* Stats Strip */}
          <div className="gr-ss">
            <div className="gr-ss-cell cyan">
              <div className="gr-ss-label">Prize Pool</div>
              <div className="gr-ss-val">{totalPool.toLocaleString()} {room.token}</div>
            </div>
            <div className="gr-ss-cell purple">
              <div className="gr-ss-label">Predictors</div>
              <div className="gr-ss-val">{room.predictions.length}</div>
            </div>
            <div className="gr-ss-cell gold">
              <div className="gr-ss-label">Round</div>
              <div className="gr-ss-val">#{room.id.slice(-4)}</div>
            </div>
            <div className="gr-ss-cell green">
              <div className="gr-ss-label">Your Wins</div>
              <div className="gr-ss-val">{stats.wins}</div>
            </div>
          </div>

          {/* Pool Bar */}
          <div className="gr-pb">
            <div className="gr-pb-labels">
              <span className="gr-pb-up">{'\u25B2'} UP {upPct.toFixed(0)}% {'\u00B7'} {room.upPool.toLocaleString()}</span>
              <span className="gr-pb-dn">{room.downPool.toLocaleString()} {'\u00B7'} {downPct.toFixed(0)}% DOWN {'\u25BC'}</span>
            </div>
            <div className="gr-pb-track">
              <div className="gr-pb-fill-up" style={{ width: `${upPct}%` }} />
              <div className="gr-pb-fill-dn" style={{ width: `${downPct}%` }} />
            </div>
          </div>

          {/* Chart */}
          <div className="gr-ch">
            <div className="gr-ch-head">
              <button className="gr-ch-tf a">1m</button>
              <button className="gr-ch-tf">5m</button>
              <button className="gr-ch-tf">15m</button>
              <span className="gr-ch-entry">{entryLabel}</span>
            </div>
            <div className="gr-ch-box">
              <PriceChart
                history={room.priceHistory}
                startPrice={room.startPrice}
                anchorPrice={room.startPrice ?? room.currentPrice}
                status={room.status}
                winner={winner}
                startTime={room.startTime}
                endTime={room.endTime}
                height={140}
              />
              {isLive && <span className="gr-ch-tag">LIVE</span>}
            </div>
          </div>

          {/* History */}
          <div className="gr-hist">
            <div className="gr-sec-label"><i className="fa-solid fa-clock-rotate-left" /> Round History</div>
            <div className="gr-hist-row">
              {[...Array(6)].map((_, i) => {
                const isUp = i % 2 === 0;
                return (
                  <div key={i} className="gr-hist-cell">
                    <div className="gr-hist-n">#{1240 - i}</div>
                    <div className={`gr-hist-r ${isUp ? 'u' : 'd'}`}>{isUp ? '\u25B2 UP' : '\u25BC DN'}</div>
                    <div className="gr-hist-p">+{(0.15 + i * 0.05).toFixed(2)}%</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mini Leaderboard */}
          <div className="gr-lb-mini">
            <div className="gr-sec-label"><i className="fa-solid fa-medal" /> Round Leaderboard</div>
            {room.predictions.slice(0, 4).map((pred, idx) => {
              const isBot = BOT_PROFILES.find(b => b.address.toLowerCase() === pred.address.toLowerCase());
              const name = isBot ? isBot.name : `${pred.address.slice(0, 6)}...${pred.address.slice(-4)}`;
              const bgC = isBot ? (isBot.name === 'AlphaBot' ? '#3b82f6' : isBot.name === 'OracleX' ? '#a855f7' : '#22c55e') : '#6b7280';
              return (
                <div key={idx} className="gr-lb-row">
                  <span className={`gr-lb-rank ${idx === 0 ? 'g' : ''}`}>{idx + 1}</span>
                  <div className="gr-lb-av" style={{ background: bgC }}>{isBot ? '\u{1F916}' : name.charAt(0)}</div>
                  <span className="gr-lb-name">{name}</span>
                  <span className={`gr-lb-side ${pred.direction === 'UP' ? 'u' : 'd'}`}>{pred.direction}</span>
                  <span className="gr-lb-stake">{pred.amount}</span>
                </div>
              );
            })}
            {room.predictions.length === 0 && <div style={{ color: 'var(--hud-text-3)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>No predictions yet</div>}
          </div>

          {/* Chat */}
          <div className="gr-ct">
            <div className="gr-sec-label"><i className="fa-solid fa-comments" /> Chat</div>
            <div className="gr-ct-msgs" ref={chatScrollRef}>
              {messages.slice(-8).map(msg => (
                <div key={msg.id} className={`gr-ct-m ${msg.isSystem ? 'ev' : ''}`}>
                  {msg.isSystem ? (
                    <span>{msg.text}</span>
                  ) : (
                    <>
                      <span className="au">{msg.author}</span>
                      <span>{msg.text}</span>
                    </>
                  )}
                </div>
              ))}
              {messages.length === 0 && <div style={{ color: 'var(--hud-text-3)', fontSize: '12px' }}>No messages yet...</div>}
            </div>
            <div className="gr-ct-inp-row">
              <input
                className="gr-ct-inp"
                placeholder="Say something..."
                value={chatText}
                onChange={e => setChatText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                maxLength={200}
              />
              <button className="gr-ct-send" onClick={handleSendChat}>
                <i className="fa-solid fa-paper-plane" />
              </button>
            </div>
          </div>
        </div>

        {/* ------- RIGHT COLUMN ------- */}
        <div className="game-right">
          {/* Timer */}
          <div className="gr-tmr">
            <div className="gr-tmr-label">
              {isLive && <><span className="gr-status-live"><i className="fa-solid fa-circle" style={{ fontSize: '10px' }} /> LIVE</span></>}
              {room.status === 'open' && <span className="gr-status-open"><i className="fa-solid fa-lock-open" /> OPEN</span>}
              {isResolved && <span style={{ color: 'var(--hud-text-3)' }}>RESOLVED</span>}
            </div>
            <div className="gr-circ-big">
              <svg viewBox="0 0 88 88">
                <circle cx="44" cy="44" r={circleR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                <circle
                  cx="44" cy="44" r={circleR} fill="none"
                  stroke={isLive ? '#ff3355' : room.status === 'open' ? '#fbbf24' : '#6b7280'}
                  strokeWidth="4"
                  strokeDasharray={circleC}
                  strokeDashoffset={strokeOff}
                  strokeLinecap="round"
                />
              </svg>
              <div className={`gr-circ-time ${isLive && secsToEnd <= 10 ? 'urgent' : ''}`}>
                {room.status === 'open' ? fmtTime(secsToStart) : isLive ? fmtTime(secsToEnd) : '00:00'}
              </div>
            </div>
            <div className="gr-tmr-sub">{room.status === 'open' ? 'Until Lock' : isLive ? 'Until Resolution' : 'Next round soon'}</div>
          </div>

          {/* Quest Strip */}
          <div className="gr-qs">
            <i className="fa-solid fa-bullseye" />
            <span className="gr-qs-txt">Win this round: <strong>+50 XP</strong></span>
            <span className="gr-qs-xp">0/1</span>
          </div>

          {canPredict ? (
            <>
              {/* Side Selector */}
              <div className="gr-sd">
                <div className="gr-sd-label">Choose Side</div>
                <div className="gr-sd-cards">
                  <div className={`gr-sd-card u ${side === 'UP' ? 'sel' : ''}`} onClick={() => setSide('UP')}>
                    <div className="gr-sd-arr">{'\u25B2'}</div>
                    <div className="gr-sd-name">UP</div>
                    <div className="gr-sd-mult">{previewUpMultiplier.toFixed(2)}x</div>
                    <div className="gr-sd-meta">{room.upPool.toLocaleString()} {room.token}</div>
                  </div>
                  <div className={`gr-sd-card d ${side === 'DOWN' ? 'sel' : ''}`} onClick={() => setSide('DOWN')}>
                    <div className="gr-sd-arr">{'\u25BC'}</div>
                    <div className="gr-sd-name">DOWN</div>
                    <div className="gr-sd-mult">{previewDownMultiplier.toFixed(2)}x</div>
                    <div className="gr-sd-meta">{room.downPool.toLocaleString()} {room.token}</div>
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="gr-am">
                <div className="gr-am-hd">
                  <span>Stake Amount</span>
                  <span>{address && clashBalance > 0 ? `${clashBalance.toLocaleString()} ${room.token}` : `Bal: ${room.token}`}</span>
                </div>
                <div className="gr-chips">
                  {[10, 25, 50, 100, 250, 500].map(v => (
                    <button key={v} className={`gr-chip ${stake === v ? 'a' : ''}`} onClick={() => setStake(v)}>{v}</button>
                  ))}
                  {address && clashBalance > 0 && (
                    <button className="gr-chip" style={{ color: 'var(--hud-purple)' }} onClick={() => setStake(Math.min(clashBalance, room.maxStake))}>MAX</button>
                  )}
                </div>
                <div className="gr-am-inp-row">
                  <input
                    type="number"
                    className="gr-am-inp"
                    value={stake}
                    onChange={e => setStake(Number(e.target.value))}
                    min={room.minStake}
                    max={room.maxStake}
                  />
                  <span className="gr-am-cur">{room.token}</span>
                </div>
              </div>

              {/* Payout */}
              <div className="gr-po">
                <div className="gr-po-r">
                  <span className="gr-po-k">Your Stake</span>
                  <span className="gr-po-v">{stake} {room.token}</span>
                </div>
                <div className="gr-po-r">
                  <span className="gr-po-k">Multiplier</span>
                  <span className="gr-po-v">{activePreviewMultiplier.toFixed(2)}x</span>
                </div>
                <div className="gr-po-r gr-po-div">
                  <span className="gr-po-k">Potential Payout</span>
                  <span className="gr-po-v big">+{potentialPayout.toFixed(2)} {room.token}</span>
                </div>
              </div>

              {address && (
                <div style={{ padding: '10px 12px', background: 'rgba(0,229,255,0.06)', borderBottom: '1px solid rgba(0,229,255,0.15)', fontSize: '13px', color: 'var(--hud-text-dim)' }}>
                  <i className="fa-solid fa-circle-info" style={{ marginRight: 4 }} />
                  Stake is transferred on-chain to Treasury before your prediction is recorded.
                </div>
              )}

              {/* Insufficient balance warning */}
              {insufficientBalance && (
                <div style={{ padding: '10px 12px', background: 'rgba(255,51,85,0.08)', borderBottom: '1px solid rgba(255,51,85,0.2)', fontSize: '12px', color: 'var(--hud-red)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle className="w-3 h-3" /> Stake exceeds balance ({clashBalance})
                </div>
              )}

              {/* Action Button */}
              <div className="gr-act">
                <button
                  className={`gr-btn-pred ${side === 'UP' ? 'up' : 'dn'}`}
                  onClick={() => handlePredict(side)}
                  disabled={insufficientBalance || needsWallet || isBusy}
                >
                  <i className={`fa-solid ${isBusy ? 'fa-circle-notch fa-spin' : side === 'UP' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} />
                  {isStaking ? 'CONFIRM STAKE?' : needsWallet ? 'CONNECT WALLET' : insufficientBalance ? 'INSUFFICIENT BALANCE' : `PREDICT ${side}`}
                </button>
              </div>
            </>
          ) : (
            <div className="gr-locked">
              <i className="fa-solid fa-lock" />
              {isLive && 'Predictions locked \u2014 round in progress'}
              {isResolved && 'Round resolved. Next round opening soon...'}
            </div>
          )}

          {/* Position Strip */}
          {userTotalStake > 0 && (
            <div className="gr-pos-strip">
              <span className="gr-pos-lbl">Your Position</span>
              {userUpStake > 0 && (
                <span className="gr-pos-val">
                  <span className="gr-pos-dir up">{'\u25B2'} UP</span> {userUpStake} {room.token}
                  {winner === 'UP' && <span style={{ color: 'var(--hud-green)', marginLeft: '4px' }}>+{(userUpStake * upMultiplier - userUpStake).toFixed(2)}</span>}
                  {winner === 'DOWN' && <span style={{ color: 'var(--hud-red)', marginLeft: '4px' }}>lost</span>}
                </span>
              )}
              {userDownStake > 0 && (
                <span className="gr-pos-val">
                  <span className="gr-pos-dir dn">{'\u25BC'} DOWN</span> {userDownStake} {room.token}
                  {winner === 'DOWN' && <span style={{ color: 'var(--hud-green)', marginLeft: '4px' }}>+{(userDownStake * downMultiplier - userDownStake).toFixed(2)}</span>}
                  {winner === 'UP' && <span style={{ color: 'var(--hud-red)', marginLeft: '4px' }}>lost</span>}
                </span>
              )}
              {signedCommitment && (
                <span className="gr-pos-proof" title={signedCommitment.txHash ? `Tx: ${signedCommitment.txHash.slice(0, 20)}\u2026` : 'Committed'}>
                  <CheckCircle2 className="w-3 h-3" /> On-chain proof
                </span>
              )}
            </div>
          )}

          {/* AI Bots ? hidden for now */}
          {/* 
          <div className="gr-bots">
            <div className="gr-sec-label"><i className="fa-solid fa-robot" /> AI Competitors</div>
            {BOT_PROFILES.map((bot) => {
              const botPred = room.predictions.find(p => p.address.toLowerCase() === bot.address.toLowerCase());
              const avClass = bot.name === 'AlphaBot' ? 'blue' : bot.name === 'OracleX' ? 'purple' : 'green';
              return (
                <div key={bot.address} className="gr-bot-card">
                  <div className="gr-bot-hdr">
                    <div className={`gr-bot-av ${avClass}`}>{'\u{1F916}'}</div>
                    <div>
                      <span className="gr-bot-name">{bot.name}</span>
                      {botPred && (
                        <span className={`gr-bot-dir ${botPred.direction === 'UP' ? 'up' : 'dn'}`}>
                          {botPred.direction === 'UP' ? '\u25B2 UP' : '\u25BC DN'}
                        </span>
                      )}
                      <div className="gr-bot-meta">{bot.strategy}</div>
                    </div>
                  </div>
                  <div className="gr-bot-taunt">
                    {botPred
                      ? `"${bot.name === 'AlphaBot' ? 'Technical signals favor my call.' : bot.name === 'OracleX' ? 'My neural nets have spoken.' : 'Sentiment is clear to me.'}"`
                      : <><span className="cursor" /> analyzing...</>}
                  </div>
                </div>
              );
            })}
          </div>
          */}
        </div>
      </div>

      {/* ----------- RESOLUTION MODAL ----------- */}
      <ResolutionReveal
        open={showReveal}
        onClose={() => { setShowReveal(false); onRoundComplete?.(); }}
        winner={winner ?? 'TIE'}
        startPrice={room.startPrice ?? 0}
        endPrice={room.endPrice ?? 0}
        asset={room.asset}
        token={room.token}
        userOutcome={userOutcome}
        userPayout={userPayout}
        userStake={userTotalStake}
        botResults={botResults}
        ptsGained={ptsGained}
        payoutTxHash={payoutTxHash}
        payoutStatus={payoutStatus}
        payoutError={payoutError}
        onRetryPayout={() => room && requestOnChainPayout(room, true)}
      />
    </div>
  );
}

