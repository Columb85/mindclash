'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { providers, Contract } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowUp, ArrowDown, CheckCircle2, XCircle, ExternalLink, Wifi, WifiOff } from 'lucide-react';

const RPC_URL  = 'https://rpc.sepolia.mantle.xyz';
const NFT_ADDR = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';
const EXPLORER = 'https://sepolia.mantlescan.xyz';

const AGENT_NFT_ABI = [
  'function getRecentDecisions(uint256 tokenId, uint256 limit) view returns (tuple(string direction, uint256 confidence, uint256 stake, uint256 timestamp, bool wasCorrect, int256 pnl, string reasoning, bytes32 decisionHash)[])',
  'event DecisionRecorded(uint256 indexed tokenId, bytes32 decisionHash, string direction, uint256 confidence)',
  'event DecisionResolved(uint256 indexed tokenId, uint256 decisionIndex, bool wasCorrect, int256 pnl)',
];

const AGENTS: Record<number, { name: string; strategy: string; color: string }> = {
  5: { name: 'AlphaPredict',   strategy: 'Momentum',       color: '#3b82f6' },
  6: { name: 'MomentumMaster', strategy: 'Mean-Reversion', color: '#a855f7' },
  7: { name: 'NeuralTrader',   strategy: 'Neural Net',     color: '#22c55e' },
};

interface FeedItem {
  id: string;
  type: 'decision' | 'resolve';
  tokenId: number;
  agentName: string;
  color: string;
  direction?: string;
  confidence?: number;
  wasCorrect?: boolean;
  pnl?: number;
  reasoning?: string;
  timestamp: number;
  txHash?: string;
}

export function LiveActivityFeed() {
  const [items, setItems]       = useState<FeedItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [polling, setPolling]   = useState(true);
  const prevCountRef = useRef<Record<number, number>>({});

  // Poll for new decisions every 15 seconds (more reliable than events on Sepolia)
  const pollDecisions = useCallback(async () => {
    try {
      const prov = new providers.JsonRpcProvider(RPC_URL);
      const ctr  = new Contract(NFT_ADDR, AGENT_NFT_ABI, prov);

      const newItems: FeedItem[] = [];

      for (const tid of [5, 6, 7]) {
        try {
          const decisions = await ctr.getRecentDecisions(tid, 10);
          const agent = AGENTS[tid];
          const prevCount = prevCountRef.current[tid] ?? decisions.length;

          // Detect new decisions since last poll
          if (decisions.length > prevCount) {
            for (let i = prevCount; i < decisions.length; i++) {
              const d = decisions[i];
              newItems.push({
                id:         `dec-${tid}-${i}-${Date.now()}`,
                type:       'decision',
                tokenId:    tid,
                agentName:  agent.name,
                color:      agent.color,
                direction:  d.direction,
                confidence: Number(d.confidence),
                reasoning:  d.reasoning,
                timestamp:  Number(d.timestamp) || Math.floor(Date.now() / 1000),
              });
            }
          }

          // Check last few decisions for newly resolved
          decisions.slice(-5).forEach((d: any, i: number) => {
            if (d.wasCorrect && Number(d.pnl) !== 0) {
              const resolveId = `res-${tid}-${Number(d.timestamp)}-${Number(d.pnl)}`;
              newItems.push({
                id:         resolveId,
                type:       'resolve',
                tokenId:    tid,
                agentName:  agent.name,
                color:      agent.color,
                wasCorrect: d.wasCorrect,
                pnl:        Number(d.pnl),
                direction:  d.direction,
                timestamp:  Number(d.timestamp),
              });
            }
          });

          prevCountRef.current[tid] = decisions.length;
        } catch {
          // skip failed agent
        }
      }

      if (newItems.length > 0) {
        setItems(prev => {
          const ids = new Set(prev.map(p => p.id));
          const unique = newItems.filter(n => !ids.has(n.id));
          return [...unique, ...prev].slice(0, 50);
        });
      }
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, []);

  // Initial load: seed with existing decisions
  useEffect(() => {
    const seed = async () => {
      try {
        const prov = new providers.JsonRpcProvider(RPC_URL);
        const ctr  = new Contract(NFT_ADDR, AGENT_NFT_ABI, prov);
        const allItems: FeedItem[] = [];

        for (const tid of [5, 6, 7]) {
          try {
            const decisions = await ctr.getRecentDecisions(tid, 10);
            const agent = AGENTS[tid];
            prevCountRef.current[tid] = decisions.length;

            decisions.forEach((d: any, i: number) => {
              allItems.push({
                id:         `seed-${tid}-${i}`,
                type:       'decision',
                tokenId:    tid,
                agentName:  agent.name,
                color:      agent.color,
                direction:  d.direction,
                confidence: Number(d.confidence),
                reasoning:  d.reasoning,
                wasCorrect: d.wasCorrect,
                pnl:        Number(d.pnl),
                timestamp:  Number(d.timestamp) || 0,
              });
            });
          } catch {
            prevCountRef.current[tid] = 0;
          }
        }

        allItems.sort((a, b) => b.timestamp - a.timestamp);
        setItems(allItems.slice(0, 30));
        setConnected(true);
      } catch {
        setConnected(false);
      }
    };
    seed();
  }, []);

  // Polling interval
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(pollDecisions, 15_000);
    return () => clearInterval(id);
  }, [polling, pollDecisions]);

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/30 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-bold text-white">Live Activity</span>
          <span className="text-[10px] text-gray-500">on-chain events</span>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <span className="flex items-center gap-1 text-[10px] text-green-400">
              <Wifi className="w-3 h-3" />
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-red-400">
              <WifiOff className="w-3 h-3" /> Disconnected
            </span>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="max-h-80 overflow-y-auto">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <div className="py-8 text-center text-gray-600 text-xs">
              Waiting for agent decisions...
            </div>
          ) : (
            items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="border-b border-gray-800/20 last:border-0"
              >
                <div className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-800/10 transition">
                  {/* Agent dot */}
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: item.color }} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: item.color }}>
                        {item.agentName}
                      </span>

                      {item.type === 'decision' && item.direction && (
                        <span className={`flex items-center gap-0.5 text-xs font-bold ${
                          item.direction === 'UP' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.direction === 'UP' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                          {item.direction}
                        </span>
                      )}

                      {item.confidence !== undefined && item.confidence > 0 && (
                        <span className="text-[10px] text-gray-500">
                          {(item.confidence / 10).toFixed(1)}% conf
                        </span>
                      )}

                      {item.wasCorrect !== undefined && (
                        <span className={`flex items-center gap-0.5 text-[10px] font-bold ${
                          item.wasCorrect ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {item.wasCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {item.wasCorrect ? 'Correct' : 'Wrong'}
                        </span>
                      )}

                      {item.pnl !== undefined && item.pnl !== 0 && (
                        <span className={`text-[10px] ${item.pnl > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {item.pnl > 0 ? '+' : ''}{item.pnl} bps
                        </span>
                      )}
                    </div>

                    {item.reasoning && (
                      <div className="text-[10px] text-gray-600 truncate mt-0.5" title={item.reasoning}>
                        {item.reasoning}
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-[10px] text-gray-600 shrink-0">
                    {item.timestamp > 0 ? new Date(item.timestamp * 1000).toLocaleTimeString() : 'now'}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
