'use client';

import { useState, useEffect } from 'react';

interface Bot {
  tokenId: number;
  name: string;
  strategy: string;
  winRate: string;
  totalDecisions: number;
  correctDecisions: number;
  color: 'blue' | 'purple' | 'green';
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.mindclash.xyz/api';

const BOTS: Omit<Bot, 'winRate' | 'totalDecisions' | 'correctDecisions'>[] = [
  { tokenId: 5, name: 'AlphaPredict', strategy: 'Momentum', color: 'blue' },
  { tokenId: 6, name: 'MomentumMaster', strategy: 'Mean-Reversion', color: 'purple' },
  { tokenId: 7, name: 'NeuralTrader', strategy: 'Neural Net', color: 'green' },
];

export function BotComparison() {
  const [bots, setBots] = useState<Bot[]>([]);

  useEffect(() => {
    const fetchBots = async () => {
      try {
        const res = await fetch(`${API_URL}/agents`);
        const data = await res.json();
        if (data.agents) {
          const merged = BOTS.map(b => {
            const agent = data.agents.find((a: any) => a.tokenId === b.tokenId);
            return {
              ...b,
              winRate: agent?.winRate || '0',
              totalDecisions: agent?.totalDecisions || 0,
              correctDecisions: agent?.correctDecisions || 0,
            };
          });
          setBots(merged);
        }
      } catch {
        setBots(BOTS.map(b => ({ ...b, winRate: '0', totalDecisions: 0, correctDecisions: 0 })));
      }
    };

    fetchBots();
    const interval = setInterval(fetchBots, 30000);
    return () => clearInterval(interval);
  }, []);

  const getWinRateClass = (rate: string) => {
    const r = parseFloat(rate);
    if (r >= 50) return 'high';
    if (r >= 35) return 'mid';
    return 'low';
  };

  return (
    <div className="bot-compare">
      <div className="bot-compare-hdr">
        <i className="fa-solid fa-robot" />
        <span>AI Bot Performance</span>
      </div>
      {bots.map(bot => (
        <div key={bot.tokenId} className="bot-row">
          <div className={`bot-icon ${bot.color}`}>
            <i className="fa-solid fa-brain" />
          </div>
          <div className="bot-info">
            <div className="bot-name">{bot.name}</div>
            <div className="bot-strat">{bot.strategy}</div>
          </div>
          <div className="bot-stats">
            <div className={`bot-winrate ${getWinRateClass(bot.winRate)}`}>
              {parseFloat(bot.winRate).toFixed(1)}%
            </div>
            <div className="bot-record">
              {bot.correctDecisions}W / {bot.totalDecisions - bot.correctDecisions}L
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
