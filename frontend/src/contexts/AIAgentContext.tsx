'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
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
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ── Initial agents (fallback if API unavailable) ──────────────────────────────
// These are the REAL deployed agents on Mantle Sepolia

const INITIAL_AGENTS: AIAgent[] = [
  {
    id: 'ai-agent-001',
    name: 'AlphaPredict',
    version: '1.0.0',
    address: '0x25fc497AF97a258296E749a11bb08Df81dD70eC5', // Real owner address
    tokenId: '1',
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
    name: 'BetaOracle',
    version: '1.0.0',
    address: '0x042e2a0459CbcfC3e0815a049bcF6D9107e9682A', // Real owner address
    tokenId: '2',
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
    name: 'GammaNeural',
    version: '1.0.0',
    address: '0x8F6D6F81d9f1DAE2ba8805845e79Ab672Bd70D6d', // Real owner address
    tokenId: '3',
    isActive: true,
    totalDecisions: 0,
    correctDecisions: 0,
    winRate: 0,
    totalPnL: 0,
    createdAt: Date.now() - 43_200_000,
    strategy: 'neural',
  },
];

// ── Helper to fetch agents from backend API ───────────────────────────────────
async function fetchAgentsFromAPI(): Promise<AIAgent[]> {
  try {
    const response = await fetch(`${API_URL}/agents`);
    if (!response.ok) throw new Error('Failed to fetch agents');
    
    const data = await response.json();
    if (!data.success || !data.agents) throw new Error('Invalid response');
    
    // Map API response to AIAgent format
    return data.agents.map((agent: any, index: number) => {
      const strategies: AIAgent['strategy'][] = ['momentum', 'mean-reversion', 'neural'];
      return {
        id: `ai-agent-${agent.tokenId}`,
        name: agent.name,
        version: agent.version,
        address: agent.owner,
        tokenId: agent.tokenId.toString(),
        isActive: agent.isActive,
        totalDecisions: Number(agent.totalDecisions) || 0,
        correctDecisions: Number(agent.correctDecisions) || 0,
        winRate: parseFloat(agent.winRate) || 0,
        totalPnL: parseFloat(agent.totalPnL) || 0,
        createdAt: agent.createdAt * 1000, // Convert to milliseconds
        strategy: strategies[index % strategies.length],
      };
    });
  } catch (error) {
    console.warn('Failed to fetch agents from API, using fallback:', error);
    return INITIAL_AGENTS;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AIAgentContext = createContext<AIAgentContextType | null>(null);

export function useAIAgent() {
  const context = useContext(AIAgentContext);
  if (!context) throw new Error('useAIAgent must be used within AIAgentProvider');
  return context;
}

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

  const currentSession: CompetitionSession = {
    id: 'session-001',
    startTime: Date.now() - 3_600_000,
    endTime:   Date.now() + 3_600_000,
    isActive:  true,
    totalAgents: agents.filter(a => a.isActive).length,
    totalHumans: humanPlayers.length + (currentHuman ? 1 : 0),
    prizePool: 50_000,
  };

  // ── Fetch agents from backend API on mount ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    
    fetchAgentsFromAPI().then(apiAgents => {
      if (!cancelled && apiAgents.length > 0) {
        console.log('✅ Loaded agents from blockchain via API:', apiAgents);
        setAgents(apiAgents);
        setActiveAgent(apiAgents[0]);
      }
    });
    
    return () => { cancelled = true; };
  }, []);

  // ── Subscribe to Bybit real-time prices ──────────────────────────────────────
  useEffect(() => {
    const assets: AssetSymbol[] = ['BTC', 'ETH', 'SOL', 'MNT'];
    const unsubs = assets.map(asset =>
      bybitPriceFeed.subscribe(asset, tick => {
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
        priceHistoryRef.current[asset] = [tick.price];
      });
      setLivePrices(prices);
    });

    return () => unsubs.forEach(u => u());
  }, []);

  // ── AI decision loop — every 15s, based on real prices ───────────────────────
  useEffect(() => {
    const ASSETS_TO_TRADE: AssetSymbol[] = ['BTC', 'ETH', 'SOL'];
    const DECISION_INTERVAL = 15_000; // 15 seconds

    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => {
        if (!agent.isActive) return agent;

        // Pick asset round-robin based on agent id hash
        const assetIdx = (agent.totalDecisions) % ASSETS_TO_TRADE.length;
        const asset    = ASSETS_TO_TRADE[assetIdx];
        const history  = priceHistoryRef.current[asset] ?? [];
        const price    = livePrices[asset]?.price ?? 0;

        if (history.length < 5 || price === 0) return agent; // not enough data yet

        const decision = generateDecision(agent, asset, history, price);

        // Skip HOLD decisions for display (but count them)
        if (decision.direction === 'HOLD') {
          return { ...agent, totalDecisions: agent.totalDecisions + 1 };
        }

        // Simulate outcome after 30s (optimistic: 60% win rate for good strategies)
        const winProb = agent.strategy === 'momentum' ? 0.58 : agent.strategy === 'mean-reversion' ? 0.62 : 0.55;
        const wasCorrect = Math.random() < winProb;
        const pnl = wasCorrect ? decision.stake * 0.95 : -decision.stake;

        const newCorrect = agent.correctDecisions + (wasCorrect ? 1 : 0);
        const newTotal   = agent.totalDecisions + 1;

        setAgentDecisions(prev => [decision, ...prev].slice(0, 50));

        return {
          ...agent,
          totalDecisions:   newTotal,
          correctDecisions: newCorrect,
          winRate:          (newCorrect / newTotal) * 100,
          totalPnL:         agent.totalPnL + pnl,
          lastDecision:     { ...decision, wasCorrect, pnl },
        };
      }));
    }, DECISION_INTERVAL);

    return () => clearInterval(interval);
  }, [livePrices]);

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
