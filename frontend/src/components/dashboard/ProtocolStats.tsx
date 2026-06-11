'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Activity, Database, Flame } from 'lucide-react';
import { useRooms } from '@/contexts/RoomsContext';
import { useContractRead } from 'wagmi';
import { formatUnits } from 'viem';
import { CLASH_TOKEN_ADDRESS, TREASURY_ADDRESS, CLASH_ABI } from '@/contexts/ClashContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.mindclash.xyz/api';
const PROTOCOL_FEE = 0.04;

export function ProtocolStats() {
  const { rooms } = useRooms();
  const [historicFees, setHistoricFees] = useState<number | null>(null);

  // ── Fetch resolved round history to compute accumulated fees ───────────────
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/rounds/history?limit=100`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (cancelled || !json?.data) return;
        const total = (json.data as Array<{ up_pool: number; down_pool: number }>).reduce(
          (sum, row) => sum + (row.up_pool + row.down_pool) * PROTOCOL_FEE, 0
        );
        setHistoricFees(Math.round(total));
      })
      .catch(() => { /* backend unreachable — fall through to in-memory calc */ });
    return () => { cancelled = true; };
  }, []);

  // In-memory resolved rounds fee (always available, even without backend)
  const sessionFees = Math.round(
    rooms
      .filter(r => r.status === 'resolved')
      .reduce((sum, r) => sum + (r.upPool + r.downPool) * PROTOCOL_FEE, 0)
  );

  const accumulatedFees = (historicFees ?? 0) + sessionFees;

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

  const activeRounds    = rooms.filter(r => r.status === 'open' || r.status === 'live').length;
  const roundsToday     = rooms.length;
  const openPredictions = rooms.reduce((s, r) => s + r.predictions.length, 0);

  const items = [
    { icon: Activity,   label: 'Active Rounds',       value: activeRounds.toString(),  color: '#22c55e', pulse: true },
    { icon: TrendingUp, label: 'Rounds This Session', value: roundsToday.toString(),   color: '#a78bfa', demo: true },
    { icon: Zap,        label: 'Open Predictions',    value: openPredictions.toString(), color: '#ec4899' },
    {
      icon: Flame,
      label: 'Fees Collected',
      value: `${accumulatedFees.toLocaleString()} CLASH`,
      color: '#f97316',
      tooltip: `4% of each resolved round's losing pool → Treasury`,
    },
    {
      icon: Database,
      label: 'Treasury',
      value: treasuryBalance !== null ? `${treasuryBalance.toLocaleString()} CLASH` : '…',
      color: '#00D4AA',
      onChain: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            title={(item as any).tooltip ?? undefined}
            className="glass-dark p-3 rounded-xl border border-dark-border relative overflow-hidden group cursor-default"
            style={(item as any).onChain ? { borderColor: '#00D4AA30' } : undefined}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
              style={{ background: `radial-gradient(ellipse at center, ${item.color}, transparent 70%)` }}
            />
            <div className="relative flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4" style={{ color: item.color }} />
              <span className="text-[10px] text-gray-400 uppercase tracking-wider truncate">{item.label}</span>
              {item.pulse && (
                <span className="ml-auto flex w-1.5 h-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full opacity-75" style={{ background: item.color }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: item.color }} />
                </span>
              )}
              {(item as any).onChain && (
                <span className="ml-auto shrink-0 text-[9px] font-bold px-1 py-0.5 rounded"
                  style={{ color: '#00D4AA', background: '#00D4AA15', border: '1px solid #00D4AA30' }}>
                  ⛓ live
                </span>
              )}
              {(item as any).demo && (
                <span className="ml-auto shrink-0 text-[9px] font-bold px-1 py-0.5 rounded"
                  style={{ color: '#f59e0b', background: '#f59e0b15', border: '1px solid #f59e0b30' }}>
                  demo
                </span>
              )}
            </div>
            <div className="text-xl font-bold text-white tabular-nums truncate">{item.value}</div>
          </motion.div>
        );
      })}
    </div>
  );
}
