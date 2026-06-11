'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { bybitPriceFeed, AssetSymbol, PriceTick } from '@/lib/bybit-price-feed';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AIAgent {
  id: string;
  name: string;
  version: string;
  address: string;
  tokenId: string;
  isActive: boolean;
  totalDecisions: number;
  correctDecisions: number;
  winRate: number;
  totalPnL: number;
  lastDecision?: AIDecision;
  createdAt: number;
  strategy: 'momentum' | 'mean-reversion' | 'neural';
}

interface AIDecision {
  direction: 'UP' | 'DOWN' | 'HOLD';
  confidence: number; // 0-100
  stake: number;
  reasoning: string;
  timestamp: number;
  txHash: string;
  asset: AssetSymbol;
  priceAtDecision: number;
  wasCorrect?: boolean;
  pnl?: number;
}

interface HumanPlayer {
  address: string;
  name: string;
  totalDecisions: number;
  correctDecisions: number;
  winRate: number;
  totalPnL: number;
  lastDecision?: HumanDecision;
}

interface HumanDecision {
  direction: 'UP' | 'DOWN';
  stake: number;
  timestamp: number;
  wasCorrect?: boolean;
  pnl?: number;
}

interface CompetitionSession {
  id: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  totalAgents: number;
  totalHumans: number;
  prizePool: number;
}

interface AIAgentContextType {
  agents: AIAgent[];
  activeAgent: AIAgent | null;
  agentDecisions: AIDecision[];
  humanPlayers: HumanPlayer[];
  currentHuman: HumanPlayer | null;
  currentSession: CompetitionSession | null;
  leaderboard: (AIAgent | HumanPlayer)[];
  livePrices: Record<string, PriceTick>;
  registerAgent: (name: string, version: string) => Promise<string>;
  startAgent: (agentId: string) => Promise<void>;
  stopAgent: (agentId: string) => Promise<void>;
  makeHumanDecision: (direction: 'UP' | 'DOWN', stake: number) => Promise<void>;
  subscribeToUpdates: () => void;
  unsubscribeFromUpdates: () => void;
}

// ── Technical Analysis helpers ────────────────────────────────────────────────

/** Simple RSI calculation from price history */
function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/** Simple momentum: % change over last N ticks */
function calcMomentum(prices: number[], period = 5): number {
  if (prices.length < period + 1) return 0;
  const old = prices[prices.length - 1 - period];
  const cur = prices[prices.length - 1];
  return ((cur - old) / old) * 100;
}

/** Bollinger Band position: 0 = lower band, 1 = upper band */
function calcBBPosition(prices: number[], period = 20): number {
  if (prices.length < period) return 0.5;
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
  const cur = prices[prices.length - 1];
  if (std === 0) return 0.5;
  return (cur - (mean - 2 * std)) / (4 * std); // 0 = lower, 1 = upper
}

