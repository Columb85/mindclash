'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRooms } from '@/contexts/RoomsContext';
import { useReadContract } from 'wagmi';
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
  const { data: treasuryRaw } = useReadContract({
    address: CLASH_TOKEN_ADDRESS,
    abi: CLASH_ABI,
    functionName: 'balanceOf',
    args: [TREASURY_ADDRESS],
    query: {
      staleTime: 60_000,
      gcTime: 120_000,
    },
  });
  const treasuryBalance = treasuryRaw !== undefined
    ? Math.floor(Number(formatUnits(treasuryRaw as bigint, 18)))
    : null;

  const activeRounds    = rooms.filter(r => r.status === 'open' || r.status === 'live').length;
  const roundsToday     = rooms.length;
  const openPredictions = rooms.reduce((s, r) => s + r.predictions.length, 0);

  const items = [
    {
      faIcon: 'fa-solid fa-signal', label: 'Active Rounds',
      num: activeRounds.toString(), suffix: null,
      color: 'var(--hud-green)', pulse: true,
    },
    {
      faIcon: 'fa-solid fa-chart-line', label: 'Rounds This Session',
      num: roundsToday.toString(), suffix: null,
      color: '#a78bfa', demo: true,
    },
    {
      faIcon: 'fa-solid fa-bolt', label: 'Open Predictions',
      num: openPredictions.toString(), suffix: null,
      color: '#ec4899',
    },
    {
      faIcon: 'fa-solid fa-fire', label: 'Fees Collected',
      num: accumulatedFees.toLocaleString(), suffix: 'CLASH',
      color: 'var(--hud-gold)',
    },
    {
      faIcon: 'fa-solid fa-database', label: 'Treasury',
      num: treasuryBalance !== null ? treasuryBalance.toLocaleString() : '…', suffix: treasuryBalance !== null ? 'CLASH' : null,
      color: '#00D4AA', onChain: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="hud-stat-card"
          style={{
            clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)',
            ['--stat-color' as string]: item.color,
            ...(item.onChain ? { borderColor: 'rgba(0,212,170,.25)' } : {}),
          }}
        >
          <div className="hud-stat-label">
            <i className={item.faIcon} style={{ color: item.color, fontSize: 13 }} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.pulse && (
              <span className="live-dot" style={{ width: 5, height: 5, marginLeft: 'auto', background: item.color, boxShadow: `0 0 5px ${item.color}` }} />
            )}
            {item.onChain && (
              <span className="hud-badge hud-badge-cyan" style={{ clipPath: 'polygon(2px 0,100% 0,calc(100% - 2px) 100%,0 100%)', marginLeft: 'auto', color: '#00D4AA', borderColor: 'rgba(0,212,170,.3)', background: 'rgba(0,212,170,.08)' }}>⛓ live</span>
            )}
            {item.demo && (
              <span className="hud-badge hud-badge-gold" style={{ clipPath: 'polygon(2px 0,100% 0,calc(100% - 2px) 100%,0 100%)', marginLeft: 'auto' }}>demo</span>
            )}
          </div>
          <div className="hud-stat-value" style={{ color: '#fff', fontSize: item.suffix ? 14 : 18 }}>
            {item.num}
            {item.suffix && (
              <span style={{ fontFamily: 'var(--hud-font-mono)', fontSize: 10, color: 'var(--hud-text-3)', marginLeft: 4 }}>
                {item.suffix}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
