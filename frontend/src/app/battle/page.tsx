'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { HudConnectButton } from '@/components/ui/HudConnectButton';
import { Navigation, View } from '@/components/layout/Navigation';
import { LiveTicker } from '@/components/dashboard/ActivityFeed';
import { ModeIndicator } from '@/components/ui/ModeIndicator';
import { ClashBalance } from '@/components/ui/ClashBalance';
import { OnlineCounter } from '@/components/ui/OnlineCounter';
import { HowItWorks } from '@/components/ui/HowItWorks';
import { usePlayer } from '@/contexts/PlayerContext';

const ASSETS = ['BTC', 'ETH', 'SOL', 'MNT'] as const;
type Asset = typeof ASSETS[number];

const CRYPTO_LOGOS: Record<Asset, string> = {
  BTC: '/crypto/btc.png',
  ETH: '/crypto/eth.png',
  SOL: '/crypto/sol.png',
  MNT: '/crypto/mnt.svg',
};

const STAKE_OPTIONS = [50, 100, 200, 500];

interface AgentSignal {
  tokenId: number;
  name: string;
  version: string;
  strategy: string;
  avatar: string;
  gradient: string;
  direction: 'UP' | 'DOWN';
  confidence: number;
  winRate: number;
  decisions: number;
  lastUpdate: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  type: 'ai' | 'human';
  winRate: number;
  pnl: number;
}

const SYSTEM_AGENTS: AgentSignal[] = [
  { tokenId: 5, name: 'AlphaPredict', version: 'v2.1.0', strategy: 'Momentum', avatar: '🤖', gradient: 'linear-gradient(135deg,#3b82f6,var(--hud-cyan))', direction: 'UP', confidence: 87, winRate: 51.3, decisions: 729, lastUpdate: 12 },
  { tokenId: 6, name: 'MomentumMaster', version: 'v1.8.2', strategy: 'Mean Rev.', avatar: '⚡', gradient: 'linear-gradient(135deg,#a855f7,#ec4899)', direction: 'DOWN', confidence: 63, winRate: 49.8, decisions: 612, lastUpdate: 28 },
  { tokenId: 7, name: 'NeuralTrader', version: 'v3.0.1', strategy: 'Neural Net', avatar: '🧠', gradient: 'linear-gradient(135deg,#22c55e,#14b8a6)', direction: 'UP', confidence: 71, winRate: 56.7, decisions: 660, lastUpdate: 45 },
];

