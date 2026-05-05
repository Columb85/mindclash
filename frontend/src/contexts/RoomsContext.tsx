'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { Room, Direction, Prediction } from '@/types/room';
import { ASSETS } from '@/lib/web3-config';
import { bybitPriceFeed, AssetSymbol } from '@/lib/bybit-price-feed';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function postRoundComplete(room: Room): Promise<void> {
  try {
    await fetch(`${API_URL}/rounds/complete`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        id:          room.id,
        asset:       room.asset,
        duration:    room.duration,
        startPrice:  room.startPrice  ?? null,
        endPrice:    room.endPrice    ?? null,
        upPool:      room.upPool,
        downPool:    room.downPool,
        resolvedAt:  Math.floor(Date.now() / 1000),
        predictions: room.predictions.map(p => ({
          address:   p.address,
          direction: p.direction,
          amount:    p.amount,
          timestamp: Math.floor((p.timestamp ?? Date.now()) / 1000),
        })),
      }),
    });
  } catch { /* network unavailable — silently ignore */ }
}

/**
 * Track = (asset, duration, token) pair. System auto-spawns consecutive rooms per track.
 * Lifecycle of a room:
 *   open   -> predictions accepted (predictionWindow seconds)
 *   live   -> round running, startPrice locked, predictions closed
 *   resolved -> endPrice known, payouts computed
 *
 * Prices come from Bybit WebSocket (real-time) with REST fallback.
 */
export interface Track {
  asset: keyof typeof ASSETS;
  duration: number;
  token: 'CLASH';
}

const TRACKS: Track[] = [
  { asset: 'BTC', duration: 60,  token: 'CLASH' },
  { asset: 'BTC', duration: 180, token: 'CLASH' },
  { asset: 'ETH', duration: 60,  token: 'CLASH' },
  { asset: 'ETH', duration: 300, token: 'CLASH' },
  { asset: 'SOL', duration: 60,  token: 'CLASH' },
  { asset: 'SOL', duration: 180, token: 'CLASH' },
];

const PREDICTION_WINDOW = 120; // seconds players have to predict before round goes live
const PROTOCOL_FEE      = 0.04; // 4% fee on losing pool
const MIN_STAKE         = 10;
const MAX_STAKE         = 10_000;

// ── Bot profiles — mirror main.py AGENT_STRATEGIES ────────────────────────────
export interface BotProfile {
  name: string;
  address: string;
  strategy: 'momentum' | 'mean-reversion' | 'neural';
  baseStake: number;
}
export const BOT_PROFILES: BotProfile[] = [
  { name: 'AlphaPredict',   address: '0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74', strategy: 'momentum',       baseStake: 150 },
  { name: 'MomentumMaster', address: '0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59', strategy: 'mean-reversion', baseStake: 120 },
  { name: 'NeuralTrader',   address: '0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39', strategy: 'neural',         baseStake: 100 },
];

/**
 * Simulate bot decision for a given price series.
 * Uses the same 5-signal logic as the Python bots (simplified for frontend).
 * Returns { direction, confidence } or null if bot would HOLD.
 */
