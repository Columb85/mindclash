'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { Navigation, View } from '@/components/layout/Navigation';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { OnlineCounter } from '@/components/ui/OnlineCounter';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { usePlayer, getRank, xpProgressInLevel } from '@/contexts/PlayerContext';

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

const INITIAL_DAILY_QUESTS: QuestItem[] = [
  { id: 'd1', title: 'Make 3 Predictions', icon: 'fa-chart-column', iconColor: 'cyan', progress: 3, target: 3, progressLabel: 'Predictions', xp: 100, status: 'claimable' },
  { id: 'd2', title: 'Get 2 Correct Predictions', icon: 'fa-check', iconColor: 'green', progress: 1, target: 2, progressLabel: 'Correct', xp: 150, status: 'progress' },
  { id: 'd3', title: 'Stake 50+ CLASH in a Round', icon: 'fa-coins', iconColor: 'cyan', progress: 50, target: 50, progressLabel: 'Max Stake', xp: 80, status: 'claimable' },
  { id: 'd4', title: 'Play 1 Duel Match', icon: 'fa-khanda', iconColor: 'red', progress: 0, target: 1, progressLabel: 'Duels played', xp: 120, status: 'progress', deadline: '8h left' },
  { id: 'd5', title: 'Log In Today', icon: 'fa-right-to-bracket', iconColor: 'green', progress: 1, target: 1, progressLabel: 'Daily login', xp: 20, status: 'done' },
  { id: 'd6', title: 'Watch AI Monitor for 60s', icon: 'fa-brain', iconColor: 'purple', progress: 0, target: 60, progressLabel: 'Time watched', xp: 30, status: 'progress', deadline: '8h left' },
];

const INITIAL_WEEKLY_QUESTS: QuestItem[] = [
  { id: 'w1', title: 'Win 10 Predictions This Week', icon: 'fa-arrow-trend-up', iconColor: 'purple', progress: 7, target: 10, progressLabel: 'Wins', xp: 500, status: 'progress', deadline: '3d left' },
  { id: 'w2', title: 'Stake 500+ CLASH Total', icon: 'fa-coins', iconColor: 'purple', progress: 320, target: 500, progressLabel: 'Total staked', xp: 400, status: 'progress', deadline: '3d left' },
  { id: 'w3', title: 'Play 3 Duel Matches', icon: 'fa-khanda', iconColor: 'red', progress: 0, target: 3, progressLabel: 'Duels', xp: 350, status: 'progress', deadline: '3d left' },
];

const INITIAL_ACHIEVEMENTS: QuestItem[] = [
  { id: 'ach1', title: 'First Correct Prediction', icon: 'fa-trophy', iconColor: 'gold', progress: 1, target: 1, progressLabel: 'Status', xp: 50, status: 'done' },
  { id: 'ach2', title: 'Create Your First AI Agent', icon: 'fa-robot', iconColor: 'gold', progress: 1, target: 1, progressLabel: 'Status', xp: 200, status: 'done' },
  { id: 'ach3', title: '5 Correct Calls in a Row', icon: 'fa-fire', iconColor: 'gold', progress: 3, target: 5, progressLabel: 'Best streak', xp: 500, status: 'progress' },
  { id: 'ach4', title: 'Reach Global Top 10', icon: 'fa-crown', iconColor: 'gold', progress: 12, target: 10, progressLabel: 'Current rank', xp: 1000, status: 'progress' },
  { id: 'ach5', title: 'Stake 1000+ CLASH Total', icon: 'fa-gem', iconColor: 'gold', progress: 1000, target: 1000, progressLabel: 'Total staked', xp: 250, status: 'claimable' },
  { id: 'ach6', title: '50 On-Chain Decisions', icon: 'fa-link', iconColor: 'gold', progress: 22, target: 50, progressLabel: 'Decisions', xp: 300, status: 'progress' },
];

