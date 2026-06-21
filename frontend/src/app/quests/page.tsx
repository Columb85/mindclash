'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { Navigation, View } from '@/components/layout/Navigation';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { OnlineCounter } from '@/components/ui/OnlineCounter';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { usePlayer, getRank, xpProgressInLevel } from '@/contexts/PlayerContext';
import { CLASH_TOKEN_ADDRESS, CLASH_ABI } from '@/contexts/ClashContext';
import { useClash } from '@/contexts/ClashContext';

type Tab = 'daily' | 'weekly' | 'achievements' | 'season';

interface QuestItem {
  id: string;
  title: string;
  icon: string;
  iconColor: 'cyan' | 'green' | 'purple' | 'red' | 'gold';
  progress: number;
  target: number;
  progressLabel: string;
  xp: number;
  status: 'claimable' | 'progress' | 'done';
  deadline?: string;
}

function buildDailyQuests(stats: { totalPredictions: number; wins: number; totalStaked: number }): QuestItem[] {
  const preds = Math.min(stats.totalPredictions, 3);
  const wins = Math.min(stats.wins, 2);
  const staked = Math.min(Math.round(stats.totalStaked), 50);
  return [
    { id: 'd1', title: 'Make 3 Predictions', icon: 'fa-chart-column', iconColor: 'cyan', progress: preds, target: 3, progressLabel: 'Predictions', xp: 100, status: preds >= 3 ? 'claimable' : 'progress' },
    { id: 'd2', title: 'Get 2 Correct Predictions', icon: 'fa-check', iconColor: 'green', progress: wins, target: 2, progressLabel: 'Correct', xp: 150, status: wins >= 2 ? 'claimable' : 'progress' },
    { id: 'd3', title: 'Stake 50+ CLASH in a Round', icon: 'fa-coins', iconColor: 'cyan', progress: staked, target: 50, progressLabel: 'Max Stake', xp: 80, status: staked >= 50 ? 'claimable' : 'progress' },
    { id: 'd5', title: 'Log In Today', icon: 'fa-right-to-bracket', iconColor: 'green', progress: 1, target: 1, progressLabel: 'Daily login', xp: 20, status: 'done' },
    { id: 'd6', title: 'Beat an AI Bot', icon: 'fa-robot', iconColor: 'purple', progress: Math.min(stats.wins, 1), target: 1, progressLabel: 'Bots beaten', xp: 120, status: stats.wins >= 1 ? 'claimable' : 'progress' },
  ];
}

function buildWeeklyQuests(stats: { wins: number; totalStaked: number; totalPredictions: number }): QuestItem[] {
  return [
    { id: 'w1', title: 'Win 10 Predictions This Week', icon: 'fa-arrow-trend-up', iconColor: 'purple', progress: Math.min(stats.wins, 10), target: 10, progressLabel: 'Wins', xp: 500, status: stats.wins >= 10 ? 'claimable' : 'progress' },
    { id: 'w2', title: 'Stake 500+ CLASH Total', icon: 'fa-coins', iconColor: 'purple', progress: Math.min(Math.round(stats.totalStaked), 500), target: 500, progressLabel: 'Total staked', xp: 400, status: stats.totalStaked >= 500 ? 'claimable' : 'progress' },
    { id: 'w3', title: 'Make 20 Predictions', icon: 'fa-bullseye', iconColor: 'cyan', progress: Math.min(stats.totalPredictions, 20), target: 20, progressLabel: 'Predictions', xp: 350, status: stats.totalPredictions >= 20 ? 'claimable' : 'progress' },
  ];
}

