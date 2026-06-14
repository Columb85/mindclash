'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLeaderboard, LeaderboardEntry } from '@/contexts/LeaderboardContext';

function PodiumCard({ entry, position, isFirst }: { entry: LeaderboardEntry; position: number; isFirst?: boolean }) {
  const colors = {
    1: { border: 'var(--hud-gold)', bg: 'rgba(251,191,36,0.08)', icon: '👑', medal: 'fa-trophy', medalColor: 'var(--hud-gold)' },
    2: { border: '#e5e7eb', bg: 'rgba(229,231,235,0.06)', icon: '⚔', medal: 'fa-medal', medalColor: '#e5e7eb' },
    3: { border: '#f97316', bg: 'rgba(249,115,22,0.06)', icon: '🔥', medal: 'fa-award', medalColor: '#f97316' },
  }[position] || { border: 'var(--hud-border)', bg: 'transparent', icon: '🏆', medal: 'fa-trophy', medalColor: 'var(--hud-text-dim)' };

  return (
    <div 
      className={`podium-card ${position === 1 ? 'gold' : position === 2 ? 'silver' : 'bronze'}${isFirst ? ' first' : ''}${entry.isYou ? ' you' : ''}`}
      style={{ borderColor: colors.border, background: `linear-gradient(135deg, ${colors.bg}, transparent)` }}
    >
      <div className="p-medal" style={{ color: colors.medalColor }}>
        <i className={`fa-solid ${colors.medal}`} />
      </div>
      <div 
        className="p-rank-icon"
        style={{ 
          background: colors.bg, 
          borderColor: colors.border, 
          color: colors.border 
        }}
      >
        {colors.icon}
      </div>
      <div className="p-name">{entry.name}</div>
      <div className="p-rank-lbl" style={{ color: entry.rankColor }}>{entry.rankName} · LVL {entry.level}</div>
      <div className="p-profit">{entry.netProfit >= 0 ? '+' : ''}{entry.netProfit.toLocaleString()}</div>
      <div className="p-profit-lbl">Net profit</div>
      <div className="p-meta">
        <span>{entry.wins}W</span>
        <span>{entry.winRate.toFixed(0)}% WR</span>
      </div>
    </div>
  );
}

function TableRow({ entry, position }: { entry: LeaderboardEntry; position: number }) {
  const avatars = ['⚡', '🎯', '🛡', '💀', '🌿', '🔮', '⭐', '🎲'];
  const avatar = avatars[(position - 4) % avatars.length];
  
  return (
    <div className={`lb-tr${entry.isYou ? ' you' : ''}`}>
      <div className="num">{position}</div>
      <div className="lb-player">
        <div 
          className="lb-pav" 
          style={{ 
            background: `${entry.rankColor}15`, 
            borderColor: entry.rankColor, 
            color: entry.rankColor 
          }}
        >
          {avatar}
        </div>
        <div>
          <div className="lb-pname">
            {entry.name}
            {entry.isYou && <span className="you-tag">YOU</span>}
          </div>
          <div className="lb-prank" style={{ color: entry.rankColor }}>
            {entry.rankName} · LVL {entry.level}
          </div>
        </div>
      </div>
      <div className="stat">{entry.wins}</div>
      <div className="stat">{entry.winRate.toFixed(1)}%</div>
      <div className="stat">{entry.volume.toLocaleString()}</div>
      <div className={`stat profit ${entry.netProfit >= 0 ? 'pos' : 'neg'}`}>
        {entry.netProfit >= 0 ? '+' : ''}{entry.netProfit.toLocaleString()}
      </div>
    </div>
  );
}

export function Leaderboard() {
  const { daily, weekly, allTime, yourRank } = useLeaderboard();
  const [tab, setTab] = useState<'daily' | 'weekly' | 'allTime'>('weekly');

  const data = tab === 'daily' ? daily : tab === 'weekly' ? weekly : allTime;
  const myRank = tab === 'daily' ? yourRank.daily : tab === 'weekly' ? yourRank.weekly : yourRank.allTime;

  const top3 = data.slice(0, 3);
  const rest = data.slice(3, 15);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="lb-page-hdr">
        <div className="lb-hdr-l">
          <div className="lb-crown"><i className="fa-solid fa-crown" /></div>
          <div>
            <h1>Leaderboard</h1>
            <p>Top predictors across the protocol</p>
          </div>
        </div>
        <div className="lb-hdr-r">
          <div className="your-rank">
            <div className="lbl">Your rank</div>
            <div className="val">{myRank > 0 ? `#${myRank}` : '—'}</div>
          </div>
          <div className="lb-tabs">
            {(['daily', 'weekly', 'allTime'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`lb-tab${tab === t ? ' a' : ''}`}
              >
                {t === 'allTime' ? 'All Time' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="lb-disclaimer">
        <div className="lb-disc-icon"><i className="fa-solid fa-ranking-star" /></div>
        <div className="lb-disc-content">
          <strong>Climb the Leaderboard</strong>
          <span>Win predictions to earn net profit. Higher profit = higher rank. Top players earn exclusive rewards and recognition. Rankings reset daily/weekly — compete in your preferred timeframe!</span>
        </div>
      </div>

      {/* Podium (2nd, 1st, 3rd order) */}
      <div className="podium">
        {top3[1] && <PodiumCard entry={top3[1]} position={2} />}
        {top3[0] && <PodiumCard entry={top3[0]} position={1} isFirst />}
        {top3[2] && <PodiumCard entry={top3[2]} position={3} />}
      </div>

      {/* Table */}
      <div className="lb-table">
        <div className="lb-th">
          <div>#</div>
          <div>Player</div>
          <div>Wins</div>
          <div>Win %</div>
          <div>Volume</div>
          <div>Net Profit</div>
        </div>
        {rest.map((entry, i) => (
          <TableRow key={entry.id} entry={entry} position={i + 4} />
        ))}
      </div>

      <div className="lb-foot">
        <i className="fa-solid fa-users" />
        Updated live · Based on net profit in selected period
      </div>
    </div>
  );
}