const SEASON_TIERS = [
  { level: 1, xp: 50, status: 'done' as const },
  { level: 2, xp: 100, status: 'done' as const },
  { level: 3, xp: 200, status: 'active' as const },
  { level: 4, xp: 350, status: 'locked' as const },
  { level: 5, xp: 500, status: 'locked' as const },
];

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
  onClaim: (id: string, xp: number) => void;
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
      onClaim(quest.id, quest.xp);
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
  
  const [dailyQuests, setDailyQuests] = useState(INITIAL_DAILY_QUESTS);
  const [weeklyQuests, setWeeklyQuests] = useState(INITIAL_WEEKLY_QUESTS);
  const [achievements, setAchievements] = useState(INITIAL_ACHIEVEMENTS);
  
  const [dailyBonusClaimed, setDailyBonusClaimed] = useState(true);
  const [showBonusFloat, setShowBonusFloat] = useState(false);
  const [totalXp, setTotalXp] = useState(240);
  const dailyBonusRef = useRef<HTMLButtonElement>(null);
  
  const streak = stats.currentStreak || 3;
  const bestStreak = stats.bestStreak || 5;
  const rank = useMemo(() => getRank(stats.level), [stats.level]);
  const levelProgress = useMemo(() => xpProgressInLevel(stats.xp), [stats.xp]);

  useEffect(() => {
    const key = getDailyBonusKey();
    const claimed = localStorage.getItem(key) === 'true';
    setDailyBonusClaimed(claimed);
  }, []);

  const handleDailyBonus = useCallback(() => {
    if (dailyBonusClaimed) return;
    setShowBonusFloat(true);
    setTimeout(() => {
      setTotalXp(prev => Math.min(prev + 150, 500));
      setDailyBonusClaimed(true);
      localStorage.setItem(getDailyBonusKey(), 'true');
    }, 450);
  }, [dailyBonusClaimed]);

  const handleQuestClaim = useCallback((id: string, xp: number) => {
    setTotalXp(prev => Math.min(prev + xp, 500));
    
    setDailyQuests(prev => prev.map(q => 
      q.id === id ? { ...q, status: 'done' as const } : q
    ));
    setWeeklyQuests(prev => prev.map(q => 
      q.id === id ? { ...q, status: 'done' as const } : q
    ));
    setAchievements(prev => prev.map(q => 
      q.id === id ? { ...q, status: 'done' as const } : q
    ));
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
            {!dailyBonusClaimed && (
              <>
                {showBonusFloat && (
                  <RewardFloat xp={150} anchorRef={dailyBonusRef} onComplete={() => setShowBonusFloat(false)} />
                )}
                <button 
                  ref={dailyBonusRef}
                  className="btn-bonus" 
                  onClick={handleDailyBonus}
                >
                  <span className="bonus-shimmer" />
                  <span className="bonus-glow" />
                  <i className="fa-solid fa-gift" />
                  <span>Claim Daily Bonus</span>
                </button>
              </>
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
              <i className="fa-solid fa-star" /> Daily XP Progress
            </div>
            <div className="xp-labels">
              <span>Progress today</span>
              <span>{totalXp} / 500 XP</span>
            </div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width: `${(totalXp / 500) * 100}%` }} />
            </div>
            <div className="xp-sub">
              Complete quests to earn XP · Resets in <span style={{ color: 'var(--hud-cyan)', fontFamily: 'var(--hud-font-mono)' }}>8h 42m</span>
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
              <i className="fa-solid fa-bullseye" />
            </div>
            <div className="chl-info">
              <div className="chl-name">3 Correct Calls in a Row</div>
              <div className="chl-desc">Make 3 consecutive correct predictions in any round</div>
              <div className="chl-prog">
                <div className="chl-prog-labels">
                  <span>1 / 3 correct calls</span>
                  <span>33%</span>
                </div>
                <div className="chl-prog-track">
                  <div className="chl-prog-fill" style={{ width: '33%' }} />
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

        {tab === 'season' && (
          <div className="season-pass">
            <div className="sp-head">
              <div className="sp-title">
                <i className="fa-solid fa-ticket" /> Season 1 Pass — Genesis
              </div>
              <div className="sp-sub">Ends Jul 1, 2026 · {totalXp} / 500 XP to next tier</div>
            </div>
            <div className="sp-strip">
              {SEASON_TIERS.map((tier, i) => (
                <div key={tier.level} style={{ display: 'contents' }}>
                  <div className="sp-tier">
                    <div className={`sp-circle ${tier.status}`}>
                      <i className={`fa-solid ${tier.status === 'done' ? 'fa-check' : tier.status === 'active' ? 'fa-star' : 'fa-lock'}`} />
                    </div>
                    <div className={`sp-tier-lbl ${tier.status}`}>
                      LVL {tier.level}{tier.status === 'active' ? ' ●' : ''}
                    </div>
                    <div className={`sp-tier-reward${tier.status !== 'done' ? ' gold' : ''}`}>
                      {tier.xp} XP
                    </div>
                    <div className="sp-tier-xp" style={tier.status === 'done' ? { color: 'var(--hud-green)' } : undefined}>
                      {tier.status === 'done' ? '✓ Claimed' : tier.status === 'active' ? 'Current' : `+${tier.xp - totalXp} XP needed`}
                    </div>
                  </div>
                  {i < SEASON_TIERS.length - 1 && (
                    <div 
                      className="sp-line" 
                      style={{ 
                        background: tier.status === 'done' && SEASON_TIERS[i + 1].status !== 'locked' 
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
        )}
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
