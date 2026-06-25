'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePlayer, getRank, xpProgressInLevel, RANKS, type Rank } from '@/contexts/PlayerContext';
import { useLeaderboard } from '@/contexts/LeaderboardContext';
import { useMyAgent } from '@/hooks/useMyAgent';
import { useAgentProfile } from '@/hooks/useAgentContract';
import { AGENT_STRATEGIES } from '@/lib/agent-config';
import {
  AVATAR_PRESETS,
  AVATAR_STORAGE_KEY,
  avatarUrl,
  getAvatarById,
} from '@/lib/profileAvatars';

interface UserProfileProps {
  userAddress?: string;
}

const RANK_FA: Record<string, string> = {
  rookie: 'fa-seedling',
  scout: 'fa-binoculars',
  analyst: 'fa-chart-line',
  trader: 'fa-briefcase',
  strategist: 'fa-bullseye',
  oracle: 'fa-gem',
  legend: 'fa-crown',
};

const TIER_COLORS: Record<string, { border: string; bg: string; text: string; label: string }> = {
  bronze:   { border: '#cd7f32', bg: 'rgba(205,127,50,0.10)',  text: '#cd7f32', label: 'Bronze' },
  silver:   { border: '#94a3b8', bg: 'rgba(148,163,184,0.10)', text: '#94a3b8', label: 'Silver' },
  gold:     { border: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  text: '#fbbf24', label: 'Gold' },
  platinum: { border: '#a78bfa', bg: 'rgba(167,139,250,0.10)', text: '#a78bfa', label: 'Platinum' },
};

function formatWalletAddress(address: string): string {
  const normalized = address.trim();
  if (normalized.length <= 9) return normalized;
  return `${normalized.slice(0, 6)}.....${normalized.slice(-3)}`;
}