function buildAchievements(stats: { wins: number; bestStreak: number; totalStaked: number; totalPredictions: number }): QuestItem[] {
  const s = (done: boolean) => done ? 'done' as const : 'progress' as const;
  return [
    { id: 'ach1', title: 'First Correct Prediction', icon: 'fa-trophy', iconColor: 'gold', progress: Math.min(stats.wins, 1), target: 1, progressLabel: 'Wins', xp: 50, status: s(stats.wins >= 1) },
    { id: 'ach2', title: 'Make 10 Predictions', icon: 'fa-chart-column', iconColor: 'gold', progress: Math.min(stats.totalPredictions, 10), target: 10, progressLabel: 'Predictions', xp: 200, status: s(stats.totalPredictions >= 10) },
    { id: 'ach3', title: '5 Correct Calls in a Row', icon: 'fa-fire', iconColor: 'gold', progress: Math.min(stats.bestStreak, 5), target: 5, progressLabel: 'Best streak', xp: 500, status: s(stats.bestStreak >= 5) },
    { id: 'ach4', title: 'Win 25 Predictions', icon: 'fa-crown', iconColor: 'gold', progress: Math.min(stats.wins, 25), target: 25, progressLabel: 'Wins', xp: 1000, status: s(stats.wins >= 25) },
    { id: 'ach5', title: 'Stake 1000+ CLASH Total', icon: 'fa-gem', iconColor: 'gold', progress: Math.min(Math.round(stats.totalStaked), 1000), target: 1000, progressLabel: 'Total staked', xp: 250, status: s(stats.totalStaked >= 1000) },
    { id: 'ach6', title: '50 Total Predictions', icon: 'fa-link', iconColor: 'gold', progress: Math.min(stats.totalPredictions, 50), target: 50, progressLabel: 'Predictions', xp: 300, status: s(stats.totalPredictions >= 50) },
  ];
}

function buildSeasonTiers(playerLevel: number) {
  const tiers = [
    { level: 1, xp: 0 },
    { level: 3, xp: 300 },
    { level: 5, xp: 800 },
    { level: 10, xp: 2700 },
    { level: 20, xp: 13500 },
  ];
  return tiers.map(t => ({
    ...t,
    status: playerLevel >= t.level ? 'done' as const : playerLevel >= t.level - 2 ? 'active' as const : 'locked' as const,
  }));
}

function RewardFloat({ xp, anchorRef, onComplete }: { 
  xp: number; 
  anchorRef: React.RefObject<HTMLElement | null>;
  onComplete: () => void;
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [animClass, setAnimClass] = useState('');
  
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2 - 10
      });
      setAnimClass('reward-float-anim');
      
      const timer = setTimeout(() => {
        onComplete();
      }, 1800);
      
      return () => clearTimeout(timer);
    }
  }, [anchorRef, onComplete]);
  
  if (!pos) return null;
  
  return (
    <div 
      className={`reward-float xp ${animClass}`}
      style={{ left: pos.x, top: pos.y }}
    >
      +{xp} XP
    </div>
  );
}