/** Generate AI decision based on strategy and real price data */
function generateDecision(
  agent: AIAgent,
  asset: AssetSymbol,
  priceHistory: number[],
  currentPrice: number
): AIDecision {
  const rsi = calcRSI(priceHistory);
  const momentum = calcMomentum(priceHistory);
  const bbPos = calcBBPosition(priceHistory);

  let direction: 'UP' | 'DOWN' | 'HOLD' = 'HOLD';
  let confidence = 50;
  let reasoning = '';

  if (agent.strategy === 'momentum') {
    // Momentum: follow the trend
    if (momentum > 0.3 && rsi < 70) {
      direction = 'UP';
      confidence = Math.min(90, 50 + momentum * 10 + (70 - rsi) * 0.3);
      reasoning = `Momentum +${momentum.toFixed(2)}%, RSI ${rsi.toFixed(1)} (not overbought), bullish trend`;
    } else if (momentum < -0.3 && rsi > 30) {
      direction = 'DOWN';
      confidence = Math.min(90, 50 + Math.abs(momentum) * 10 + (rsi - 30) * 0.3);
      reasoning = `Momentum ${momentum.toFixed(2)}%, RSI ${rsi.toFixed(1)} (not oversold), bearish trend`;
    } else {
      direction = 'HOLD';
      confidence = 40;
      reasoning = `Weak momentum (${momentum.toFixed(2)}%), waiting for clearer signal`;
    }
  } else if (agent.strategy === 'mean-reversion') {
    // Mean reversion: fade extremes
    if (rsi < 30 && bbPos < 0.2) {
      direction = 'UP';
      confidence = Math.min(88, 50 + (30 - rsi) * 1.5 + (0.2 - bbPos) * 100);
      reasoning = `RSI oversold at ${rsi.toFixed(1)}, BB position ${(bbPos * 100).toFixed(0)}% — mean reversion expected`;
    } else if (rsi > 70 && bbPos > 0.8) {
      direction = 'DOWN';
      confidence = Math.min(88, 50 + (rsi - 70) * 1.5 + (bbPos - 0.8) * 100);
      reasoning = `RSI overbought at ${rsi.toFixed(1)}, BB position ${(bbPos * 100).toFixed(0)}% — pullback expected`;
    } else {
      direction = 'HOLD';
      confidence = 35;
      reasoning = `RSI ${rsi.toFixed(1)}, BB ${(bbPos * 100).toFixed(0)}% — no extreme to fade`;
    }
  } else {
    // Neural: weighted combination
    const score = (rsi - 50) * -0.4 + momentum * 15 + (bbPos - 0.5) * -30;
    if (score > 8) {
      direction = 'UP';
      confidence = Math.min(85, 55 + score);
      reasoning = `Neural score +${score.toFixed(1)}: RSI ${rsi.toFixed(1)}, momentum ${momentum.toFixed(2)}%, BB ${(bbPos * 100).toFixed(0)}%`;
    } else if (score < -8) {
      direction = 'DOWN';
      confidence = Math.min(85, 55 + Math.abs(score));
      reasoning = `Neural score ${score.toFixed(1)}: RSI ${rsi.toFixed(1)}, momentum ${momentum.toFixed(2)}%, BB ${(bbPos * 100).toFixed(0)}%`;
    } else {
      direction = 'HOLD';
      confidence = 38;
      reasoning = `Neural score ${score.toFixed(1)} — insufficient signal strength`;
    }
  }

  const stake = Math.round((confidence / 100) * 300);

  return {
    direction,
    confidence: Math.round(confidence),
    stake,
    reasoning,
    timestamp: Date.now(),
    txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    asset,
    priceAtDecision: currentPrice,
  };
}

// ── Backend API URL ───────────────────────────────────────────────────────────
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';

// ── Initial agents — must match BOT_PROFILES in RoomsContext and DB names ─────
const INITIAL_AGENTS: AIAgent[] = [
  {
    id: 'ai-agent-001',
    name: 'AlphaPredict',
    version: '1.0.0',
    address: '0xD33744400Ed8211F7a5900926Df22CD8C2A2aD74',
    tokenId: '5',
    isActive: true,
    totalDecisions: 0,
    correctDecisions: 0,
    winRate: 0,
    totalPnL: 0,
    createdAt: Date.now() - 86_400_000,
    strategy: 'momentum',
  },
  {
    id: 'ai-agent-002',
    name: 'MomentumMaster',
    version: '1.0.0',
    address: '0x62Bc9Ab4dCdd43eC1f6FdA4F71220f6F85b80A59',
    tokenId: '6',
    isActive: true,
    totalDecisions: 0,
    correctDecisions: 0,
    winRate: 0,
    totalPnL: 0,
    createdAt: Date.now() - 172_800_000,
    strategy: 'mean-reversion',
  },
  {
    id: 'ai-agent-003',
    name: 'NeuralTrader',
    version: '1.0.0',
    address: '0x508EaDdf521Ae4887AecfeC2d7d7C43F94bd7c39',
    tokenId: '7',
    isActive: true,
    totalDecisions: 0,
    correctDecisions: 0,
    winRate: 0,
    totalPnL: 0,
    createdAt: Date.now() - 43_200_000,
    strategy: 'neural',
  },
];

// ── API persistence helpers ───────────────────────────────────────────────────

async function fetchAgentStatsFromDB(): Promise<Record<string, { totalDecisions: number; correctDecisions: number; winRate: number; totalPnL: number }>> {
  try {
    const res = await fetch(`${API_URL}/agents/stats`, { cache: 'no-store' });
    if (!res.ok) return {};
    const json = await res.json();
    const map: Record<string, any> = {};
    for (const row of (json.data ?? [])) {
      map[row.name] = {
        totalDecisions:   row.total_decisions,
        correctDecisions: row.correct_decisions,
        winRate:          row.win_rate,
        totalPnL:         row.total_pnl,
      };
    }
    return map;
  } catch { return {}; }
}