export function UserProfile({ userAddress }: UserProfileProps) {
  const { stats } = usePlayer();
  const { yourRank, allTime } = useLeaderboard();
  const { tokenId, registered, isLoading: isAgentLoading, canCreate } = useMyAgent();
  const { profile: agentProfile, isLoading: isProfileLoading } = useAgentProfile(
    tokenId > 0 ? BigInt(tokenId) : undefined,
  );
  const rank = useMemo(() => getRank(stats.level), [stats.level]);
  const { current, needed, pct } = xpProgressInLevel(stats.xp);
  const totalResolved = stats.wins + stats.losses + stats.ties;
  const winRate = totalResolved > 0 ? (stats.wins / totalResolved) * 100 : 0;
  const nextLevel = stats.level + 1;
  const netProfit = stats.totalWon - stats.totalStaked;

  const [savedAvatarId, setSavedAvatarId] = useState('cyber');
  const [pendingAvatarId, setPendingAvatarId] = useState('cyber');
  const [avatarOpen, setAvatarOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AVATAR_STORAGE_KEY);
      if (stored && AVATAR_PRESETS.some(p => p.id === stored)) {
        setSavedAvatarId(stored);
        setPendingAvatarId(stored);
      }
    } catch { /* ignore */ }
  }, []);

  const savedAvatar = getAvatarById(savedAvatarId);

  const formattedAddress = userAddress ? formatWalletAddress(userAddress) : null;

  const displayName = formattedAddress ?? savedAvatar.name;
  const shortAddr = formattedAddress ?? 'Connect wallet';

  const globalRank = yourRank.allTime;
  const globalRankLabel = globalRank > 0 ? `#${globalRank} Global` : 'Unranked';

  const achievements = Object.values(stats.achievements);
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const ach3Pct = achievements.length > 0 ? (unlockedCount / achievements.length) * 100 : 0;

  const rankIdx = RANKS.findIndex(r => r.id === rank.id);
  const nextRank: Rank | null = rankIdx < RANKS.length - 1 ? RANKS[rankIdx + 1] : null;
  const rankProgress = nextRank
    ? Math.min(100, ((stats.level - rank.minLevel) / (nextRank.minLevel - rank.minLevel)) * 100)
    : 100;

  const myAgents = useMemo(
    () => allTime.filter(e => e.isAI).slice(0, 3),
    [allTime],
  );

  const agentStrategyId = registered?.strategy || 'momentum';
  const agentStrategy = AGENT_STRATEGIES.find(s => s.id === agentStrategyId) ?? AGENT_STRATEGIES[0];
  const agentName = registered?.name || agentProfile?.name || (tokenId > 0 ? `Agent #${tokenId}` : null);
  const agentDecisions = agentProfile ? Number(agentProfile.totalDecisions) : 0;
  const agentCorrect = agentProfile ? Number(agentProfile.correctDecisions) : 0;
  const agentWinRate = agentDecisions > 0 ? Math.round((agentCorrect / agentDecisions) * 100) : 0;
  const hasMintedAgent = tokenId > 0;
  const EXPLORER = 'https://sepolia.mantlescan.xyz';
  const AGENT_NFT = '0xEEc82Ecd81d889D7f1681741cfC1Fc1B7eC4B837';

  const handleSaveAvatar = () => {
    if (pendingAvatarId === savedAvatarId) return;
    setSavedAvatarId(pendingAvatarId);
    try { localStorage.setItem(AVATAR_STORAGE_KEY, pendingAvatarId); } catch { /* ignore */ }
  };

  return (
    <div className="prof-wrap">
      {/* ── Profile Hero ── */}
      <div className="prof-hero">
        <div className="hud-shell prof-hero-inner">
          <div className="prof-av-wrap">
            <div className="prof-av">
              <img src={avatarUrl(savedAvatar)} alt={savedAvatar.name} />
            </div>
            <button
              type="button"
              className="prof-av-edit"
              title="Change avatar"
              onClick={() => setAvatarOpen(v => !v)}
            >
              <i className="fa-solid fa-pen" />
            </button>
          </div>

          <div className="prof-hero-main">
            <div className="prof-name">{displayName}</div>
            <div className="prof-addr">
              <span>{shortAddr}</span>
              {userAddress && (
                <a
                  href={`https://sepolia.mantlescan.xyz/address/${userAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square" />
                  Explorer
                </a>
              )}
            </div>
            <div className="prof-badges">
              <span className="prof-badge rank">
                <i className="fa-solid fa-crown" />
                {rank.name}
              </span>
              <span className="prof-badge lvl">
                <i className="fa-solid fa-star" />
                LVL {stats.level}
              </span>
              <span className="prof-badge rank">
                <i className="fa-solid fa-hashtag" />
                {globalRankLabel}
              </span>
              <span className="prof-badge net">
                <i className="fa-solid fa-link" />
                Mantle Sepolia
              </span>
            </div>
            <div className="prof-xp">
              <div className="prof-xp-labels">
                <span>{current} / {needed} XP → LVL {nextLevel}</span>
                <span>{Math.round(pct)}%</span>
              </div>
              <div className="prof-xp-track">
                <div className="prof-xp-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>

          <div className="prof-streak-box">
            <div className="prof-streak-val">
              {stats.currentStreak}{' '}
              <i className="fa-solid fa-fire" style={{ fontSize: 14, color: 'var(--hud-gold)' }} />
            </div>
            <div className="prof-streak-lbl">Win Streak</div>
            <div className="prof-streak-best">Best: {stats.bestStreak}</div>
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="hud-shell prof-body">

        {/* Avatar picker */}
        <div className="prof-av-section">
          <button
            type="button"
            className={`prof-av-hd${avatarOpen ? ' open' : ''}`}
            onClick={() => setAvatarOpen(v => !v)}
            aria-expanded={avatarOpen}
          >
            <span className="prof-av-hd-icon">
              <i className="fa-solid fa-image" />
            </span>
            <span className="prof-av-hd-text">
              <span className="prof-av-hd-title">Choose Avatar</span>
              <span className="prof-av-hd-sub">{avatarOpen ? 'Hide presets' : 'Click to change your avatar'}</span>
            </span>
            <span className="prof-av-hd-meta">
              Current: <em>{savedAvatar.name}</em>
            </span>
            <i className={`fa-solid fa-chevron-down prof-av-chevron${avatarOpen ? ' open' : ''}`} />
          </button>
          {!avatarOpen ? null : (
            <div className="prof-av-body">
              <div className="prof-av-grid">
                {AVATAR_PRESETS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    className={`prof-av-opt${pendingAvatarId === p.id ? ' sel' : ''}`}
                    title={p.name}
                    onClick={() => setPendingAvatarId(p.id)}
                  >
                    <img src={avatarUrl(p)} alt={p.name} />
                  </button>
                ))}
              </div>
              <div className="prof-av-actions">
                <button
                  type="button"
                  className="hud-btn prof-save-btn"
                  disabled={pendingAvatarId === savedAvatarId}
                  onClick={handleSaveAvatar}
                >
                  Save Avatar
                </button>
                <span className="prof-av-hint">DiceBear presets · stored locally</span>
              </div>
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="prof-stats-grid">
          <div className="prof-stat-card">
            <i className="fa-solid fa-bullseye prof-sc-icon cyan" />
            <div className="prof-sc-label">Predictions</div>
            <div className="prof-sc-val cyan">{(stats.totalPredictions + agentDecisions).toLocaleString()}</div>
            <div className="prof-sc-sub">{stats.totalPredictions > 0 ? `${stats.totalPredictions} arena + ${agentDecisions} agent` : agentDecisions > 0 ? 'Agent on-chain decisions' : 'Total rounds played'}</div>
          </div>
          <div className="prof-stat-card">
            <i className="fa-solid fa-trophy prof-sc-icon green" />
            <div className="prof-sc-label">Wins</div>
            <div className="prof-sc-val green">{(stats.wins + agentCorrect).toLocaleString()}</div>
            <div className="prof-sc-sub">{totalResolved + agentDecisions > 0 ? `${(((stats.wins + agentCorrect) / Math.max(1, totalResolved + agentDecisions)) * 100).toFixed(1)}% win rate` : '0.0% win rate'}</div>
          </div>
          <div className="prof-stat-card">
            <i className="fa-solid fa-percent prof-sc-icon purple" />
            <div className="prof-sc-label">Win Rate</div>
            <div className="prof-sc-val purple">{totalResolved + agentDecisions > 0 ? `${(((stats.wins + agentCorrect) / Math.max(1, totalResolved + agentDecisions)) * 100).toFixed(0)}%` : '0%'}</div>
            <div className="prof-sc-sub">{((stats.wins + agentCorrect) / Math.max(1, totalResolved + agentDecisions)) * 100 >= 51 ? 'Above avg (51%)' : 'Below avg (51%)'}</div>
          </div>
          <div className="prof-stat-card">
            <i className="fa-solid fa-coins prof-sc-icon gold" />
            <div className="prof-sc-label">Total Won</div>
            <div className="prof-sc-val gold">{stats.totalWon.toFixed(0)}</div>
            <div className="prof-sc-sub">CLASH tokens</div>
          </div>
        </div>

        {/* Performance + Achievements */}
        <div className="prof-two-col">
          <div className="hud-section-panel">
            <div className="prof-sec-hd">
              <i className="fa-solid fa-chart-bar" style={{ color: 'var(--hud-cyan)' }} />
              Performance
            </div>
            <div className="prof-perf-row"><span className="k">Wins</span><span className="v green">{stats.wins}</span></div>
            <div className="prof-perf-row"><span className="k">Losses</span><span className="v red">{stats.losses}</span></div>
            <div className="prof-perf-row"><span className="k">Ties</span><span className="v">{stats.ties}</span></div>
            <div className="prof-perf-row"><span className="k">Best streak</span><span className="v gold">{stats.bestStreak}</span></div>
            <div className="prof-perf-row"><span className="k">Total staked</span><span className="v">{stats.totalStaked.toFixed(0)}</span></div>
            <div className="prof-perf-row">
              <span className="k">Net profit</span>
              <span className={`v ${netProfit >= 0 ? 'green' : 'red'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(0)}
              </span>
            </div>
            <div className="prof-perf-row"><span className="k">Total XP</span><span className="v cyan">{stats.xp.toLocaleString()}</span></div>
          </div>

          <div className="hud-section-panel">
            <div className="prof-sec-hd">
              <i className="fa-solid fa-medal" style={{ color: 'var(--hud-gold)' }} />
              Achievements
              <span className="prof-ach-count">{unlockedCount} / {achievements.length}</span>
            </div>

            {/* Progress bar */}
            <div className="prof-ach-progress">
              <div className="prof-ach-progress-track">
                <div className="prof-ach-progress-fill" style={{ width: `${ach3Pct}%` }} />
              </div>
              <span className="prof-ach-progress-label">{Math.round(ach3Pct)}% unlocked</span>
            </div>

            <div className="prof-ach-grid">
              {achievements.map(a => {
                const tier = TIER_COLORS[a.type] ?? TIER_COLORS.bronze;
                return (
                  <div
                    key={a.id}
                    className={`prof-ach-item${a.unlocked ? ' on' : ''}`}
                    style={a.unlocked ? {
                      borderColor: tier.border,
                      background: tier.bg,
                      '--ach-glow': tier.border,
                    } as React.CSSProperties : undefined}
                  >
                    <div className="prof-ach-icon-wrap">
                      <span className="prof-ach-emoji">{a.unlocked ? a.icon : '🔒'}</span>
                      {a.unlocked && (
                        <span className="prof-ach-tier" style={{ color: tier.text, borderColor: `${tier.border}66` }}>
                          {tier.label}
                        </span>
                      )}
                    </div>
                    <div className="prof-ach-info">
                      <div className="prof-ach-title" style={a.unlocked ? { color: tier.text } : undefined}>
                        {a.title}
                      </div>
                      <div className="prof-ach-desc">{a.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Ranks */}
        <div className="hud-section-panel">
          <div className="prof-sec-hd">
            <i className="fa-solid fa-arrow-trend-up" style={{ color: 'var(--hud-purple)' }} />
            Ranks Overview
            {nextRank && (
              <span className="prof-ach-count">
                Next: {nextRank.name} (Lvl {nextRank.minLevel})
              </span>
            )}
          </div>

          {/* Current rank + progress to next */}
          <div className="prof-rank-current-bar">
            <div className="prof-rank-cur-label">
              <i className={`fa-solid ${RANK_FA[rank.id] ?? 'fa-star'}`} style={{ color: rank.color }} />
              <span style={{ color: rank.color }}>{rank.name}</span>
              <span className="prof-rank-cur-lvl">LVL {stats.level}</span>
            </div>
            {nextRank ? (
              <div className="prof-rank-progress-row">
                <div className="prof-rank-progress-track">
                  <div
                    className="prof-rank-progress-fill"
                    style={{ width: `${rankProgress}%`, background: rank.color }}
                  />
                </div>
                <span className="prof-rank-progress-pct">{Math.round(rankProgress)}%</span>
              </div>
            ) : (
              <div className="prof-rank-max-label">MAX RANK ACHIEVED</div>
            )}
          </div>

          {/* Rank progression timeline */}
          <div className="prof-rank-timeline">
            {RANKS.map((r, i) => {
              const achieved = stats.level >= r.minLevel;
              const isCurrent = r.id === rank.id;
              const isLast = i === RANKS.length - 1;
              return (
                <div key={r.id} className="prof-rank-tl-item">
                  <div className={`prof-rank-tl-node${achieved ? ' on' : ''}${isCurrent ? ' cur' : ''}`}>
                    <div
                      className="prof-rank-tl-circle"
                      style={{
                        borderColor: achieved ? r.color : undefined,
                        background: isCurrent ? `${r.color}30` : achieved ? `${r.color}18` : undefined,
                        boxShadow: isCurrent ? `0 0 12px ${r.color}66, 0 0 24px ${r.color}22` : undefined,
                      }}
                    >
                      <i
                        className={`fa-solid ${RANK_FA[r.id] ?? 'fa-star'}`}
                        style={{ color: achieved ? r.color : undefined }}
                      />
                    </div>
                    {!isLast && (
                      <div
                        className="prof-rank-tl-connector"
                        style={{ background: achieved && stats.level >= (RANKS[i + 1]?.minLevel ?? 999) ? r.color : undefined }}
                      />
                    )}
                  </div>
                  <div className="prof-rank-tl-info">
                    <div
                      className="prof-rank-tl-name"
                      style={{ color: achieved ? r.color : undefined }}
                    >
                      {r.name}
                      {isCurrent && <span className="prof-rank-tl-badge">CURRENT</span>}
                    </div>
                    <div className="prof-rank-tl-lvl">Level {r.minLevel}+</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Your Agent NFT */}
        <div className="hud-section-panel">
          <div className="prof-sec-hd">
            <i className="fa-solid fa-robot" style={{ color: 'var(--hud-gold)' }} />
            Your Agent NFT
            {hasMintedAgent && (
              <span className="prof-ach-count" style={{ color: 'var(--hud-green)' }}>Minted</span>
            )}
          </div>

          {isAgentLoading || (hasMintedAgent && isProfileLoading) ? (
            <div className="prof-agent-loading">
              <i className="fa-solid fa-circle-notch fa-spin" />
              Loading your agent…
            </div>
          ) : hasMintedAgent ? (
            <div className="prof-my-agent-card" style={{ borderColor: `${agentStrategy.color}55` }}>
              <div className="prof-my-agent-top">
                <div
                  className="prof-my-agent-icon"
                  style={{ background: `${agentStrategy.color}22`, color: agentStrategy.color }}
                >
                  <i className="fa-solid fa-robot" />
                </div>
                <div className="prof-my-agent-info">
                  <div className="prof-my-agent-name">{agentName}</div>
                  <div className="prof-my-agent-meta">
                    NFT #{tokenId} · {agentStrategy.name} · v{registered?.version || agentProfile?.version?.toString() || '1.0.0'}
                  </div>
                </div>
                <span className="prof-my-agent-badge">ERC-8004</span>
              </div>

              <div className="prof-agent-stats" style={{ marginTop: 10 }}>
                <div>
                  <span className="k">On-chain decisions</span>
                  <div className="v cyan">{agentDecisions}</div>
                </div>
                <div>
                  <span className="k">Win rate</span>
                  <div className="v green">{agentDecisions > 0 ? `${agentWinRate}%` : '—'}</div>
                </div>
              </div>

              <div className="prof-agent-explainer">
                <i className="fa-solid fa-circle-info" />
                <div>
                  <strong>Your wallet controls this agent.</strong> The NFT is an on-chain identity — it has no private key.
                  You sign transactions: record AI decisions, enter duels, and build a verifiable track record on Mantle.
                </div>
              </div>

              <div className="prof-my-agent-actions">
                <Link href="/agent-lab" className="hud-btn hud-btn-cyan" style={{ fontSize: 12 }}>
                  <i className="fa-solid fa-brain" /> Record Decision
                </Link>
                <Link href={`/duel?agent=${tokenId}`} className="hud-btn hud-btn-red" style={{ fontSize: 12 }}>
                  <i className="fa-solid fa-bolt" /> Duel
                </Link>
                <a
                  href={`${EXPLORER}/token/${AGENT_NFT}?a=${tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hud-btn hud-btn-ghost"
                  style={{ fontSize: 12 }}
                >
                  <i className="fa-solid fa-arrow-up-right-from-square" /> MantleScan
                </a>
              </div>
            </div>
          ) : userAddress ? (
            <div className="prof-no-agent">
              <i className="fa-solid fa-wand-magic-sparkles" />
              <div>
                <div className="prof-no-agent-title">No agent minted yet</div>
                <div className="prof-no-agent-sub">
                  Create one ERC-8004 Agent NFT to record AI decisions on-chain and challenge bots in Duels.
                </div>
              </div>
              <Link href="/create-agent" className="hud-btn hud-btn-gold">
                <i className="fa-solid fa-plus" /> Create Agent
              </Link>
            </div>
          ) : (
            <div className="prof-no-agent">
              <i className="fa-solid fa-wallet" />
              <div className="prof-no-agent-sub">Connect wallet to see your minted agent.</div>
            </div>
          )}
        </div>

        {/* Arena AI competitors (system bots — not user-owned) */}
        <div className="hud-section-panel">
          <div className="prof-sec-hd">
            <i className="fa-solid fa-users" style={{ color: 'var(--hud-purple)' }} />
            Arena Competitors
            <span className="prof-ach-count">System bots</span>
          </div>
          <p className="prof-arena-note">
            These are protocol AI bots in Arena rounds — not your wallet&apos;s agents. Beat them to earn bonus XP.
          </p>
          <div className="prof-agents-grid">
            {myAgents.map(agent => (
              <div key={agent.id} className="prof-agent-card">
                <div className="prof-agent-name">{agent.name.replace('🤖 ', '')}</div>
                <div className="prof-agent-nft">
                  {agent.tokenId ? `NFT #${String(agent.tokenId).padStart(3, '0')}` : 'System Agent'}
                </div>
                <div className="prof-agent-stats">
                  <div>
                    <span className="k">Decisions</span>
                    <div className="v cyan">{agent.predictions}</div>
                  </div>
                  <div>
                    <span className="k">Win Rate</span>
                    <div className="v green">{agent.winRate.toFixed(0)}%</div>
                  </div>
                </div>
              </div>
            ))}
            {canCreate && (
              <Link href="/create-agent" className="prof-agent-create">
                <i className="fa-solid fa-plus" />
                <div>Create Yours</div>
              </Link>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