export default function BattlePage() {
  const { address, isConnected } = useAccount();
  const { stats } = usePlayer();
  const [currentView, setCurrentView] = useState<View>('lobby');
  
  const [asset, setAsset] = useState<Asset>('BTC');
  const [stake, setStake] = useState(100);
  const [direction, setDirection] = useState<'UP' | 'DOWN'>('UP');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [prices, setPrices] = useState<Record<Asset, { price: number; change: number }>>({
    BTC: { price: 62818.70, change: 1.96 },
    ETH: { price: 1657.51, change: 1.31 },
    SOL: { price: 65.16, change: 1.70 },
    MNT: { price: 0.5371, change: 0.30 },
  });
  
  const [agents, setAgents] = useState<AgentSignal[]>(SYSTEM_AGENTS);
  const [battleStats] = useState({ humans: 847, aiAgents: 3, prizePool: 12400 });
  
  const [aiLeaderboard] = useState<LeaderboardEntry[]>([
    { rank: 1, name: 'NeuralTrader', type: 'ai', winRate: 56.7, pnl: -442 },
    { rank: 2, name: 'AlphaPredict', type: 'ai', winRate: 51.3, pnl: -842 },
    { rank: 3, name: 'MomentumMaster', type: 'ai', winRate: 49.8, pnl: -1104 },
  ]);
  
  const [humanLeaderboard] = useState<LeaderboardEntry[]>([
    { rank: 1, name: '0xDiamondHands', type: 'human', winRate: 62.1, pnl: 2840 },
    { rank: 2, name: 'CryptoRacer', type: 'human', winRate: 59.4, pnl: 1920 },
    { rank: 3, name: 'NightBull_99', type: 'human', winRate: 57.8, pnl: 1440 },
  ]);

  // Fetch live prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices');
        const json = await res.json();
        if (json.success && json.data) {
          const newPrices: Record<Asset, { price: number; change: number }> = {} as any;
          for (const sym of ASSETS) {
            if (json.data[sym]) {
              newPrices[sym] = {
                price: json.data[sym].price,
                change: json.data[sym].change24h,
              };
            }
          }
          setPrices(prev => ({ ...prev, ...newPrices }));
        }
      } catch {
        // price fetch failed silently
      }
    };
    
    fetchPrices();
    const interval = setInterval(fetchPrices, 5000);
    return () => clearInterval(interval);
  }, []);

  // Simulate agent updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents(prev => prev.map(agent => ({
        ...agent,
        lastUpdate: agent.lastUpdate + 1,
        direction: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'UP' : 'DOWN') : agent.direction,
        confidence: Math.min(95, Math.max(50, agent.confidence + (Math.random() - 0.5) * 5)),
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isConnected) return;
    
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 800));
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 1500);
  }, [isConnected]);

  const [showComingSoon, setShowComingSoon] = useState(true);

  const currentPrice = prices[asset];
  const userWinRate = stats ? ((stats.wins / Math.max(1, stats.wins + stats.losses)) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen">
      {/* ── HUD Topbar ────────────────────────────────────────────────────── */}
      <header className="hud-topbar">
        <div className="hud-topbar-inner">
          <Link href="/" className="hud-logo-text">
            <span className="logo-mind">Mind</span>
            <span className="logo-clash">Clash</span>
          </Link>
          <Navigation currentView={currentView} onViewChange={setCurrentView} activePage="battle" />
          <div className="hud-topbar-right">
            <OnlineCounter />
            <ClashBalance />
            <ModeIndicator />
            <HudConnectButton />
          </div>
        </div>
      </header>

      {/* ── Ticker bar ────────────────────────────────────────────────────── */}
      <div className="hud-ticker-bar">
        <div className="hud-shell">
          <LiveTicker />
        </div>
      </div>

      {/* ── Breadcrumb ────────────────────────────────────────────────────── */}
      <div className="hud-breadcrumb">
        <div className="hud-shell">
          <span className="bc-cur">
            <i className="fa-solid fa-khanda" style={{ marginRight: 6 }} />
            Human vs AI Battle
          </span>
        </div>
      </div>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="hud-shell py-5">
        {/* Battle Header */}
        <div className="battle-hdr">
          <div className="bh-top">
            <div className="bh-title">
              <div className="bh-icon"><i className="fa-solid fa-users" /></div>
              <div>
                <h1>Human vs AI</h1>
                <p>Turing Test Competition</p>
              </div>
              <span className="badge-battle"><i className="fa-solid fa-khanda" /> LIVE BATTLE</span>
            </div>
            <button 
              className="btn-lb"
              onClick={() => document.getElementById('lbSection')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <i className="fa-solid fa-trophy" /> Leaderboard
            </button>
          </div>
          
          <div className="battle-stats">
            <div className="bstat">
              <div className="bstat-hdr blue"><i className="fa-solid fa-users" /> Human Players</div>
              <div className="bstat-val">{battleStats.humans.toLocaleString()}</div>
              <div className="bstat-sub">Active participants</div>
            </div>
            <div className="bstat">
              <div className="bstat-hdr green"><i className="fa-solid fa-robot" /> AI Agents</div>
              <div className="bstat-val">{battleStats.aiAgents}</div>
              <div className="bstat-sub">Competing algorithms</div>
            </div>
            <div className="bstat">
              <div className="bstat-hdr gold"><i className="fa-solid fa-dollar-sign" /> Prize Pool</div>
              <div className="bstat-val">${battleStats.prizePool.toLocaleString()}</div>
              <div className="bstat-sub">Total rewards</div>
            </div>
          </div>
        </div>

        {/* How It Works Disclaimer */}
        <div className="battle-disclaimer">
          <div className="disclaimer-hdr">
            <i className="fa-solid fa-circle-info" />
            <span>How Human vs AI Battle Works</span>
          </div>
          <div className="disclaimer-steps">
            <div className="disclaimer-step">
              <div className="step-num">1</div>
              <div className="step-content">
                <h4>Choose Asset & Predict</h4>
                <p>Select a cryptocurrency and predict if the price will go UP or DOWN within the round timeframe.</p>
              </div>
            </div>
            <div className="disclaimer-step">
              <div className="step-num">2</div>
              <div className="step-content">
                <h4>Compete Against AI</h4>
                <p>Your prediction is matched against AI agents. Each bot uses different strategies: momentum, mean-reversion, or neural networks.</p>
              </div>
            </div>
            <div className="disclaimer-step">
              <div className="step-num">3</div>
              <div className="step-content">
                <h4>Win & Climb Leaderboard</h4>
                <p>Beat the AI to earn CLASH tokens and climb the competition leaderboard. Top performers win prizes!</p>
              </div>
            </div>
          </div>
        </div>

        {/* Battle Columns */}
        <div className="battle-cols">
          {/* Human Side */}
          <div className="col-human">
            <div className="col-hdr">
              <div className="col-hdr-l">
                <div className="col-icon blue"><i className="fa-solid fa-users" /></div>
                <div>
                  <h2>Human Team</h2>
                  <p className="blue">Compete against AI</p>
                </div>
              </div>
              <div className="wr-badge">
                <span>Your Performance</span>
                <b>{userWinRate}% WR</b>
              </div>
            </div>

            {isConnected ? (
              <>
                <label className="field-lbl">Asset</label>
                <div className="asset-row">
                  {ASSETS.map(a => (
                    <button
                      key={a}
                      className={`asset-btn${asset === a ? ' a' : ''}`}
                      onClick={() => setAsset(a)}
                    >
                      <img src={CRYPTO_LOGOS[a]} alt={a} />
                      {a}
                      <span className={`chg ${prices[a].change >= 0 ? 'up' : 'dn'}`}>
                        {prices[a].change >= 0 ? '+' : ''}{prices[a].change.toFixed(1)}%
                      </span>
                    </button>
                  ))}
                </div>

                <div className="price-live">
                  <div className="via"><i className="fa-solid fa-wifi" /> Live · Bybit</div>
                  <div>
                    <div className="val">
                      ${currentPrice.price.toLocaleString(undefined, { 
                        minimumFractionDigits: asset === 'MNT' ? 4 : 2, 
                        maximumFractionDigits: asset === 'MNT' ? 4 : 2 
                      })}
                    </div>
                    <div className={`chg ${currentPrice.change >= 0 ? 'up' : 'dn'}`}>
                      24h: {currentPrice.change >= 0 ? '+' : ''}{currentPrice.change.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <label className="field-lbl">Stake Amount</label>
                <div className="stake-row">
                  {STAKE_OPTIONS.map(s => (
                    <button
                      key={s}
                      className={`stake-btn${stake === s ? ' a' : ''}`}
                      onClick={() => setStake(s)}
                    >
                      ${s}
                    </button>
                  ))}
                </div>

                <label className="field-lbl">Will {asset} go UP or DOWN?</label>
                <div className="dir-row">
                  <div
                    className={`dir-card up${direction === 'UP' ? ' sel' : ''}`}
                    onClick={() => setDirection('UP')}
                  >
                    <i className="fa-solid fa-arrow-trend-up" />
                    <div className="lbl">UP</div>
                    <div className="sub">Price goes up</div>
                  </div>
                  <div
                    className={`dir-card dn${direction === 'DOWN' ? ' sel' : ''}`}
                    onClick={() => setDirection('DOWN')}
                  >
                    <i className="fa-solid fa-arrow-trend-down" />
                    <div className="lbl">DOWN</div>
                    <div className="sub">Price goes down</div>
                  </div>
                </div>

                <motion.button
                  className="btn-submit"
                  onClick={handleSubmit}
                  disabled={submitting}
                  whileTap={{ scale: 0.98 }}
                >
                  {submitting ? (
                    <><i className="fa-solid fa-spinner fa-spin" /> Processing...</>
                  ) : submitted ? (
                    <><i className="fa-solid fa-check" /> Submitted!</>
                  ) : (
                    <><i className="fa-solid fa-bolt" /> Submit Prediction — ${stake}</>
                  )}
                </motion.button>

                <div className="pstats">
                  <div className="pstat">
                    <div className="v">{(stats?.wins ?? 0) + (stats?.losses ?? 0)}</div>
                    <div className="k">Decisions</div>
                  </div>
                  <div className="pstat">
                    <div className={`v ${parseFloat(userWinRate) >= 50 ? 'grn' : 'red'}`}>{userWinRate}%</div>
                    <div className="k">Win Rate</div>
                  </div>
                  <div className="pstat">
                    <div className={`v ${((stats?.totalWon ?? 0) - (stats?.totalStaked ?? 0)) >= 0 ? 'grn' : 'red'}`}>
                      {((stats?.totalWon ?? 0) - (stats?.totalStaked ?? 0)) >= 0 ? '+' : ''}{Math.floor((stats?.totalWon ?? 0) - (stats?.totalStaked ?? 0))}
                    </div>
                    <div className="k">PnL CLASH</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="connect-box">
                <i className="fa-solid fa-wallet" />
                <p style={{ marginBottom: 16 }}>Connect wallet to join the battle</p>
                <ConnectButton />
              </div>
            )}
          </div>

          {/* AI Side */}
          <div className="col-ai">
            <div className="col-hdr">
              <div className="col-hdr-l">
                <div className="col-icon green"><i className="fa-solid fa-robot" /></div>
                <div>
                  <h2>AI Team</h2>
                  <p className="green">Algorithmic competition</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--hud-green)' }}>
                <span className="live-dot" style={{ width: 5, height: 5 }} /> Live
              </div>
            </div>

            {agents.map(agent => (
              <div key={agent.tokenId} className="agent-card">
                <div className="agent-hdr">
                  <div className="agent-id">
                    <div className="agent-av" style={{ background: agent.gradient }}>{agent.avatar}</div>
                    <div>
                      <div className="agent-name">{agent.name}</div>
                      <div className="agent-ver">{agent.version} · {agent.strategy}</div>
                    </div>
                  </div>
                  <div className="agent-wr">
                    <div className="v" style={{ color: agent.winRate >= 50 ? 'var(--hud-green)' : 'var(--hud-gold)' }}>
                      {agent.winRate.toFixed(1)}%
                    </div>
                    <div className="k">{agent.decisions} decisions</div>
                  </div>
                </div>
                <div className="agent-sig">
                  <span className={`sig-tag ${agent.direction === 'UP' ? 'up' : 'dn'}`}>
                    <i className={`fa-solid fa-arrow-trend-${agent.direction === 'UP' ? 'up' : 'down'}`} /> {agent.direction}
                  </span>
                  <span className="sig-tag conf">
                    <i className="fa-solid fa-bolt" /> {Math.round(agent.confidence)}%
                  </span>
                  <span className="sig-time">{agent.lastUpdate}s ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="lb-section" id="lbSection">
          <div className="lb-sec-hdr">
            <h3><i className="fa-solid fa-trophy" /> Competition Leaderboard</h3>
            <span className="tag live">
              <span className="live-dot" style={{ width: 5, height: 5, background: 'var(--hud-red)' }} /> Live
            </span>
          </div>
          <div className="lb-sec-body">
            <div className="lb-group">
              <h4 className="ai"><i className="fa-solid fa-robot" /> Top AI Agents</h4>
              {aiLeaderboard.map((entry, i) => (
                <div key={entry.name} className="lb-item">
                  <div className="lb-item-l">
                    <div className={`lb-rank-num ${i === 0 ? 'gold' : i === 1 ? 'silver' : 'bronze'}`}>{entry.rank}</div>
                    <div>
                      <div className="lb-item-name">{entry.name}</div>
                      <div className="lb-item-sub">AI Agent</div>
                    </div>
                  </div>
                  <div className="lb-item-r">
                    <div className="wr">{entry.winRate.toFixed(1)}%</div>
                    <div className="pnl">{entry.pnl >= 0 ? '+' : ''}{entry.pnl.toLocaleString()} CLASH</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="lb-group">
              <h4 className="human"><i className="fa-solid fa-users" /> Top Humans</h4>
              {humanLeaderboard.map((entry) => (
                <div key={entry.name} className="lb-item">
                  <div className="lb-item-l">
                    <div className="lb-rank-num blue">{entry.rank}</div>
                    <div>
                      <div className="lb-item-name">{entry.name}</div>
                      <div className="lb-item-sub">Human Player</div>
                    </div>
                  </div>
                  <div className="lb-item-r">
                    <div className="wr" style={{ color: '#60a5fa' }}>{entry.winRate.toFixed(1)}%</div>
                    <div className="pnl">{entry.pnl >= 0 ? '+' : ''}{entry.pnl.toLocaleString()} CLASH</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="hud-footer">
        <div className="hud-footer-inner">
          MindClash · Mantle Turing Test Hackathon 2026
        </div>
      </footer>

      {/* Help FAB */}
      <HowItWorks />

      {/* Coming Soon overlay */}
      <AnimatePresence>
        {showComingSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={() => setShowComingSoon(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 10, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-sm mx-4 rounded-2xl border border-purple-500/30 p-8 text-center"
              style={{
                background: 'linear-gradient(180deg, rgba(139,92,246,0.15) 0%, rgba(10,10,15,0.98) 50%)',
                boxShadow: '0 0 80px rgba(139,92,246,0.2), 0 25px 50px rgba(0,0,0,0.6)',
              }}
            >
              <div className="mb-4">
                <i className="fa-solid fa-khanda text-5xl text-purple-400 opacity-80" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Battle Mode
              </h2>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold mb-4"
                style={{ background: 'rgba(250,204,21,0.15)', color: '#fbbf24', border: '1px solid rgba(250,204,21,0.3)' }}
              >
                <i className="fa-solid fa-clock text-xs" />
                Coming Soon
              </div>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Real-time Human vs AI prediction battles with live staking, round timers, and on-chain resolution.
                Currently in development.
              </p>
              <div className="flex gap-3 justify-center">
                <Link
                  href="/app"
                  className="px-5 py-2.5 rounded-lg text-sm font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}
                >
                  <i className="fa-solid fa-border-all mr-2" />
                  Play Arena
                </Link>
                <button
                  onClick={() => setShowComingSoon(false)}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-300 border border-gray-600 hover:border-gray-400 transition-colors"
                >
                  Preview UI
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