function QuestCard({ 
  quest, 
  type, 
  onClaim 
}: { 
  quest: QuestItem; 
  type: 'daily' | 'weekly' | 'ach';
  onClaim: (id: string) => void;
}) {
  const [showFloat, setShowFloat] = useState(false);
  const [localStatus, setLocalStatus] = useState(quest.status);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const pct = Math.min(100, (quest.progress / quest.target) * 100);
  const fillColor = localStatus === 'done' || localStatus === 'claimable' 
    ? 'var(--hud-green)' 
    : type === 'ach' 
      ? 'var(--hud-gold-dim)' 
      : `var(--hud-${quest.iconColor})`;
  
  const handleClaim = () => {
    if (localStatus !== 'claimable') return;
    setShowFloat(true);
    setTimeout(() => {
      setLocalStatus('done');
      onClaim(quest.id);
    }, 450);
  };
  
  return (
    <div className={`qc qc-${type}${localStatus === 'done' ? ' done' : ''}${localStatus === 'claimable' ? ' claimable' : ''}`}>
      <div className="qc-body">
        <div className="qc-head">
          <div className={`qc-icon-wrap ${quest.iconColor}`}>
            <i className={`fa-solid ${quest.icon}`} />
          </div>
          <div className="qc-title">{quest.title}</div>
        </div>
        <div className="qc-prog-labels">
          <span>{quest.progressLabel}</span>
          <span>
            {localStatus === 'done' && type === 'ach' ? 'Completed' : 
              `${quest.progress} / ${quest.target}${quest.progressLabel.includes('CLASH') ? ' CLASH' : quest.progressLabel.includes('Time') ? 's' : ''}`
            }
          </span>
        </div>
        <div className="qc-prog-track">
          <div 
            className="qc-prog-fill" 
            style={{ 
              width: `${localStatus === 'done' ? 100 : pct}%`, 
              background: localStatus === 'done' ? 'var(--hud-green)' : fillColor 
            }} 
          />
        </div>
        <div className="qc-foot">
          <div>
            <span className="qc-xp">+{quest.xp}</span>
            <span className="qc-xp-lbl"> XP{localStatus === 'done' && type === 'ach' ? ' earned' : ''}</span>
          </div>
          <div>
            {showFloat && (
              <RewardFloat xp={quest.xp} anchorRef={buttonRef} onComplete={() => setShowFloat(false)} />
            )}
            {localStatus === 'claimable' ? (
              <button ref={buttonRef} className="btn-claim" type="button" onClick={handleClaim}>
                <span className="bonus-shimmer" />
                <span className="bonus-glow" />
                <i className="fa-solid fa-gift" />
                <span>Claim</span>
              </button>
            ) : localStatus === 'done' ? (
              <button className="btn-done">
                <i className="fa-solid fa-circle-check" /> Done
              </button>
            ) : quest.deadline ? (
              <span className={`qc-deadline${quest.progress === 0 ? ' soon' : ''}`}>
                <i className="fa-solid fa-clock" /> {quest.deadline}
              </span>
            ) : (
              <button className="btn-progress">In Progress</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function countClaimable(quests: QuestItem[]) {
  return quests.filter(q => q.status === 'claimable').length;
}

function TabBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="tab-badge" aria-label={`${count} unclaimed`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

function CatTab({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button type="button" className={`cat-tab-wrap${active ? ' a' : ''}`} onClick={onClick}>
      <span className="cat-tab">
        <i className={`fa-solid ${icon}`} /> {label}
      </span>
      <TabBadge count={count} />
    </button>
  );
}

function getDailyBonusKey() {
  const today = new Date().toISOString().split('T')[0];
  return `mindclash_daily_bonus_${today}`;
}

export default function QuestsPage() {
  const [currentView, setCurrentView] = useState<View>('lobby');
  const [tab, setTab] = useState<Tab>('daily');
  const { stats } = usePlayer();
  const { address, isConnected } = useAccount();
  const { refetchBalance } = useClash();
  
  const dailyQuests = useMemo(() => buildDailyQuests(stats), [stats]);
  const weeklyQuests = useMemo(() => buildWeeklyQuests(stats), [stats]);
  const achievements = useMemo(() => buildAchievements(stats), [stats]);
  
  const totalXp = stats.xp;
  const dailyBonusRef = useRef<HTMLButtonElement>(null);
  
  const streak = stats.currentStreak;
  const bestStreak = stats.bestStreak;
  const rank = useMemo(() => getRank(stats.level), [stats.level]);
  const levelProgress = useMemo(() => xpProgressInLevel(stats.xp), [stats.xp]);

  // ── Daily CLASH Bonus (on-chain faucet: 1000 CLASH / 24h) ──
  const { data: claimData, refetch: refetchClaim } = useReadContract({
    address: CLASH_TOKEN_ADDRESS,
    abi: CLASH_ABI,
    functionName: 'canClaimFaucet',
    args: [address as `0x${string}`],
    query: { enabled: isConnected && !!address },
  });
  const canClaimBonus = (claimData as [boolean, bigint] | undefined)?.[0] ?? false;
  const bonusCooldown = Number((claimData as [boolean, bigint] | undefined)?.[1] ?? 0);

  const { writeContract: doClaimBonus, data: bonusTxHash, isPending: isBonusPending } = useWriteContract();
  const { isLoading: isBonusConfirming, isSuccess: isBonusSuccess } = useWaitForTransactionReceipt({ hash: bonusTxHash });

  useEffect(() => { if (isBonusSuccess) { refetchClaim(); refetchBalance(); } }, [isBonusSuccess, refetchClaim, refetchBalance]);

  const isBonusBusy = isBonusPending || isBonusConfirming;
  const dailyBonusClaimed = isBonusSuccess || (!canClaimBonus && bonusCooldown > 0);

  const handleDailyBonus = useCallback(() => {
    if (!isConnected || isBonusBusy || dailyBonusClaimed) return;
    doClaimBonus({
      address: CLASH_TOKEN_ADDRESS,
      abi: CLASH_ABI,
      functionName: 'claimFaucet',
    });
  }, [isConnected, isBonusBusy, dailyBonusClaimed, doClaimBonus]);

  const bonusLabel = useMemo(() => {
    if (isBonusPending) return 'Confirm in wallet…';
    if (isBonusConfirming) return 'Confirming…';
    if (isBonusSuccess) return '+1 000 CLASH Claimed ✓';
    if (!canClaimBonus && bonusCooldown > 0) {
      const h = Math.floor(bonusCooldown / 3600);
      const m = Math.floor((bonusCooldown % 3600) / 60);
      return `Next in ${h}h ${m}m`;
    }
    return 'Claim 1 000 CLASH';
  }, [isBonusPending, isBonusConfirming, isBonusSuccess, canClaimBonus, bonusCooldown]);

  const [showBonusFloat, setShowBonusFloat] = useState(false);

  const handleQuestClaim = useCallback((_id: string) => {
    // Quest completion tracked via PlayerContext stats
  }, []);

  const unclaimedDaily = countClaimable(dailyQuests);
  const unclaimedWeekly = countClaimable(weeklyQuests);
  const unclaimedAchievements = countClaimable(achievements);
  const unclaimedSeason = 0;

  return (
    <div className="min-h-screen">
      {/* ── HUD Topbar ── */}
      <header className="hud-topbar">
        <div className="hud-topbar-inner">
          <Link href="/" className="hud-logo-text">
            <span className="logo-mind">Mind</span>
            <span className="logo-clash">Clash</span>
          </Link>
          <Navigation currentView={currentView} onViewChange={setCurrentView} activePage="quests" />
          <div className="hud-topbar-right">
            <OnlineCounter />
            <ClashBalance />
            {isConnected && !dailyBonusClaimed && canClaimBonus && (
              <button 
                ref={dailyBonusRef}
                className="btn-bonus" 
                onClick={handleDailyBonus}
                disabled={isBonusBusy}
              >
                <span className="bonus-shimmer" />
                <span className="bonus-glow" />
                {isBonusBusy ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-gift" />}
                <span>{isBonusBusy ? 'Claiming…' : 'Claim 1 000 CLASH'}</span>
              </button>
            )}
            <ModeIndicator />
            <HudConnectButton />
          </div>
        </div>
      </header>

      {/* ── Ticker bar ── */}
      <div className="hud-ticker-bar">
        <div className="hud-shell">
          <LiveTicker />
        </div>
      </div>

      {/* ── Breadcrumb ── */}
      <div className="hud-breadcrumb">
        <div className="hud-shell">
          <span className="bc-cur">
            <i className="fa-solid fa-bullseye" style={{ marginRight: 6 }} />
            Quests & Achievements
          </span>
        </div>
      </div>

      {/* ── XP Banner ── */}
      <div className="xp-banner">
        <div className="hud-shell xp-inner">
          <div className="xp-left">
            <div className="xp-title">
              <i className="fa-solid fa-star" /> Total XP Progress
            </div>
            <div className="xp-labels">
              <span>Lifetime PTS</span>
              <span>{totalXp.toLocaleString()} XP</span>
            </div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${levelProgress.pct}%` }} />
            </div>
            <div className="xp-sub">
              Complete quests and play rounds to earn XP · Level up to unlock ranks
            </div>
          </div>
          <div
            className="level-box"
            style={{
              borderColor: `${rank.color}44`,
              background: `${rank.color}14`,
            }}
          >
            <span className="level-emoji" aria-hidden>{rank.icon}</span>
            <div>
              <div className="level-val" style={{ color: rank.color }}>{stats.level}</div>
              <div className="level-lbl">
                Level · <span style={{ color: rank.color }}>{rank.name}</span>
              </div>
              <div className="level-track">
                <div
                  className="level-fill"
                  style={{ width: `${levelProgress.pct}%`, background: rank.color }}
                />
              </div>
              <div className="level-xp">
                {levelProgress.current} / {levelProgress.needed} PTS to next level
              </div>
            </div>
          </div>
          <div className="streak-box">
            <i className="fa-solid fa-fire" style={{ fontSize: 24, color: 'var(--hud-purple)' }} />
            <div>
              <div className="streak-val">{streak}</div>
              <div className="streak-lbl">Day Streak</div>
              <div className="streak-best">Best: {bestStreak} days</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <main className="hud-shell py-5">
        <div className="quests-disclaimer">
          <div className="quests-disc-icon"><i className="fa-solid fa-bullseye" /></div>
          <div className="quests-disc-content">
            <strong>Earn XP Through Quests</strong>
            <span>
              Complete daily and weekly challenges, unlock achievements, and progress your Season Pass.
              When a quest is finished, tap Claim to collect XP. Log in each day for a bonus reward and build your streak — more XP unlocks higher Season Pass tiers.
            </span>
          </div>
        </div>

        {/* Active Challenge */}
        <div className="challenge-box">
          <div className="chl-label">
            <i className="fa-solid fa-bolt" /> Active Challenge
          </div>
          <div className="chl-row">
            <div className="chl-icon-wrap">
              <i className="fa-solid fa-fire" />
            </div>
            <div className="chl-info">
              <div className="chl-name">3 Correct Calls in a Row</div>
              <div className="chl-desc">Make 3 consecutive correct predictions in any round</div>
              <div className="chl-prog">
                <div className="chl-prog-labels">
                  <span>{Math.min(streak, 3)} / 3 correct calls</span>
                  <span>{Math.min(Math.round((streak / 3) * 100), 100)}%</span>
                </div>
                <div className="chl-prog-track">
                  <div className="chl-prog-fill" style={{ width: `${Math.min((streak / 3) * 100, 100)}%` }} />
                </div>
              </div>
            </div>
            <div className="chl-reward">
              <div className="chl-xp">+500</div>
              <div className="chl-xp-lbl">XP Reward</div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="cat-tabs">
          <CatTab active={tab === 'daily'} icon="fa-calendar" label="Daily" count={unclaimedDaily} onClick={() => setTab('daily')} />
          <CatTab active={tab === 'weekly'} icon="fa-calendar-week" label="Weekly" count={unclaimedWeekly} onClick={() => setTab('weekly')} />
          <CatTab active={tab === 'achievements'} icon="fa-medal" label="Achievements" count={unclaimedAchievements} onClick={() => setTab('achievements')} />
          <CatTab active={tab === 'season'} icon="fa-ticket" label="Season Pass" count={unclaimedSeason} onClick={() => setTab('season')} />
        </div>

        {/* Tab Content */}
        {tab === 'daily' && (
          <div className="quest-grid">
            {/* Daily CLASH Bonus card */}
            <div className={`qc qc-daily${isBonusSuccess ? ' done' : canClaimBonus ? ' claimable' : ''}`}>
              <div className="qc-body">
                <div className="qc-head">
                  <div className="qc-icon-wrap gold">
                    <i className="fa-solid fa-coins" />
                  </div>
                  <div className="qc-title">Daily CLASH Bonus</div>
                </div>
                <div className="qc-prog-labels">
                  <span>On-chain faucet</span>
                  <span>{isBonusSuccess || dailyBonusClaimed ? 'Claimed today' : 'Available'}</span>
                </div>
                <div className="qc-prog-track">
                  <div className="qc-prog-fill" style={{ width: isBonusSuccess || dailyBonusClaimed ? '100%' : '0%', background: 'var(--hud-gold)' }} />
                </div>
                <div className="qc-foot">
                  <div>
                    <span className="qc-xp">+1 000</span>
                    <span className="qc-xp-lbl"> CLASH</span>
                  </div>
                  <div>
                    {canClaimBonus && !isBonusSuccess ? (
                      <button className="btn-claim" type="button" onClick={handleDailyBonus} disabled={isBonusBusy}>
                        <span className="bonus-shimmer" />
                        <span className="bonus-glow" />
                        {isBonusBusy ? <i className="fa-solid fa-circle-notch fa-spin" /> : <i className="fa-solid fa-gift" />}
                        <span>{isBonusBusy ? 'Signing…' : 'Claim'}</span>
                      </button>
                    ) : isBonusSuccess ? (
                      <button className="btn-done">
                        <i className="fa-solid fa-circle-check" /> Done
                      </button>
                    ) : (
                      <span className="qc-deadline">
                        <i className="fa-solid fa-clock" /> {bonusLabel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {dailyQuests.map(q => (
              <QuestCard key={q.id} quest={q} type="daily" onClaim={handleQuestClaim} />
            ))}
          </div>
        )}

        {tab === 'weekly' && (
          <div className="quest-grid">
            {weeklyQuests.map(q => (
              <QuestCard key={q.id} quest={q} type="weekly" onClaim={handleQuestClaim} />
            ))}
          </div>
        )}

        {tab === 'achievements' && (
          <div className="quest-grid">
            {achievements.map(q => (
              <QuestCard key={q.id} quest={q} type="ach" onClaim={handleQuestClaim} />
            ))}
          </div>
        )}

        {tab === 'season' && (() => {
          const seasonTiers = buildSeasonTiers(stats.level);
          return (
          <div className="season-pass">
            <div className="sp-head">
              <div className="sp-title">
                <i className="fa-solid fa-ticket" /> Season 1 Pass — Genesis
              </div>
              <div className="sp-sub">Ends Jul 1, 2026 · Level {stats.level} · {totalXp.toLocaleString()} XP</div>
            </div>
            <div className="sp-strip">
              {seasonTiers.map((tier, i) => (
                <div key={tier.level} style={{ display: 'contents' }}>
                  <div className="sp-tier">
                    <div className={`sp-circle ${tier.status}`}>
                      <i className={`fa-solid ${tier.status === 'done' ? 'fa-check' : tier.status === 'active' ? 'fa-star' : 'fa-lock'}`} />
                    </div>
                    <div className={`sp-tier-lbl ${tier.status}`}>
                      LVL {tier.level}{tier.status === 'active' ? ' ●' : ''}
                    </div>
                    <div className={`sp-tier-reward${tier.status !== 'done' ? ' gold' : ''}`}>
                      {tier.xp > 0 ? `${tier.xp} XP` : 'Start'}
                    </div>
                    <div className="sp-tier-xp" style={tier.status === 'done' ? { color: 'var(--hud-green)' } : undefined}>
                      {tier.status === 'done' ? '✓ Unlocked' : tier.status === 'active' ? 'Current' : `LVL ${tier.level} needed`}
                    </div>
                  </div>
                  {i < seasonTiers.length - 1 && (
                    <div 
                      className="sp-line" 
                      style={{ 
                        background: tier.status === 'done' && seasonTiers[i + 1].status !== 'locked' 
                          ? 'var(--hud-green)' 
                          : tier.status === 'done' 
                            ? 'linear-gradient(90deg, var(--hud-green), var(--hud-border))' 
                            : 'var(--hud-border)' 
                      }} 
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          );
        })()}
      </main>

      {/* ── Footer ── */}
      <footer className="hud-footer">
        <div className="hud-footer-inner">
          MindClash · Mantle Turing Test Hackathon 2026
        </div>
      </footer>
    </div>
  );
}
