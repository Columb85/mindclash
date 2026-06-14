'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Winner {
  address: string;
  amount: number;
  asset: string;
  time: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function RecentWinners() {
  const [winners, setWinners] = useState<Winner[]>([]);

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const res = await fetch(`${API_URL}/leaderboard/recent-wins`);
        const data = await res.json();
        if (data.winners) setWinners(data.winners);
      } catch {
        // Fallback mock data
        setWinners([
          { address: '0xd337...2ad74', amount: 85, asset: 'BTC', time: Date.now() - 120000 },
          { address: '0x62bc...80a59', amount: 42, asset: 'ETH', time: Date.now() - 300000 },
          { address: '0x508e...7c39', amount: 156, asset: 'SOL', time: Date.now() - 480000 },
        ]);
      }
    };

    fetchWinners();
    const interval = setInterval(fetchWinners, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="winners-feed">
      <div className="winners-hdr">
        <i className="fa-solid fa-trophy" />
        <span>Recent Winners</span>
      </div>
      <AnimatePresence mode="popLayout">
        {winners.slice(0, 5).map((w, i) => (
          <motion.div
            key={`${w.address}-${w.time}`}
            className="winner-row"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ delay: i * 0.05 }}
          >
            <span style={{ color: 'var(--hud-gold)' }}>🏆</span>
            <span className="winner-addr">{shortAddr(w.address)}</span>
            <span className="winner-asset">{w.asset}</span>
            <span className="winner-time">{timeAgo(w.time)}</span>
            <span className="winner-amount">+{w.amount} CLASH</span>
          </motion.div>
        ))}
      </AnimatePresence>
      {winners.length === 0 && (
        <div style={{ color: 'var(--hud-text-dim)', fontSize: 10, fontStyle: 'italic', padding: '8px 0' }}>
          No recent winners yet
        </div>
      )}
    </div>
  );
}
