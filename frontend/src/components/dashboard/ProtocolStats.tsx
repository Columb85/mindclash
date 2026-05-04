'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Coins, Zap, Activity, Database } from 'lucide-react';
import { useRooms } from '@/contexts/RoomsContext';
import { useContractRead } from 'wagmi';
import { formatUnits } from 'viem';
import { CLASH_TOKEN_ADDRESS, TREASURY_ADDRESS, CLASH_ABI } from '@/contexts/ClashContext';

export function ProtocolStats() {
  const { rooms } = useRooms();
  const [activePlayers, setActivePlayers] = useState(847);
  const [roundsToday, setRoundsToday] = useState(4128);

  // Simulate active players / rounds growth
  useEffect(() => {
    const i = setInterval(() => {
      setActivePlayers(prev => prev + Math.floor(Math.random() * 3) - 1);
      setRoundsToday(prev => prev + (Math.random() > 0.6 ? 1 : 0));
    }, 2500);
    return () => clearInterval(i);
  }, []);

  // ── Real on-chain Treasury $CLASH balance ───────────────────────────────────
  const { data: treasuryRaw } = useContractRead({
    address: CLASH_TOKEN_ADDRESS,
    abi: CLASH_ABI,
    functionName: 'balanceOf',
    args: [TREASURY_ADDRESS],
    watch: false,
    staleTime: 60_000,
    cacheTime: 120_000,
  });
  const treasuryBalance = treasuryRaw !== undefined
    ? Math.floor(Number(formatUnits(treasuryRaw as bigint, 18)))
    : null;

  const activeRounds = rooms.filter(r => r.status === 'open' || r.status === 'live').length;
  const openPredictions = rooms.reduce((s, r) => s + r.predictions.length, 0);

  const items = [
    { icon: Activity,   label: 'Active Rounds',     value: activeRounds.toString(),       color: '#22c55e', pulse: true },
    { icon: Users,      label: 'Active Players',    value: activePlayers.toLocaleString(), color: '#3b82f6' },
    { icon: TrendingUp, label: 'Rounds Today',      value: roundsToday.toLocaleString(),   color: '#a78bfa' },
    { icon: Zap,        label: 'Open Predictions',  value: openPredictions.toString(),     color: '#ec4899' },
    {
      icon: Database,
      label: 'Treasury',
      value: treasuryBalance !== null ? `${treasuryBalance.toLocaleString()} CLASH` : '…',
      color: '#00D4AA',
      onChain: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-dark p-3 rounded-xl border border-dark-border relative overflow-hidden group"
            style={(item as any).onChain ? { borderColor: '#00D4AA30' } : undefined}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
              style={{ background: `radial-gradient(ellipse at center, ${item.color}, transparent 70%)` }}
            />
            <div className="relative flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4" style={{ color: item.color }} />
              <span className="text-[10px] text-gray-400 uppercase tracking-wider">{item.label}</span>
              {item.pulse && (
                <span className="ml-auto flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full opacity-75" style={{ background: item.color }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: item.color }} />
                </span>
              )}
              {(item as any).onChain && (
                <span className="ml-auto text-[9px] font-bold px-1 py-0.5 rounded"
                  style={{ color: '#00D4AA', background: '#00D4AA15', border: '1px solid #00D4AA30' }}>
                  ⛓ live
                </span>
              )}
            </div>
            <div className="text-xl font-bold text-white tabular-nums">{item.value}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