function botDecision(
  strategy: BotProfile['strategy'],
  recentPrices: number[],
): { direction: 'UP' | 'DOWN'; confidence: number } | null {
  if (recentPrices.length < 5) return null;

  const n      = recentPrices.length;
  const last   = recentPrices[n - 1];
  const prev3  = recentPrices.slice(-4, -1);
  const mom3   = prev3.reduce((s, p) => s + (last - p) / p, 0) / prev3.length;

  // RSI approximation (last 14 bars if available)
  const priceWin = recentPrices.slice(-15);
  let gains = 0, losses = 0;
  for (let i = 1; i < priceWin.length; i++) {
    const d = priceWin[i] - priceWin[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  const rs  = losses === 0 ? 100 : gains / losses;
  const rsi = 100 - 100 / (1 + rs);

  // Bollinger position (last 20 bars)
  const bbWin  = recentPrices.slice(-20);
  const bbMean = bbWin.reduce((s, p) => s + p, 0) / bbWin.length;
  const bbStd  = Math.sqrt(bbWin.reduce((s, p) => s + (p - bbMean) ** 2, 0) / bbWin.length);
  const bbPos  = bbStd > 0 ? (last - (bbMean - 2 * bbStd)) / (4 * bbStd) : 0.5;

  // Signal scores [-1, +1]
  const sigMom = Math.max(-1, Math.min(1, mom3 / 0.005));
  const sigRsi = rsi < 35 ? (35 - rsi) / 35 : rsi > 65 ? -(rsi - 65) / 35 : (50 - rsi) / 30;
  const sigBb  = 1 - 2 * Math.max(0, Math.min(1, bbPos));
  const sigSma = mom3 > 0 ? 0.6 : -0.6; // simplified SMA proxy

  const weights: Record<BotProfile['strategy'], number[]> = {
    'momentum':       [0.35, 0.15, 0.15, 0.25, 0.10],
    'mean-reversion': [-0.10, 0.30, 0.30, 0.15, 0.15],
    'neural':         [0.20, 0.20, 0.20, 0.20, 0.20],
  };
  const w     = weights[strategy];
  const score = w[0]*sigMom + w[1]*sigRsi + w[2]*sigBb + w[3]*sigSma;

  if (Math.abs(score) < 0.15) return null; // HOLD — lowered threshold so bots predict more often
  const confidence = 0.55 + Math.min(0.40, Math.abs(score) * 0.55);
  return { direction: score > 0 ? 'UP' : 'DOWN', confidence };
}

// Fallback seed prices (used only until first Bybit tick arrives)
const SEED_PRICES: Record<string, number> = {
  BTC: 62_000,
  ETH: 3_100,
  SOL: 145,
  MNT: 0.85,
};

interface RoomsContextType {
  rooms: Room[];
  prices: Record<string, number>;
  predict: (roomId: string, direction: Direction, amount: number, address: string) => { ok: boolean; error?: string };
  getRoom: (id: string) => Room | undefined;
  protocolFee: number;
  predictionWindow: number;
}

const RoomsContext = createContext<RoomsContextType | undefined>(undefined);

function trackKey(t: Track) {
  return `${t.asset}_${t.duration}_${t.token}`;
}

function makeId(track: Track) {
  return `${trackKey(track)}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

const MAX_HISTORY = 180;

function spawnRoom(track: Track, openAt: number, currentPrice: number): Room {
  const botPredictions = buildBotPredictions(track, currentPrice);
  const upPool   = botPredictions.filter(p => p.direction === 'UP').reduce((s, p) => s + p.amount, 0);
  const downPool = botPredictions.filter(p => p.direction === 'DOWN').reduce((s, p) => s + p.amount, 0);
  return {
    id: makeId(track),
    asset: track.asset,
    duration: track.duration,
    token: track.token,
    minStake: MIN_STAKE,
    maxStake: MAX_STAKE,
    status: 'open',
    openTime: openAt,
    startTime: openAt + PREDICTION_WINDOW,
    endTime: openAt + PREDICTION_WINDOW + track.duration,
    currentPrice,
    upPool,
    downPool,
    predictions: botPredictions,
    priceHistory: [{ t: openAt, price: currentPrice }],
  };
}

/**
 * Returns ONE bot prediction for a fresh room.
 * Each track is assigned a specific bot (round-robin by track index).
 * This matches the "VS Bot" concept — one human vs one AI opponent.
 */
function buildBotPredictions(track: Track, spawnPrice: number): Prediction[] {
  const trackIdx = TRACKS.indexOf(track);
  const bot      = BOT_PROFILES[((trackIdx >= 0 ? trackIdx : Math.floor(Math.random() * BOT_PROFILES.length))) % BOT_PROFILES.length];

  // Synthetic price walk with 0.5% variance to generate clear signals
  const syntheticPrices: number[] = [spawnPrice];
  for (let i = 1; i < 25; i++) {
    const drift = (Math.random() - 0.48) * 0.005;
    syntheticPrices.push(syntheticPrices[i - 1] * (1 + drift));
  }

  const dec       = botDecision(bot.strategy, syntheticPrices);
  const direction = dec ? dec.direction : (Math.random() > 0.5 ? 'UP' : 'DOWN');
  const stake     = Math.round(bot.baseStake * (0.8 + Math.random() * 0.6));

  return [{
    address:   bot.address,
    direction,
    amount:    Math.max(MIN_STAKE, Math.min(MAX_STAKE, stake)),
    timestamp: Date.now(),
  }];
}

export function RoomsProvider({ children }: { children: ReactNode }) {
  const [rooms, setRooms]   = useState<Room[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({ ...SEED_PRICES });
  const pricesRef           = useRef<Record<string, number>>({ ...SEED_PRICES });

  // ── Subscribe to Bybit real-time prices ──────────────────────────────────────
  useEffect(() => {
    const assets: AssetSymbol[] = ['BTC', 'ETH', 'SOL', 'MNT'];
    const unsubs = assets.map(asset =>
      bybitPriceFeed.subscribe(asset, tick => {
        pricesRef.current[asset] = tick.price;
        setPrices(prev => ({ ...prev, [asset]: tick.price }));
      })
    );

    // Kick off an immediate REST fetch so we have real prices before WS connects
    bybitPriceFeed.fetchOnce(assets).then(map => {
      map.forEach((tick, asset) => {
        pricesRef.current[asset] = tick.price;
      });
      setPrices(prev => {
        const next = { ...prev };
        map.forEach((tick, asset) => { next[asset] = tick.price; });
        return next;
      });
    });

    return () => unsubs.forEach(u => u());
  }, []);

  // ── Seed initial rooms once prices are ready ─────────────────────────────────
  useEffect(() => {
    const nowSec = Math.floor(Date.now() / 1000);
    const initial: Room[] = TRACKS.map((track, i) =>
      spawnRoom(track, nowSec + (i % 2 === 0 ? 0 : -10), pricesRef.current[track.asset] ?? SEED_PRICES[track.asset])
    );
    setRooms(initial);
  }, []); // run once on mount

  // ── Tick: advance room statuses using real prices ────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const nowSec = Math.floor(Date.now() / 1000);

      setRooms(prev => {
        let next: Room[] = prev.map(room => {
          const price      = pricesRef.current[room.asset] ?? room.currentPrice;
          let status       = room.status;
          let startPrice   = room.startPrice;
          let endPrice     = room.endPrice;

          if (status === 'open' && nowSec >= room.startTime) {
            status     = 'live';
            startPrice = price; // lock start price at real market price
          }
          if (status === 'live' && nowSec >= room.endTime) {
            status   = 'resolved';
            endPrice = price; // lock end price at real market price
            // Fire-and-forget: persist resolved round to DB
            postRoundComplete({ ...room, status: 'resolved', endPrice });
          }

          const effectivePrice = status === 'resolved' ? (room.endPrice ?? price) : price;
          const priceHistory =
            room.status === 'resolved'
              ? room.priceHistory
              : [...room.priceHistory, { t: nowSec, price: effectivePrice }].slice(-MAX_HISTORY);

          return {
            ...room,
            currentPrice: effectivePrice,
            status,
            startPrice,
            endPrice,
            priceHistory,
          };
        });

        // Spawn next room per track if no open/live room exists
        for (const track of TRACKS) {
          const key          = trackKey(track);
          const roomsForTrack = next.filter(r => r.id.startsWith(key));
          const hasFutureRoom = roomsForTrack.some(r => r.status === 'open' || r.status === 'live');
          if (!hasFutureRoom) {
            next = [...next, spawnRoom(track, nowSec, pricesRef.current[track.asset] ?? SEED_PRICES[track.asset])];
          }
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ── Predict ──────────────────────────────────────────────────────────────────
  const predict = useCallback(
    (roomId: string, direction: Direction, amount: number, address: string) => {
      let result: { ok: boolean; error?: string } = { ok: true };
      setRooms(prev =>
        prev.map(room => {
          if (room.id !== roomId) return room;
          if (room.status !== 'open') {
            result = { ok: false, error: 'Predictions are closed: round has started' };
            return room;
          }
          if (amount < room.minStake || amount > room.maxStake) {
            result = { ok: false, error: `Stake must be between ${room.minStake} and ${room.maxStake}` };
            return room;
          }
          const prediction: Prediction = {
            address,
            direction,
            amount,
            timestamp: Date.now(),
          };
          return {
            ...room,
            predictions: [...room.predictions, prediction],
            upPool:   direction === 'UP'   ? room.upPool   + amount : room.upPool,
            downPool: direction === 'DOWN' ? room.downPool + amount : room.downPool,
          };
        })
      );
      return result;
    },
    []
  );

  const getRoom = useCallback((id: string) => rooms.find(r => r.id === id), [rooms]);

  return (
    <RoomsContext.Provider
      value={{ rooms, prices, predict, getRoom, protocolFee: PROTOCOL_FEE, predictionWindow: PREDICTION_WINDOW }}
    >
      {children}
    </RoomsContext.Provider>
  );
}

export function useRooms() {
  const ctx = useContext(RoomsContext);
  if (!ctx) throw new Error('useRooms must be used within RoomsProvider');
  return ctx;
}
