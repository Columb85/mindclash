'use client';

import { useState, useEffect } from 'react';
import { providers, Contract } from 'ethers';
import { motion } from 'framer-motion';
import { Activity, CheckCircle2, Brain } from 'lucide-react';

const RPC_URL  = 'https://rpc.sepolia.mantle.xyz';
const NFT_ADDR = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';

const ABI = [
  'function getRecentDecisions(uint256 tokenId, uint256 limit) view returns (tuple(string direction, uint256 confidence, uint256 stake, uint256 timestamp, bool wasCorrect, int256 pnl, string reasoning, bytes32 decisionHash)[])',
];

export function VanityCounter() {
  const [total, setTotal]     = useState<number | null>(null);
  const [correct, setCorrect] = useState<number | null>(null);
  const [agents, setAgents]   = useState(3);

  useEffect(() => {
    const load = async () => {
      try {
        const prov = new providers.JsonRpcProvider(RPC_URL);
        const c    = new Contract(NFT_ADDR, ABI, prov);
        let t = 0, cor = 0;
        for (const tid of [5, 6, 7]) {
          try {
            const decs = await c.getRecentDecisions(tid, 500);
            t   += decs.length;
            cor += decs.filter((d: any) => d.wasCorrect).length;
          } catch { /* skip */ }
        }
        setTotal(t);
        setCorrect(cor);
      } catch { /* silent */ }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <CounterCard
        label="On-chain Decisions"
        value={total}
        icon={<Activity className="w-5 h-5 text-blue-400" />}
        color="#3b82f6"
      />
      <CounterCard
        label="Correct Predictions"
        value={correct}
        icon={<CheckCircle2 className="w-5 h-5 text-green-400" />}
        color="#22c55e"
      />
      <CounterCard
        label="Active AI Agents"
        value={agents}
        icon={<Brain className="w-5 h-5 text-purple-400" />}
        color="#a855f7"
      />
    </div>
  );
}

function CounterCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      className="rounded-xl border px-4 py-4 text-center space-y-1"
      style={{ borderColor: `${color}20`, background: `${color}05` }}
    >
      <div className="flex items-center justify-center gap-2">
        {icon}
        {value !== null ? (
          <motion.span
            key={value}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-black text-white tabular-nums"
          >
            {value.toLocaleString()}
          </motion.span>
        ) : (
          <span className="text-2xl text-gray-700 animate-pulse">—</span>
        )}
      </div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}