async function pushAgentStatsToDB(agents: AIAgent[]): Promise<void> {
  try {
    await fetch(`${API_URL}/agents/stats`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(agents.map(a => ({
        name:             a.name,
        strategy:         a.strategy,
        totalDecisions:   a.totalDecisions,
        correctDecisions: a.correctDecisions,
        winRate:          a.winRate,
        totalPnL:         a.totalPnL,
      }))),
    });
  } catch { /* network unavailable — silently ignore */ }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AIAgentContext = createContext<AIAgentContextType | null>(null);

export function useAIAgent() {
  const context = useContext(AIAgentContext);
  if (!context) throw new Error('useAIAgent must be used within AIAgentProvider');
  return context;
}

// Session start is fixed at module load time so it doesn't shift on every render
const SESSION_START = Date.now() - 3_600_000;
const SESSION_END   = SESSION_START + 7_200_000; // 2h session

export function AIAgentProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const [agents, setAgents]               = useState<AIAgent[]>(INITIAL_AGENTS);
  const [activeAgent, setActiveAgent]     = useState<AIAgent | null>(INITIAL_AGENTS[0]);
  const [agentDecisions, setAgentDecisions] = useState<AIDecision[]>([]);
  const [humanPlayers, setHumanPlayers]   = useState<HumanPlayer[]>([]);
  const [currentHuman, setCurrentHuman]   = useState<HumanPlayer | null>(null);
  const [livePrices, setLivePrices]       = useState<Record<string, PriceTick>>({});

  // Price history per asset for TA calculations (last 50 ticks)
  const priceHistoryRef = useRef<Record<string, number[]>>({
    BTC: [], ETH: [], SOL: [], MNT: [],
  });
  // Ref mirror of livePrices so the decision loop can read current prices without restarting interval
  const livePricesRef = useRef<Record<string, PriceTick>>({});

  // Session object is stable — does not recalculate endTime on each render
  const currentSession: CompetitionSession = {
    id: 'session-001',
    startTime: SESSION_START,
    endTime:   SESSION_END,
    isActive:  true,
    totalAgents: agents.filter(a => a.isActive).length,
    totalHumans: humanPlayers.length + (currentHuman ? 1 : 0),
    prizePool: 50_000,
  };

  // ── Load stats from DB on mount ───────────────────────────────────────────────
  useEffect(() => {
    fetchAgentStatsFromDB().then(dbStats => {
      if (Object.keys(dbStats).length === 0) return;
      setAgents(prev => prev.map(a => {
        const s = dbStats[a.name];
        if (!s) return a;
        return {
          ...a,
          totalDecisions:   s.totalDecisions,
          correctDecisions: s.correctDecisions,
          winRate:          s.winRate,
          totalPnL:         s.totalPnL,
        };
      }));
    });
  }, []);

  // ── Sync stats to DB (debounced 10s after each change) ────────────────────────
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => pushAgentStatsToDB(agents), 10_000);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [agents]);

  // ── Poll DB stats every 60s to pick up round resolutions ─────────────────────
  useEffect(() => {
    let cancelled = false;
    const sync = () => {
      fetchAgentStatsFromDB().then(dbStats => {
        if (cancelled || Object.keys(dbStats).length === 0) return;
        setAgents(prev => prev.map(a => {
          const s = dbStats[a.name];
          if (!s) return a;
          return {
            ...a,
            totalDecisions:   s.totalDecisions,
            correctDecisions: s.correctDecisions,
            winRate:          s.winRate,
            totalPnL:         s.totalPnL,
          };
        }));
      });
    };
    // Initial load already handled by the mount effect above; poll for updates
    const timer = setInterval(sync, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  // ── Subscribe to Bybit real-time prices ──────────────────────────────────────
  useEffect(() => {
    const assets: AssetSymbol[] = ['BTC', 'ETH', 'SOL', 'MNT'];
    const unsubs = assets.map(asset =>
      bybitPriceFeed.subscribe(asset, tick => {
        livePricesRef.current[asset] = tick;
        setLivePrices(prev => ({ ...prev, [asset]: tick }));
        // Append to price history (keep last 50)
        priceHistoryRef.current[asset] = [
          ...priceHistoryRef.current[asset].slice(-49),
          tick.price,
        ];
      })
    );

    // Initial REST fetch
    bybitPriceFeed.fetchOnce(assets).then(map => {
      const prices: Record<string, PriceTick> = {};
      map.forEach((tick, asset) => {
        prices[asset] = tick;
        livePricesRef.current[asset] = tick;
        priceHistoryRef.current[asset] = [tick.price];
      });
      setLivePrices(prices);
    });

    return () => unsubs.forEach(u => u());
  }, []);

  // ── AI signal loop — every 15s, generates lastDecision for display only ──────
  // Stats (totalDecisions, winRate, totalPnL) are updated from REAL round outcomes
  // via the backend (POST /rounds/complete → updateAgentStatsFromRound in db.js).
  // The simulation here does NOT modify cumulative stats — it only updates lastDecision
  // so the AI Monitor can show what each agent is currently "thinking".
  useEffect(() => {
    // Each agent watches a different primary asset (by fixed index, not totalDecisions)
    const AGENT_ASSETS: AssetSymbol[] = ['BTC', 'ETH', 'SOL'];
    const SIGNAL_INTERVAL = 15_000;

    const interval = setInterval(() => {
      setAgents(prev => prev.map((agent, idx) => {
        if (!agent.isActive) return agent;

        // Primary asset assigned by agent position — never all-BTC
        const asset   = AGENT_ASSETS[idx % AGENT_ASSETS.length];
        const history = priceHistoryRef.current[asset] ?? [];
        const price   = livePricesRef.current[asset]?.price ?? 0;

        if (price === 0) return agent;

        // Need at least a few ticks; pad with current price if history is short
        const paddedHistory = history.length >= 5
          ? history
          : Array(5).fill(price).map((p, i) => p * (1 + (i - 2) * 0.001));

        const decision = generateDecision(agent, asset, paddedHistory, price);

        // Only update lastDecision for UI — stats come from real round outcomes
        setAgentDecisions(prev => [decision, ...prev].slice(0, 50));
        return { ...agent, lastDecision: decision };
      }));
    }, SIGNAL_INTERVAL);

    return () => clearInterval(interval);
  }, []); // empty deps — reads prices from refs, never restarts

  // ── Leaderboard ───────────────────────────────────────────────────────────────
  const leaderboard = [...agents, ...humanPlayers, ...(currentHuman ? [currentHuman] : [])]
    .sort((a, b) => b.winRate !== a.winRate ? b.winRate - a.winRate : b.totalPnL - a.totalPnL);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const registerAgent = async (name: string, version: string): Promise<string> => {
    const strategies: AIAgent['strategy'][] = ['momentum', 'mean-reversion', 'neural'];
    const newAgent: AIAgent = {
      id:               `ai-agent-${Date.now()}`,
      name,
      version,
      address:          `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      tokenId:          String(agents.length + 1),
      isActive:         false,
      totalDecisions:   0,
      correctDecisions: 0,
      winRate:          0,
      totalPnL:         0,
      createdAt:        Date.now(),
      strategy:         strategies[agents.length % strategies.length],
    };
    setAgents(prev => [...prev, newAgent]);
    return newAgent.id;
  };

  const startAgent = async (agentId: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isActive: true } : a));
    setActiveAgent(agents.find(a => a.id === agentId) ?? null);
  };

  const stopAgent = async (agentId: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isActive: false } : a));
  };

  const makeHumanDecision = async (direction: 'UP' | 'DOWN', stake: number) => {
    if (!address) return;
    const decision: HumanDecision = { direction, stake, timestamp: Date.now() };

    setCurrentHuman(prev => {
      const wasCorrect = Math.random() > 0.45; // slightly below AI
      const pnl = wasCorrect ? stake * 0.95 : -stake;
      if (!prev) {
        return {
          address,
          name: `${address.slice(0, 6)}…${address.slice(-4)}`,
          totalDecisions:   1,
          correctDecisions: wasCorrect ? 1 : 0,
          winRate:          wasCorrect ? 100 : 0,
          totalPnL:         pnl,
          lastDecision:     { ...decision, wasCorrect, pnl },
        };
      }
      const newCorrect = prev.correctDecisions + (wasCorrect ? 1 : 0);
      const newTotal   = prev.totalDecisions + 1;
      return {
        ...prev,
        totalDecisions:   newTotal,
        correctDecisions: newCorrect,
        winRate:          (newCorrect / newTotal) * 100,
        totalPnL:         prev.totalPnL + pnl,
        lastDecision:     { ...decision, wasCorrect, pnl },
      };
    });
  };

  const subscribeToUpdates   = () => { /* WebSocket ready when contracts deployed */ };
  const unsubscribeFromUpdates = () => {};

  return (
    <AIAgentContext.Provider value={{
      agents,
      activeAgent,
      agentDecisions,
      humanPlayers,
      currentHuman,
      currentSession,
      leaderboard,
      livePrices,
      registerAgent,
      startAgent,
      stopAgent,
      makeHumanDecision,
      subscribeToUpdates,
      unsubscribeFromUpdates,
    }}>
      {children}
    </AIAgentContext.Provider>
  );
}
